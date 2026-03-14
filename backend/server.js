const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });

const { initDB } = require('./config/db');

console.log("[Backend] Environment variables loaded.");
console.log("[Backend] GEMINI_API_KEY present:",
  process.env.GEMINI_API_KEY
    ? "Yes (Ends with " + process.env.GEMINI_API_KEY.slice(-4) + ")"
    : "No"
);

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- Ensure uploads folder -------------------- */
const uploadPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadPath));

/* -------------------- Database Init (Non-Blocking) -------------------- */
(async () => {
  try {
    await initDB();
    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    console.log("Server will continue without database connection.");
  }
})();

/* -------------------- File Upload Config -------------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* -------------------- Routes -------------------- */
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', adminRoutes);

/* AI route */
app.use('/api', aiRoutes(upload));

/* -------------------- Server -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});