import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./data/fitflow.db');

const username = 'asigator@gmail.com';
const newPassword = 'ccllccll1';

// Hash the new password
const passwordHash = bcrypt.hashSync(newPassword, 12);

// Update the user's password
const result = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(passwordHash, username);

if (result.changes > 0) {
  console.log(`✓ Password reset successfully for ${username}`);
  console.log(`  New password: ${newPassword}`);
} else {
  console.log(`✗ User ${username} not found`);
}

db.close();
