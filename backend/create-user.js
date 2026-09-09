const bcrypt = require('bcrypt');
const db = require('./db');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.log('Usage: node create-user.js <username> <password>');
  console.log('Example: node create-user.js Alex secret123');
  process.exit(1);
}

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (name, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          console.error(`Error: User "${username}" already exists.`);
        } else {
          console.error('Database error:', err.message);
        }
        process.exit(1);
      }
      console.log(`Successfully created user "${username}" (ID: ${this.lastID}) directly in the database!`);
      process.exit(0);
    });
  } catch (err) {
    console.error('Error creating user:', err.message);
    process.exit(1);
  }
}

createUser();
