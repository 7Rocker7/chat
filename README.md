# 🌌 OmniSphere — The Universal Media & Real-Time Chat Sphere

OmniSphere is a modern, real-time messaging and multimedia communication platform modeled with a cosmic dark-mode aesthetic. It supports seamless text messaging, file attachments of any format, animated GIFs, music playback, live voice notes, and live webcam video recording.

---

## ✨ Features

- 💬 **Real-Time Messaging**: Instant bidirectional communication powered by Socket.IO.
- 📎 **Universal File Sharing**: Upload and download documents, ZIPs, spreadsheets, and files of any type and size.
- 🎵 **Music & Audio Streaming**: Inline audio player for uploaded tracks (MP3, WAV, FLAC, OGG).
- 🎙️ **Live Voice Memos**: In-browser audio recording with real-time waveform animation and elapsed timer.
- 📹 **Live Video Clips**: Webcam video recording studio with preview and inline HTML5 video player.
- ✨ **Interactive GIF Hub**: Searchable GIF library with trending categories and reactions.
- 🔐 **Account Management**: Quick registration, login, password changes, and account deletion.
- 🛠️ **Admin Tools**: Command-line utilities to list users, seed accounts, and reset forgotten passwords.
- 🎨 **Cosmic Aesthetic**: Sleek dark theme with neon glassmorphism, responsive layout, and smooth animations.

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm`

### 2. Installation

Clone this repository and install dependencies for both the backend and frontend:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/omnisphere.git
cd omnisphere

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Running the App

Run both servers in separate terminal tabs:

**Terminal 1 — Backend API & Socket Server:**
```bash
cd backend
node server.js
# Backend runs on http://localhost:3001
```

**Terminal 2 — Frontend Development Server:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

Now open [http://localhost:5173](http://localhost:5173) in your browser!

---

## 🛠️ Admin CLI Tools

OmniSphere includes administrative scripts inside the `backend/` directory:

- **List All Users:**
  ```bash
  cd backend
  node list-users.js
  ```

- **Directly Create a User:**
  ```bash
  cd backend
  node create-user.js <username> <password>
  ```

- **Reset a Forgotten Password:**
  ```bash
  cd backend
  node reset-password.js <username> <new_password>
  ```

---

## 🛡️ Security Note
All user passwords are encrypted using one-way cryptographic hashing (`bcrypt`) with 10 salt rounds. Passwords are never stored in plain text.

---

## 📜 License
MIT License
