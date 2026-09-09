const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Setup static folder for uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '';
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB per file, any format
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const JWT_SECRET = 'super-secret-key-for-friends-chat';

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
    let { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Name and password required' });

    name = name.trim();

    // Validation: Only uppercase and lowercase letters allowed
    const nameRegex = /^[A-Za-z]+$/;
    if (!nameRegex.test(name)) {
        return res.status(400).json({ error: 'Name can only contain letters (A-Z, a-z). No numbers or special characters allowed.' });
    }

    if (name.length < 2 || name.length > 25) {
        return res.status(400).json({ error: 'Name must be between 2 and 25 characters.' });
    }

    // Case-insensitive check: no duplicate names regardless of upper/lower case
    db.get('SELECT id FROM users WHERE LOWER(name) = LOWER(?)', [name], async (err, existing) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (existing) {
            return res.status(400).json({ error: `An account named "${name}" already exists (names are case-insensitive).` });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run('INSERT INTO users (name, password) VALUES (?, ?)', [name, hashedPassword], function(insertErr) {
                if (insertErr) {
                    return res.status(500).json({ error: 'Database error creating user' });
                }
                
                const token = jwt.sign({ id: this.lastID, name }, JWT_SECRET);
                res.json({ token, user: { id: this.lastID, name } });
            });
        } catch (hashErr) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

app.post('/api/login', (req, res) => {
    let { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Name and password required' });

    name = name.trim();

    // Case-insensitive lookup
    db.get('SELECT * FROM users WHERE LOWER(name) = LOWER(?)', [name], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET);
        res.json({ token, user: { id: user.id, name: user.name } });
    });
});

// Change Password Route
app.post('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both current and new password are required' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: 'Failed to update password' });
            res.json({ message: 'Password changed successfully' });
        });
    });
});

// Delete Account Route
app.post('/api/delete-account', authenticateToken, (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password confirmation is required' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ error: 'Password is incorrect' });
        }

        db.run('DELETE FROM messages WHERE user_id = ?', [req.user.id], (msgErr) => {
            if (msgErr) console.error('Error clearing messages:', msgErr);
            db.run('DELETE FROM users WHERE id = ?', [req.user.id], (userErr) => {
                if (userErr) return res.status(500).json({ error: 'Failed to delete account' });
                res.json({ message: 'Account deleted successfully' });
            });
        });
    });
});

// Upload Endpoint for Any Media/File
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype
    });
});

