# 🎵 VIBETOGETHER — Multi-Device Synchronized Music Web App

**VIBETOGETHER** is a mobile-first, high-precision real-time synchronized audio streaming web application. It enables up to **8 smartphones or PCs** to play the exact same music in low-latency synchronization with 8D spatial audio effects, NTP clock alignment, and online song search.

---

## 🌟 Key Features

- **6-Digit Room Codes & 8-Device Limit**: Create real-time room & join with 6-digit code. Max 8 devices per room.
- **High-Precision NTP Clock Sync**: Micro-millisecond time alignment (`clockOffset`, RTT, drift evaluation).
- **Online Song Search Engine**: Type any song or artist name (e.g. *Blinding Lights*, *Shape of You*, *Despacito*) to stream online in sync.
- **Offline File Upload & Web Audio Stream**: Upload local MP3/WAV/M4A files or paste direct Web URLs.
- **8D Spatial Surround Setup**: Interactive 2D drag-and-drop room layout to assign physical speaker channels (`Front Left`, `Front Right`, `Sub Rear`, etc.).
- **Minimalist Luxury UI**: Dark obsidian aesthetic, gold accents, vinyl disc animation, and spectrum analyzer.

---

## 🚀 Quick Start (Local)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Production Server**:
   ```bash
   npm run build
   npm start
   ```

3. Open **`http://localhost:3001`** in your browser.

---

## ☁️ Free GitHub & Cloud Deployment Guide

### Step 1: Push to GitHub
Run the following commands in your terminal:

```bash
git init
git add .
git commit -m "Initial commit of VibeTogether app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vibetogether.git
git push -u origin main
```

---

### Step 2: Deploy Free 24/7 Cloud Hosting (Render.com)

1. Sign up for free at **[Render.com](https://render.com)**.
2. Click **New +** -> **Web Service**.
3. Select your **`vibetogether`** GitHub repository.
4. Configure these settings:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.
6. Render will automatically build your app and give you a free 24/7 public URL (e.g. `https://vibetogether.onrender.com`).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas API
- **Audio Engine**: Web Audio API (`AudioContext`, `StereoPannerNode`, `BiquadFilterNode`, `AnalyserNode`)
- **Backend Server**: Node.js, Express, Socket.IO, Multer
- **Clock Synchronization**: NTP-style ping-pong algorithms
