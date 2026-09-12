const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// File storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.use(cors());
app.use(express.json());

// 1. GET /api/reviews - Fetch all verified reviews
app.get('/api/reviews', (req, res) => {
    const query = `SELECT id, complex_name, university, rating, floorplan, rent, tag, comment, verified, created_at FROM reviews ORDER BY id DESC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 2. POST /api/reviews - Submit review with verification proof
app.post('/api/reviews', upload.single('lease_proof'), (req, res) => {
    const { complex_name, university, student_email, rating, floorplan, rent, tag, comment } = req.body;

    // Server-side validation
    if (!student_email || !student_email.toLowerCase().endsWith('.edu')) {
        return res.status(400).json({ error: 'A valid university email (.edu) is required.' });
    }

    if (!complex_name || !rating || !rent) {
        return res.status(400).json({ error: 'Missing required review fields.' });
    }

    const leasePath = req.file ? req.file.path : null;

    const sql = `
        INSERT INTO reviews (complex_name, university, student_email, rating, floorplan, rent, tag, comment, lease_proof_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [complex_name, university, student_email, parseFloat(rating), floorplan, parseInt(rent), tag, comment, leasePath];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Review created successfully.',
            reviewId: this.lastID
        });
    });
});

// 3. POST /api/claims - Property manager claim request
app.post('/api/claims', upload.single('proof'), (req, res) => {
    const { property_name, corporate_email, role } = req.body;

    if (!property_name || !corporate_email) {
        return res.status(400).json({ error: 'Property name and official corporate email are required.' });
    }

    const proofPath = req.file ? req.file.path : null;

    const sql = `
        INSERT INTO manager_claims (property_name, corporate_email, role, proof_path)
        VALUES (?, ?, ?, ?)
    `;
    const params = [property_name, corporate_email, role, proofPath];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Claim request submitted for verification.',
            claimId: this.lastID
        });
    });
});

app.listen(PORT, () => {
    console.log(`RentWorth Backend running on http://localhost:${PORT}`);
});