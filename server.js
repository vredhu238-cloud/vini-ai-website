const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// Yahan apni OpenRouter wali nayi key paste karein
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "sk-or-v1-aapki-nayi-key-yahan") {
            return res.status(500).json({ error: "Aapne code mein API Key daali nahi hai!" });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENROUTER_API_KEY.trim(),
                'HTTP-Referer': 'http://localhost:3000', 
                'X-Title': 'Vini AI Helper' // <-- YAHAN NAAM BADLA
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [
                    // YEH NAYA SYSTEM PROMPT HAI
                    { role: 'system', content: 'You are Vini AI, an advanced and helpful AI assistant. You must respond politely in the language the user speaks (Hindi or English). Format your answers beautifully using markdown.' },
                    ...messages
                ],
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.log("OpenRouter Error:", errorData); // Terminal mein error dikhega
            return res.status(response.status).json({ error: errorData.error ? errorData.error.message : "API Error" });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        response.body.on('data', function(chunk) { res.write(chunk); });
        response.body.on('end', function() { res.end(); });
        
    } catch (error) {
        console.log("Server Code Error:", error); // Terminal mein error dikhega
        res.status(500).json({ error: 'Server Error aa gaya' });
    }
});

app.listen(3000, function() {
    console.log('✅ Server chalu ho gaya: http://localhost:3000');
});