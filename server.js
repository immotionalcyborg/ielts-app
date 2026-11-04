const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
// Render o'zi beradigan PORT ni oladi, bo'lmasa 3000 da ishlaydi:
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Bosh sahifa (Mini ilova)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin panel sahifasi
app.get('/boshqaruv', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Kontentlarni olish API
app.get('/api/content', (req, res) => {
    const contentPath = path.join(__dirname, 'content.json');
    if (fs.existsSync(contentPath)) {
        try {
            const data = fs.readFileSync(contentPath, 'utf8');
            res.json(JSON.parse(data || '{}'));
        } catch (e) {
            res.json({});
        }
    } else {
        res.json({});
    }
});

// Serverni ishga tushirish
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${PORT}-portda muvaffaqiyatli ishga tushdi`);
});
