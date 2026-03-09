// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors()); // Frontend alag domain pe hai to
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ===== API Route: Check Symptoms & Generate PDF =====
app.post('/api/check-symptoms', async (req, res) => {
    try {
        const { symptoms, age, gender } = req.body;

        if (!symptoms || symptoms.length === 0) {
            return res.status(400).json({ error: "No symptoms provided" });
        }

        // ===== Gemini API Call =====
        let diagnosisData = null;
        try {
            const apiResponse = await fetch('https://api.gemini.com/v1/diagnosis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GEMINI_KEY}`
                },
                body: JSON.stringify({
                    symptoms: symptoms,
                    age: age || 30,
                    gender: gender || 'male'
                })
            });

            diagnosisData = await apiResponse.json();
            console.log("Gemini API Response:", diagnosisData); // Debug
        } catch (err) {
            console.error("Gemini API Error:", err);
            diagnosisData = null; // fallback
        }

        // ===== Generate PDF =====
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=SymptomsReport.pdf');

        doc.pipe(res); // PDF stream frontend ko bhej raha hai

        doc.fontSize(20).text('HealthXRay - Symptoms Report', { underline: true });
        doc.moveDown();
        doc.fontSize(14).text(`Age: ${age || 'N/A'}  |  Gender: ${gender || 'N/A'}`);
        doc.moveDown();
        doc.text('Symptoms Provided:');
        symptoms.forEach((symptom, i) => doc.text(`${i + 1}. ${symptom}`));
        doc.moveDown();
        doc.text('Potential Conditions:', { underline: true });

        if (diagnosisData && diagnosisData.conditions && diagnosisData.conditions.length > 0) {
            diagnosisData.conditions.forEach((condition, i) => {
                doc.text(`${i + 1}. ${condition.name} (${(condition.probability * 100).toFixed(2)}%)`);
            });
        } else {
            doc.text("No conditions found. Consult a doctor for accurate diagnosis.");
        }

        doc.end(); // PDF send to frontend

    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});