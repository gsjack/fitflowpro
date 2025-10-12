import Database from 'better-sqlite3';

const db = new Database('./data/fitflow.db');

console.log('Users in database:');
const users = db.prepare('SELECT id, username FROM users WHERE username LIKE ?').all('%asigator%');
console.log(users);

db.close();
