const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        // Groups / Spaces Table
        db.run(`CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )`, () => {
            // Seed default General and Media-Lounge groups if empty
            db.get("SELECT COUNT(*) as count FROM groups", [], (gErr, row) => {
                if (!gErr && row && row.count === 0) {
                    db.run("INSERT INTO groups (name, description) VALUES ('General', 'Default space for everyone')");
                    db.run("INSERT INTO groups (name, description) VALUES ('Media-Lounge', 'Share music, videos, and photos')");
                }
            });
        });

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            group_id INTEGER DEFAULT 1,
            text TEXT,
            type TEXT DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size TEXT,
            file_type TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (group_id) REFERENCES groups (id)
        )`, () => {
            // Attempt migrations for existing databases that might not have new columns
            const newColumns = [
                "ALTER TABLE messages ADD COLUMN group_id INTEGER DEFAULT 1",
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
