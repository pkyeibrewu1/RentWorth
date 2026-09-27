const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// In-memory buffer storage so Sharp processes files before disk write
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

const assistantRequestBuckets = new Map();
const assistantRateWindowMs = 60 * 1000;
const assistantRateLimit = 12;

// Mail Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Helper: Process and save sanitized WebP image
async function processAndSaveImage(buffer, originalname) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(buffer)
        .rotate()
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

    return filename;
}

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// POST /api/auth/send-otp (Dispatches 6-digit PIN to student .edu email)
app.post('/api/auth/send-otp', (req, res) => {
    const { email } = req.body;

    if (!email || !email.toLowerCase().endsWith('.edu')) {
        return res.status(400).json({ error: 'A valid university email ending in .edu is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const insertSql = `
        INSERT INTO email_verifications (email, otp_code, expires_at, verified)
        VALUES (?, ?, ?, 0)
    `;

    db.run(insertSql, [cleanEmail, otpCode, expiresAt], async function (err) {
        if (err) return res.status(500).json({ error: 'Failed to generate verification code.' });

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[DEV OTP] For ${cleanEmail}: ${otpCode}`);
            return res.json({ 
                message: 'Verification code generated! (Dev mode: Check server logs or use code displayed).',
                devOtp: otpCode 
            });
        }

        try {
            await transporter.sendMail({
                from: `"RentWorth Verification" <${process.env.EMAIL_USER}>`,
                to: cleanEmail,
                subject: 'Your RentWorth Verification Code',
                text: `Your 6-digit RentWorth verification PIN is: ${otpCode}. It expires in 10 minutes.`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111;">
                        <h2 style="color: #0f172a; margin-top: 0;">Verify your student review</h2>
                        <p style="font-size: 15px; color: #475569;">Use this one-time code to confirm your student email and submit your review on RentWorth:</p>
                        <div style="background: #f1f5f9; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 16px 0;">
                            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #d97706;">${otpCode}</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
                    </div>
                `
            });
            res.json({ message: 'Verification code sent to your .edu inbox.' });
        } catch (mailErr) {
            console.error('Mail dispatch error:', mailErr);
            res.status(500).json({ error: 'Failed to send confirmation email. Please check server email credentials.' });
        }
    });
});

// POST /api/auth/verify-otp (Validates OTP code)
app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
        return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const now = Date.now();

    const sql = `
        SELECT id FROM email_verifications
        WHERE LOWER(email) = ? AND otp_code = ? AND expires_at > ? AND verified = 0
        ORDER BY id DESC LIMIT 1
    `;

    db.get(sql, [cleanEmail, otp_code.trim(), now], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!record) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }

        db.run('UPDATE email_verifications SET verified = 1 WHERE id = ?', [record.id], (upErr) => {
            if (upErr) return res.status(500).json({ error: upErr.message });
            res.json({ message: 'Email verified successfully!' });
        });
    });
});

// GET /api/reviews
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

// POST /api/reviews (Gated by student .edu OTP verification)
app.post('/api/reviews', upload.single('lease_proof'), async (req, res) => {
    try {
        const { complex_name, university, student_email, rating, floorplan, rent, tag, comment } = req.body;

        if (!student_email || !student_email.toLowerCase().endsWith('.edu')) {
            return res.status(400).json({ error: 'A valid university email (.edu) is required.' });
        }
        if (!complex_name || !rating || !rent) {
            return res.status(400).json({ error: 'Missing required review fields.' });
        }

        const cleanEmail = student_email.toLowerCase().trim();

        // Check that email has verified status
        const checkVerificationSql = `
            SELECT id FROM email_verifications
            WHERE LOWER(email) = ? AND verified = 1
            ORDER BY id DESC LIMIT 1
        `;

        db.get(checkVerificationSql, [cleanEmail], async (verErr, verification) => {
            if (verErr) return res.status(500).json({ error: verErr.message });
            if (!verification) {
                return res.status(403).json({ error: 'You must verify your university .edu email with a verification code before submitting.' });
            }

            let savedFilename = null;
            if (req.file) {
                savedFilename = await processAndSaveImage(req.file.buffer, req.file.originalname);
            }

            const sql = `
                INSERT INTO reviews (complex_name, university, student_email, rating, floorplan, rent, tag, comment, lease_proof_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [complex_name, university, cleanEmail, parseFloat(rating), floorplan, parseInt(rent, 10), tag, comment, savedFilename];

            db.run(sql, params, function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Review created successfully.', reviewId: this.lastID });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process and secure uploaded lease proof.' });
    }
});

// POST /api/reviews/:id/response (Gated by Manager Claim Verification)
app.post('/api/reviews/:id/response', (req, res) => {
    const reviewId = req.params.id;
    const { responder_name, responder_title, response_text, corporate_email, access_code } = req.body;

    if (!responder_name || !responder_title || !response_text || !corporate_email || !access_code) {
        return res.status(400).json({ error: 'All fields, including corporate email and verification code, are required.' });
    }

    db.get('SELECT complex_name FROM reviews WHERE id = ?', [reviewId], (err, review) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!review) return res.status(404).json({ error: 'Review not found.' });

        const verifySql = `
            SELECT id FROM manager_claims 
            WHERE LOWER(corporate_email) = LOWER(?) 
              AND LOWER(property_name) = LOWER(?) 
              AND access_code = ? 
              AND status = 'approved'
        `;

        db.get(verifySql, [corporate_email.trim(), review.complex_name.trim(), access_code.trim()], (err, claim) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!claim) {
                return res.status(403).json({ error: 'Unauthorized: Invalid manager credentials or access code for this property.' });
            }

            const insertSql = `
                INSERT INTO manager_responses (review_id, responder_name, responder_title, response_text)
                VALUES (?, ?, ?, ?)
            `;
            db.run(insertSql, [reviewId, responder_name, responder_title, response_text], function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'A manager response has already been published for this review.' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: 'Official response published.', responseId: this.lastID });
            });
        });
    });
});

