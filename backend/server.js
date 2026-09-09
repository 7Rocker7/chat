const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
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

    const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
    res.json({
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype
    });
});

// Retrieve Messages (including rich media)
app.get('/api/messages', (req, res) => {
    db.all(`
        SELECT m.id, m.text, m.type, m.file_url, m.file_name, m.file_size, m.file_type, m.timestamp, u.name as user_name, u.id as user_id
        FROM messages m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.timestamp ASC
        LIMIT 500
    `, [], (err, rows) => {
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

    socket.on('send_message', (data) => {
        const {
            text = '',
            type = 'text',
            file_url = null,
            file_name = null,
            file_size = null,
            file_type = null
        } = data;

        db.run(`
            INSERT INTO messages (user_id, text, type, file_url, file_name, file_size, file_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [socket.user.id, text, type, file_url, file_name, file_size, file_type], function(err) {
            if (err) {
                console.error('Error saving message', err);
                return;
            }
            
            const messageObj = {
                id: this.lastID,
                text,
                type,
                file_url,
                file_name,
                file_size,
                file_type,
                user_id: socket.user.id,
                user_name: socket.user.name,
                timestamp: new Date().toISOString()
            };
            
            io.emit('receive_message', messageObj);
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.name}`);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
