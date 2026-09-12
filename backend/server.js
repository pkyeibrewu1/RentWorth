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
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());

// 1. GET /api/reviews - Fetch reviews along with any official management responses
app.get('/api/reviews', (req, res) => {
    const query = `
        SELECT 
            r.id, r.complex_name, r.university, r.rating, r.floorplan, r.rent, r.tag, r.comment, r.verified, r.created_at,
            m.responder_name, m.responder_title, m.response_text, m.created_at AS response_date
        FROM reviews r
        LEFT JOIN manager_responses m ON r.id = m.review_id
        ORDER BY r.id DESC
    `;
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
    const params = [complex_name, university, student_email, parseFloat(rating), floorplan, parseInt(rent, 10), tag, comment, leasePath];

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

// 3. POST /api/reviews/:id/response - Add official property manager reply
app.post('/api/reviews/:id/response', (req, res) => {
    const reviewId = req.params.id;
    const { responder_name, responder_title, response_text } = req.body;

    if (!responder_name || !responder_title || !response_text) {
        return res.status(400).json({ error: 'All response fields are required.' });
    }

    const sql = `
        INSERT INTO manager_responses (review_id, responder_name, responder_title, response_text)
        VALUES (?, ?, ?, ?)
    `;
    db.run(sql, [reviewId, responder_name, responder_title, response_text], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Official response published.',
            responseId: this.lastID
        });
    });
});

// 4. POST /api/claims - Property manager claim request
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