// POST /api/claims
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
            const claimId = this.lastID;

            const confirmationEmail = {
                from: `"RentWorth" <${process.env.EMAIL_USER}>`,
                to: corporate_email.trim(),
                replyTo: 'support@rentworth.app',
                subject: 'We received your RentWorth property claim request',
                text: `Hello,\n\nWe have received your request to claim the RentWorth listing for ${property_name.trim()}. This email confirms receipt only; it does not mean the claim has been approved.\n\nOur team aims to review your request and send a decision within 48 hours of submission. For other questions or issues, reply to this email or contact support@rentworth.app. We are unable to respond to questions about approval status until the 48-hour review period has passed.\n\nThank you,\nRentWorth Verification Team`
            };

            const sendConfirmation = async () => {
                if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
                try {
                    await transporter.sendMail(confirmationEmail);
                    return true;
                } catch (mailErr) {
                    console.error('Claim confirmation email error:', mailErr);
                    return false;
                }
            };

            sendConfirmation().then(emailSent => {
                res.status(201).json({
                    message: 'Claim request submitted.',
                    claimId,
                    emailSent
                });
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to store verification proof.' });
    }
});

app.post('/api/assistant/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'Gemini help is not configured yet.' });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    if (!/^[A-Za-z0-9._-]+$/.test(model)) {
        return res.status(500).json({ error: 'The assistant model is misconfigured.' });
    }

    const now = Date.now();
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
    let requestBucket = assistantRequestBuckets.get(clientKey);
    if (!requestBucket || requestBucket.resetAt <= now) {
        if (assistantRequestBuckets.size >= 2000) {
            for (const [key, bucket] of assistantRequestBuckets) {
                if (bucket.resetAt <= now) assistantRequestBuckets.delete(key);
            }
        }
        if (assistantRequestBuckets.size >= 2000 && !requestBucket) {
            return res.status(503).json({ error: 'The assistant is busy. Please try again shortly.' });
        }
        requestBucket = { count: 0, resetAt: now + assistantRateWindowMs };
        assistantRequestBuckets.set(clientKey, requestBucket);
    }
    if (requestBucket.count >= assistantRateLimit) {
        return res.status(429).json({ error: 'Please wait a minute before sending more questions.' });
    }
    requestBucket.count += 1;

    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
        return res.status(400).json({ error: 'Send up to 12 recent chat messages.' });
    }

    const validMessages = messages.every(message =>
        message &&
        ['user', 'model'].includes(message.role) &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 &&
        message.text.length <= 1000
    );
    if (!validMessages || messages[messages.length - 1].role !== 'user') {
        return res.status(400).json({ error: 'Please send a valid text question.' });
    }

    const systemInstruction = [
        'You are RentWorth AI, a concise and friendly assistant for a student-housing review website.',
        'Help visitors understand rental questions and how to use RentWorth.',
        'Do not claim to know a property’s current condition, pricing, or reviews unless the user provides that information.',
        'You cannot access, approve, or provide status updates about property claims or user accounts. Direct claim and account questions to support@rentworth.app.',
        'Do not request or encourage users to share passwords, financial information, identity documents, or private lease details.',
        'Do not provide legal or financial advice; suggest contacting a qualified professional for those matters.',
        'Be clear when you are uncertain and keep answers brief.'
    ].join(' ');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: messages.map(message => ({
                        role: message.role,
                        parts: [{ text: message.text.trim() }]
                    })),
                    generationConfig: { maxOutputTokens: 512, temperature: 0.5 }
                }),
                signal: controller.signal
            }
        );

        if (!geminiResponse.ok) {
            console.error('Gemini assistant request failed with status:', geminiResponse.status);
            return res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again later.' });
        }

        const data = await geminiResponse.json();
        const reply = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || '')
            .join('')
            .trim();
        if (!reply) {
            return res.status(502).json({ error: 'The assistant did not return an answer. Please try again.' });
        }
        res.json({ reply });
    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'The assistant took too long to respond. Please try again.' });
        }
        console.error('Gemini assistant request error:', error.message);
        res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again later.' });
    } finally {
        clearTimeout(timeoutId);
    }
});

// GET /api/admin/claims
app.get('/api/admin/claims', (req, res) => {
    const query = `SELECT * FROM manager_claims ORDER BY id DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// PATCH /api/admin/claims/:id (Generates access_code upon approval)
app.patch('/api/admin/claims/:id', (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    const accessCode = status === 'approved' 
        ? Math.floor(100000 + Math.random() * 900000).toString() 
        : null;

    const query = `
        UPDATE manager_claims 
        SET status = ?, access_code = CASE WHEN ? IS NOT NULL THEN ? ELSE access_code END 
        WHERE id = ?
    `;
    db.run(query, [status, accessCode, accessCode, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Claim updated to ${status}.`, accessCode });
    });
});

app.listen(PORT, () => {
    console.log(`RentWorth Backend running on port ${PORT}`);
});