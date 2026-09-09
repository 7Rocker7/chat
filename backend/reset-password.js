const bcrypt = require('bcrypt');
const db = require('./db');

const [,, username, newPassword] = process.argv;

if (!username || !newPassword) {
  console.log('\n--- OmniSphere Admin Password Reset Tool ---');
  console.log('Usage: node reset-password.js <username> <new_password>');
  console.log('Example: node reset-password.js Alex newpass123\n');
  process.exit(1);
}

async function resetPassword() {
  try {
    // Check if user exists
    db.get('SELECT id, name FROM users WHERE name = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error:', err.message);
        process.exit(1);
      }
      if (!user) {
        console.error(`Error: User "${username}" was not found in the database.`);
        process.exit(1);
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update in database
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (updateErr) => {
        if (updateErr) {
          console.error('Failed to reset password:', updateErr.message);
          process.exit(1);
        }
        console.log(`\nPassword successfully reset for "${user.name}" (User ID: ${user.id})!`);
        console.log(`They can now log in using their new password: ${newPassword}\n`);
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}

resetPassword();
