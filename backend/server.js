const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Store uploads in memory first so sharp can process before saving to disk
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Helper to compress and write file safely
async function processAndSaveImage(buffer, originalname) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(buffer)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

    return filename;
}

// 1. GET /api/reviews
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
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. POST /api/reviews
app.post('/api/reviews', upload.single('lease_proof'), async (req, res) => {
    try {
        const { complex_name, university, student_email, rating, floorplan, rent, tag, comment } = req.body;

        if (!student_email || !student_email.toLowerCase().endsWith('.edu')) {
            return res.status(400).json({ error: 'A valid university email (.edu) is required.' });
        }
        if (!complex_name || !rating || !rent) {
            return res.status(400).json({ error: 'Missing required review fields.' });
        }

        let savedFilename = null;
        if (req.file) {
            savedFilename = await processAndSaveImage(req.file.buffer, req.file.originalname);
        }

        const sql = `
            INSERT INTO reviews (complex_name, university, student_email, rating, floorplan, rent, tag, comment, lease_proof_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [complex_name, university, student_email, parseFloat(rating), floorplan, parseInt(rent, 10), tag, comment, savedFilename];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Review created successfully.', reviewId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process and secure uploaded lease proof.' });
    }
});

// 3. POST /api/reviews/:id/response
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
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Official response published.', responseId: this.lastID });
    });
});

// 4. POST /api/claims
app.post('/api/claims', upload.single('proof'), async (req, res) => {
    try {
        const { property_name, corporate_email, role } = req.body;

        if (!property_name || !corporate_email) {
            return res.status(400).json({ error: 'Property name and corporate email are required.' });
        }

        let savedProof = null;
        if (req.file) {
            savedProof = await processAndSaveImage(req.file.buffer, req.file.originalname);
        }

        const sql = `
            INSERT INTO manager_claims (property_name, corporate_email, role, proof_path)
            VALUES (?, ?, ?, ?)
        `;
        db.run(sql, [property_name, corporate_email, role, savedProof], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Claim request submitted.', claimId: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to store verification proof.' });
    }
});

// 5. GET /api/admin/claims - View pending manager verification requests
app.get('/api/admin/claims', (req, res) => {
    const query = `SELECT * FROM manager_claims ORDER BY id DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 6. PATCH /api/admin/claims/:id - Update claim status (approved/rejected)
app.patch('/api/admin/claims/:id', (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    const query = `UPDATE manager_claims SET status = ? WHERE id = ?`;
    db.run(query, [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Claim updated to ${status}.` });
    });
});

app.listen(PORT, () => {
    console.log(`RentWorth Backend running on http://localhost:${PORT}`);
});