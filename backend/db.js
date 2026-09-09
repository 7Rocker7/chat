const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            text TEXT,
            type TEXT DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size TEXT,
            file_type TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, () => {
            // Attempt migrations for existing databases that might not have new columns
            const newColumns = [
                "ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'",
                "ALTER TABLE messages ADD COLUMN file_url TEXT",
                "ALTER TABLE messages ADD COLUMN file_name TEXT",
                "ALTER TABLE messages ADD COLUMN file_size TEXT",
                "ALTER TABLE messages ADD COLUMN file_type TEXT"
            ];
            newColumns.forEach(query => {
                db.run(query, (colErr) => {
                    // Ignore error if column already exists
                });
            });
        });
    }
});

module.exports = db;