// Groups / Spaces Routes
app.get('/api/groups', (req, res) => {
    db.all(`
        SELECT g.*, COUNT(m.id) as message_count
        FROM groups g
        LEFT JOIN messages m ON m.group_id = g.id
        GROUP BY g.id
        ORDER BY g.id ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/groups', authenticateToken, (req, res) => {
    let { name, description = '' } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    name = name.trim().replace(/\s+/g, '-');
    if (name.length < 2 || name.length > 30) {
        return res.status(400).json({ error: 'Group name must be between 2 and 30 characters' });
    }

    db.get('SELECT id FROM groups WHERE LOWER(name) = LOWER(?)', [name], (err, existing) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (existing) {
            return res.status(400).json({ error: `A group named "${name}" already exists` });
        }

        db.run('INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)', [name, description, req.user.id], function(insErr) {
            if (insErr) return res.status(500).json({ error: 'Failed to create group' });

            const newGroup = {
                id: this.lastID,
                name,
                description,
                created_by: req.user.id,
                message_count: 0
            };

            io.emit('group_created', newGroup);
            res.json(newGroup);
        });
    });
});

// Retrieve Messages (filtered by group)
app.get('/api/messages', (req, res) => {
    const groupId = req.query.groupId || 1;
    db.all(`
        SELECT m.id, m.group_id, m.text, m.type, m.file_url, m.file_name, m.file_size, m.file_type,
               m.reply_to_id, m.reply_to_sender, m.reply_to_text, m.is_deleted_everyone, m.deleted_by_users,
               m.timestamp, u.name as user_name, u.id as user_id
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.group_id = ?
        ORDER BY m.timestamp ASC
        LIMIT 500
    `, [groupId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Users List Endpoint (for Direct Messages)
app.get('/api/users', authenticateToken, (req, res) => {
    db.all('SELECT id, name FROM users WHERE id != ? ORDER BY name ASC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Private 1-on-1 Direct Messages Route
app.get('/api/dms', authenticateToken, (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    db.all(`
        SELECT dm.id, dm.sender_id, dm.receiver_id, dm.text, dm.type, dm.file_url, dm.file_name, dm.file_size, dm.file_type,
               dm.reply_to_id, dm.reply_to_sender, dm.reply_to_text, dm.is_deleted_everyone, dm.deleted_by_users,
               dm.timestamp, u.name as user_name, u.id as user_id
        FROM direct_messages dm
        JOIN users u ON dm.sender_id = u.id
        WHERE (dm.sender_id = ? AND dm.receiver_id = ?)
           OR (dm.sender_id = ? AND dm.receiver_id = ?)
        ORDER BY dm.timestamp ASC
        LIMIT 500
    `, [req.user.id, userId, userId, req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Socket.IO
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Authentication error"));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error"));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name}`);

    // Join personal user room for private DMs
    socket.join(`user_${socket.user.id}`);

    // Group Message Handler
    socket.on('send_message', (data) => {
        const {
            group_id = 1,
            text = '',
            type = 'text',
            file_url = null,
            file_name = null,
            file_size = null,
            file_type = null,
            reply_to_id = null,
            reply_to_sender = null,
            reply_to_text = null
        } = data;

        db.run(`
            INSERT INTO messages (user_id, group_id, text, type, file_url, file_name, file_size, file_type, reply_to_id, reply_to_sender, reply_to_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [socket.user.id, group_id, text, type, file_url, file_name, file_size, file_type, reply_to_id, reply_to_sender, reply_to_text], function(err) {
            if (err) {
                console.error('Error saving message', err);
                return;
            }
            
            const messageObj = {
                id: this.lastID,
                user_id: socket.user.id,
                user_name: socket.user.name,
                group_id: Number(group_id),
                text,
                type,
                file_url,
                file_name,
                file_size,
                file_type,
                reply_to_id,
                reply_to_sender,
                reply_to_text,
                is_deleted_everyone: 0,
                deleted_by_users: '[]',
                timestamp: new Date().toISOString()
            };
            
            io.emit('receive_message', messageObj);
        });
    });

    // Private 1-on-1 Direct Message Handler
    socket.on('send_dm', (data) => {
        const {
            receiver_id,
            text = '',
            type = 'text',
            file_url = null,
            file_name = null,
            file_size = null,
            file_type = null,
            reply_to_id = null,
            reply_to_sender = null,
            reply_to_text = null
        } = data;

        if (!receiver_id) return;

        db.run(`
            INSERT INTO direct_messages (sender_id, receiver_id, text, type, file_url, file_name, file_size, file_type, reply_to_id, reply_to_sender, reply_to_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [socket.user.id, receiver_id, text, type, file_url, file_name, file_size, file_type, reply_to_id, reply_to_sender, reply_to_text], function(err) {
            if (err) {
                console.error('Error saving direct message', err);
                return;
            }

            const dmObj = {
                id: this.lastID,
                sender_id: socket.user.id,
                receiver_id: Number(receiver_id),
                user_id: socket.user.id,
                user_name: socket.user.name,
                text,
                type,
                file_url,
                file_name,
                file_size,
                file_type,
                reply_to_id,
                reply_to_sender,
                reply_to_text,
                is_deleted_everyone: 0,
                deleted_by_users: '[]',
                timestamp: new Date().toISOString()
            };

            // Send to both sender and receiver sockets
            io.to(`user_${socket.user.id}`).to(`user_${receiver_id}`).emit('receive_dm', dmObj);
        });
    });

    // Forward Message Handler
    socket.on('forward_message', (data) => {
        const { message, target_type, target_id } = data;
        if (!message || !target_type || !target_id) return;

        const forwardText = message.text || (message.file_name ? `Forwarded file: ${message.file_name}` : 'Forwarded message');

        if (target_type === 'group') {
            db.run(`
                INSERT INTO messages (user_id, group_id, text, type, file_url, file_name, file_size, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [socket.user.id, target_id, forwardText, message.type, message.file_url, message.file_name, message.file_size, message.file_type], function(err) {
                if (err) return;
                const fwdObj = {
                    id: this.lastID,
                    user_id: socket.user.id,
                    user_name: socket.user.name,
                    group_id: Number(target_id),
                    text: forwardText,
                    type: message.type,
                    file_url: message.file_url,
                    file_name: message.file_name,
                    file_size: message.file_size,
                    file_type: message.file_type,
                    is_deleted_everyone: 0,
                    deleted_by_users: '[]',
                    timestamp: new Date().toISOString()
                };
                io.emit('receive_message', fwdObj);
            });
        } else if (target_type === 'dm') {
            db.run(`
                INSERT INTO direct_messages (sender_id, receiver_id, text, type, file_url, file_name, file_size, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [socket.user.id, target_id, forwardText, message.type, message.file_url, message.file_name, message.file_size, message.file_type], function(err) {
                if (err) return;
                const fwdDmObj = {
                    id: this.lastID,
                    sender_id: socket.user.id,
                    receiver_id: Number(target_id),
                    user_id: socket.user.id,
                    user_name: socket.user.name,
                    text: forwardText,
                    type: message.type,
                    file_url: message.file_url,
                    file_name: message.file_name,
                    file_size: message.file_size,
                    file_type: message.file_type,
                    is_deleted_everyone: 0,
                    deleted_by_users: '[]',
                    timestamp: new Date().toISOString()
                };
                io.to(`user_${socket.user.id}`).to(`user_${target_id}`).emit('receive_dm', fwdDmObj);
            });
        }
    });

    // Delete Message Handler (Delete for Everyone vs Delete for Me)
    socket.on('delete_message', (data) => {
        const { message_id, is_dm, delete_type, group_id, receiver_id } = data;
        if (!message_id || !delete_type) return;

        const table = is_dm ? 'direct_messages' : 'messages';

        if (delete_type === 'everyone') {
            // Check ownership
            const userCol = is_dm ? 'sender_id' : 'user_id';
            db.get(`SELECT ${userCol} as owner_id FROM ${table} WHERE id = ?`, [message_id], (err, row) => {
                if (err || !row || row.owner_id !== socket.user.id) {
                    return; // Only owner can delete for everyone
                }

                db.run(`UPDATE ${table} SET is_deleted_everyone = 1, text = 'This message was deleted' WHERE id = ?`, [message_id], (upErr) => {
                    if (upErr) return;
                    const eventData = { message_id, is_dm, group_id, receiver_id, sender_id: socket.user.id };
                    if (is_dm) {
                        io.to(`user_${socket.user.id}`).to(`user_${receiver_id}`).emit('message_deleted_everyone', eventData);
                    } else {
                        io.emit('message_deleted_everyone', eventData);
                    }
                });
            });
        } else if (delete_type === 'me') {
            db.get(`SELECT deleted_by_users FROM ${table} WHERE id = ?`, [message_id], (err, row) => {
                if (err || !row) return;

                let deletedUsers = [];
                try {
                    deletedUsers = JSON.parse(row.deleted_by_users || '[]');
                } catch (e) {
                    deletedUsers = [];
                }

                if (!deletedUsers.includes(socket.user.id)) {
                    deletedUsers.push(socket.user.id);
                }

                db.run(`UPDATE ${table} SET deleted_by_users = ? WHERE id = ?`, [JSON.stringify(deletedUsers), message_id], (upErr) => {
                    if (upErr) return;
                    socket.emit('message_deleted_me', { message_id, is_dm, group_id, receiver_id });
                });
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.name}`);
    });
});

// Serve frontend production build when deployed
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
            return res.sendFile(path.join(frontendDist, 'index.html'));
        }
        next();
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
