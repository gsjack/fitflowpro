const Database = require('better-sqlite3');
const db = new Database('./data/fitflow.db');

const users = db.prepare(`
  SELECT id, username, created_at
  FROM users
  WHERE username LIKE '%gmail%'
     OR username LIKE '%googlemail%'
     OR username LIKE '%asigator%'
     OR username LIKE '%ccllccll%'
  ORDER BY created_at DESC
  LIMIT 20
`).all();

console.log('Gmail/Googlemail users:');
users.forEach(u => {
  console.log(`  ID ${u.id}: ${u.username}`);
});

if (users.length === 0) {
  console.log('  No gmail users found');
  console.log('\nMost recent users:');
  const recent = db.prepare('SELECT id, username FROM users ORDER BY id DESC LIMIT 5').all();
  recent.forEach(u => {
    console.log(`  ID ${u.id}: ${u.username}`);
  });
}
