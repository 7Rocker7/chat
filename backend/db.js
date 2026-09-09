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
            db.get("SELECT COUNT(*) as count FROM groups", [], (gErr, row) => {
                if (!gErr && row && row.count === 0) {
                    db.run("INSERT INTO groups (name, description) VALUES ('General', 'Default space for everyone')");
                    db.run("INSERT INTO groups (name, description) VALUES ('Media-Lounge', 'Share music, videos, and photos')");
                }
            });
        });

        // Group Messages Table
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
            reply_to_id INTEGER,
            reply_to_sender TEXT,
            reply_to_text TEXT,
            is_deleted_everyone INTEGER DEFAULT 0,
            deleted_by_users TEXT DEFAULT '[]',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (group_id) REFERENCES groups (id)
        )`, () => {
            const newColumns = [
                "ALTER TABLE messages ADD COLUMN group_id INTEGER DEFAULT 1",
                "ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'",
                "ALTER TABLE messages ADD COLUMN file_url TEXT",
                "ALTER TABLE messages ADD COLUMN file_name TEXT",
                "ALTER TABLE messages ADD COLUMN file_size TEXT",
                "ALTER TABLE messages ADD COLUMN file_type TEXT",
                "ALTER TABLE messages ADD COLUMN reply_to_id INTEGER",
                "ALTER TABLE messages ADD COLUMN reply_to_sender TEXT",
                "ALTER TABLE messages ADD COLUMN reply_to_text TEXT",
                "ALTER TABLE messages ADD COLUMN is_deleted_everyone INTEGER DEFAULT 0",
                "ALTER TABLE messages ADD COLUMN deleted_by_users TEXT DEFAULT '[]'"
            ];
            newColumns.forEach(query => {
                db.run(query, () => {});
            });
        });

        // Direct Messages Table (Private 1-on-1 Chat)
        db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            text TEXT,
            type TEXT DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size TEXT,
            file_type TEXT,
            reply_to_id INTEGER,
            reply_to_sender TEXT,
            reply_to_text TEXT,
            is_deleted_everyone INTEGER DEFAULT 0,
            deleted_by_users TEXT DEFAULT '[]',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users (id),
            FOREIGN KEY (receiver_id) REFERENCES users (id)
        )`, () => {
            const dmColumns = [
                "ALTER TABLE direct_messages ADD COLUMN reply_to_id INTEGER",
                "ALTER TABLE direct_messages ADD COLUMN reply_to_sender TEXT",
                "ALTER TABLE direct_messages ADD COLUMN reply_to_text TEXT",
                "ALTER TABLE direct_messages ADD COLUMN is_deleted_everyone INTEGER DEFAULT 0",
                "ALTER TABLE direct_messages ADD COLUMN deleted_by_users TEXT DEFAULT '[]'"
            ];
            dmColumns.forEach(query => {
                db.run(query, () => {});
            });
        });
    }
});

module.exports = db;
