// Test the ContentRepository directly
import { ContentRepository } from './src/infrastructure/repos/ContentRepository';

async function testContentRepo() {
  console.log('Testing ContentRepository...');

  try {
    const repo = new ContentRepository();

    // Set environment to use SQLite
    process.env.DB_BACKEND = 'sqlite';
    process.env.NODE_ENV = 'development';

    console.log('Getting all content...');
    const allContent = await repo.getAllContent();
    console.log(`✅ Found ${allContent.length} content snippets`);

    console.log('Getting filtered content...');
    const filteredContent = await repo.getContent({ tags: ['envy'] });
    console.log(`✅ Found ${filteredContent.length} content snippets with envy tag`);

    console.log('Getting content by type...');
    const ayahContent = await repo.getContent({ type: 'ayah' });
    console.log(`✅ Found ${ayahContent.length} ayah content snippets`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testContentRepo();