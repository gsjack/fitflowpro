import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./data/fitflow.db');

const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get('asigator@gmail.com');

if (!user) {
  console.log('User not found!');
  process.exit(1);
}

console.log('User:', user.username, '(ID:', user.id + ')');
console.log('Stored password hash:', user.password_hash);

// Test passwords
const testPasswords = ['ccllccll1', 'Test123!', 'test123', 'password'];

console.log('\nTesting passwords:');
for (const pwd of testPasswords) {
  const match = bcrypt.compareSync(pwd, user.password_hash);
  console.log(`  "${pwd}": ${match ? '✓ MATCH' : '✗ no match'}`);
}

db.close();
