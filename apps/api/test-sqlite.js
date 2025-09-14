// Simple test to debug SQLite issue
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/sakinah.sqlite');
const db = new Database(dbPath);

console.log('Testing SQLite queries...');

try {
  // Test basic query
  const count = db.prepare('SELECT COUNT(*) as count FROM content_snippets').get();
  console.log('Total content snippets:', count);

  // Test query that might be causing issue
  const rows = db.prepare('SELECT * FROM content_snippets WHERE type = ?').all('ayah');
  console.log(`Found ${rows.length} ayah entries`);

  // Test the tags parsing
  const firstRow = rows[0];
  if (firstRow) {
    console.log('First row type:', firstRow.type);
    console.log('First row tags (raw):', firstRow.tags);
    const tags = JSON.parse(firstRow.tags || '[]');
    console.log('First row tags (parsed):', tags);
  }

  db.close();
  console.log('✅ SQLite test completed successfully');
} catch (error) {
  console.error('❌ SQLite test failed:', error.message);
  db.close();
  process.exit(1);
}