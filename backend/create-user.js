const bcrypt = require('bcrypt');
const db = require('./db');

const [,, rawUsername, password] = process.argv;

if (!rawUsername || !password) {
  console.log('Usage: node create-user.js <username> <password>');
  console.log('Example: node create-user.js Alex secret123');
  process.exit(1);
}

const username = rawUsername.trim();

// Validation: Only uppercase and lowercase letters
const nameRegex = /^[A-Za-z]+$/;
if (!nameRegex.test(username)) {
  console.error('\nError: Username must contain ONLY letters (A-Z, a-z). No numbers, spaces, or special characters are permitted.\n');
  process.exit(1);
}

if (username.length < 2 || username.length > 25) {
  console.error('\nError: Username must be between 2 and 25 characters long.\n');
  process.exit(1);
}

async function createUser() {
  try {
    // Case-insensitive check
    db.get('SELECT id FROM users WHERE LOWER(name) = LOWER(?)', [username], async (checkErr, existing) => {
      if (checkErr) {
        console.error('Database error:', checkErr.message);
        process.exit(1);
      }
      if (existing) {
        console.error(`\nError: An account named "${username}" already exists (usernames are case-insensitive).\n`);
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (name, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
        if (err) {
          console.error('Database error:', err.message);
          process.exit(1);
        }
        console.log(`\nSuccessfully created user "${username}" (ID: ${this.lastID}) directly in the database!\n`);
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Error creating user:', err.message);
    process.exit(1);
  }
}

createUser();
