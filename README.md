<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudinary-API-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

# ☁️ CloudinaryWatch

A full-stack SaaS dashboard for managing, optimizing, and monitoring your Cloudinary assets — with real-time upload tracking, usage analytics, image optimization, and a complete admin system.

> Built with React + Vite, Node.js + Express, MongoDB, and the Cloudinary SDK.

---

## ✨ Features

### 🖼️ Asset Management
- **Drag & drop uploads** with real-time per-file progress tracking
- **Image optimization** via Sharp (resize, compress, format conversion before upload)
- **Gallery view** with grid/list toggle, search, and lightbox preview
- **Upload history** with full metadata (size, dimensions, format, status)
- **Folder management** — organize assets into Cloudinary folders

### 📊 Dashboard & Analytics
- Real-time **Cloudinary usage stats** (storage, bandwidth, transformations, credits)
- **Image impressions graph** pulled from Cloudinary API
- Usage bars with **free plan limits** (25 GB storage, 25 GB bandwidth, 25K transforms)

### 🔐 Authentication
- **Google OAuth 2.0** (one-click login)
- **Email/Password** with **OTP email verification** (signup + login)
- Branded HTML email templates via Nodemailer + Gmail SMTP
- OTP hashing (bcrypt), rate limiting (30s cooldown), max 5 attempts
- JWT-based sessions with auto-expiry

### 🛡️ Admin System
- **Hidden admin portal** — accessible only via secret URL
- **First-time setup** — one admin registration, permanently locked after
- **Separate JWT auth** — isolated from user authentication
- **Dashboard** — total users, uploads, storage, login records, charts
- **User management** — search, view details, delete users + all their data
- **Engagement analytics** — DAU/WAU/MAU, retention rate, top active users
- **Login history** — IP, user agent, method, timestamps

### ⚙️ Settings
- Profile editing (name)
- Password change
- Account deletion (with confirmation)

### 🎨 UI/UX
- Dark mode glassmorphism design
- Custom **glitch cloud loading animation** with RGB split, orbiting particles, and progress bar
- Smooth page transitions (Framer Motion)
- Toast notifications (react-hot-toast)
- Fully responsive (mobile + desktop)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons |
| **Backend** | Node.js, Express, Mongoose, Passport.js |
| **Database** | MongoDB Atlas |
| **Auth** | JWT, Google OAuth 2.0, bcrypt, OTP via Nodemailer |
| **Storage** | Cloudinary SDK |
| **Image Processing** | Sharp |
| **Security** | Helmet, express-rate-limit, AES-256 encryption |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/cloud/atlas))
- Cloudinary account ([free tier](https://cloudinary.com/))
- Google OAuth credentials ([console](https://console.cloud.google.com/))
- Gmail App Password ([setup guide](https://support.google.com/accounts/answer/185833))

### 1. Clone the repo
```bash
git clone https://github.com/krisshhjain/CloudinaryWatch.git
cd CloudinaryWatch
```

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

### 3. Frontend setup
```bash
cd client
npm install
npm run dev
```

### 4. Open in browser
```
http://localhost:5173
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_64_hex_char_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:5173
```

### Client (`client/.env`)
```env
VITE_API_URL=          # Leave empty for dev (Vite proxy handles it)
```

---

## 📁 Project Structure
```
CloudinaryWatch/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Route pages
│   │   │   └── admin/       # Admin panel pages
│   │   └── index.css        # Tailwind + custom styles
│   └── vite.config.js
│
├── server/                  # Express backend
│   ├── config/              # DB + Passport config
│   ├── middleware/          # Auth + Admin middleware
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API routes
│   ├── utils/               # Encryption + Mailer
│   └── index.js             # Server entry point
│
└── .gitignore
```

---

## 🌐 Deployment

### Frontend → Vercel
| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Root Directory | `client` |
| Env Variable | `VITE_API_URL` = your backend URL |

### Backend → Render
| Setting | Value |
|---------|-------|
| Start Command | `node index.js` |
| Root Directory | `server` |
| Env Variables | All from `server/.env.example` |

> Don't forget to update `GOOGLE_CALLBACK_URL` and `CLIENT_URL` with your deployed URLs.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a PR.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/krisshhjain">Krish Jain</a>
</p>
