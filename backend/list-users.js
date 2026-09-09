const db = require('./db');

db.all('SELECT id, name FROM users', [], (err, rows) => {
  if (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
  console.log('\n--- Registered Users ---');
  if (rows.length === 0) {
    console.log('No users registered yet.');
  } else {
    rows.forEach(u => {
      console.log(`ID: ${u.id} | Username: ${u.name}`);
    });
  }
  console.log('------------------------\n');
  process.exit(0);
});
