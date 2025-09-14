// Simple test script to verify database abstraction works
import { DatabaseFactory, getDatabase, resetDatabase } from './factory';
import { logger } from '@/shared/logger';

async function testDatabaseAbstraction() {
  logger.info('Testing database abstraction...');

  try {
    // Test factory and connection info
    const connectionInfo = DatabaseFactory.getConnectionInfo();
    logger.info('Connection info:', connectionInfo);

    // Get database instance
    const db = getDatabase();

    // Test health check
    const health = await db.healthCheck();
    logger.info('Health check:', health);

    if (health.status !== 'ok') {
      throw new Error(`Health check failed: ${health.message}`);
    }

    // Test content operations
    logger.info('Testing content operations...');
    const contentResult = await db.getAllContentSnippets();
    if (contentResult.error) {
      throw new Error(`Content fetch failed: ${contentResult.error.message}`);
    }
    logger.info(`Found ${contentResult.data?.length || 0} content snippets`);

    // Test content by tags
    const taggedResult = await db.getContentSnippetsByTags(['envy']);
    if (taggedResult.error) {
      throw new Error(`Tagged content fetch failed: ${taggedResult.error.message}`);
    }
    logger.info(`Found ${taggedResult.data?.length || 0} content snippets with 'envy' tag`);

    // Test user operations
    logger.info('Testing user operations...');
    const testUserId = crypto.randomUUID();

    const userResult = await db.createUser({
      id: testUserId,
      handle: 'test-user',
    });

    if (userResult.error) {
      throw new Error(`User creation failed: ${userResult.error.message}`);
    }
    logger.info('Created test user:', userResult.data);

    // Test profile operations
    logger.info('Testing profile operations...');
    const profileResult = await db.createProfile({
      userId: testUserId,
      displayName: 'Test User',
      timezone: 'America/New_York',
    });

    if (profileResult.error) {
      throw new Error(`Profile creation failed: ${profileResult.error.message}`);
    }
    logger.info('Created test profile:', profileResult.data);

    // Test checkin operations
    logger.info('Testing checkin operations...');
    const checkinResult = await db.createCheckin({
      userId: testUserId,
      date: '2025-01-01',
      mood: 1,
      intention: 'Test intention',
      reflection: 'Test reflection',
    });

    if (checkinResult.error) {
      throw new Error(`Checkin creation failed: ${checkinResult.error.message}`);
    }
    logger.info('Created test checkin:', checkinResult.data);

    // Test plan operations
    logger.info('Testing plan operations...');
    const planResult = await db.createPlan({
      userId: testUserId,
      kind: 'takhliyah',
      target: 'Reduce envy',
      microHabits: [
        { title: 'Practice gratitude', schedule: 'daily', target: 3 }
      ],
      contentIds: contentResult.data?.slice(0, 2).map(c => c.id),
    });

    if (planResult.error) {
      throw new Error(`Plan creation failed: ${planResult.error.message}`);
    }
    logger.info('Created test plan:', planResult.data);

    // Clean up resources
    await db.close();

    logger.info('✅ All database tests passed!');
    return true;

  } catch (error) {
    logger.error('❌ Database test failed:', error);
    return false;
  } finally {
    // Reset singleton
    resetDatabase();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDatabaseAbstraction()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('Test execution error:', error);
      process.exit(1);
    });
}

export { testDatabaseAbstraction };