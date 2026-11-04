const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Statik fayllarni (css, js, rasmlar) to'g'ridan-to'g'ri o'qish uchun:
app.use(express.static(__dirname));

// Bosh sahifa
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(200).send("<h1>Loyiha serveri ishlayapti, lekin index.html fayli topilmadi.</h1>");
    }
});

// Admin panel
app.get('/boshqaruv', (req, res) => {
    const adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.status(404).send("Admin panel fayli topilmadi.");
    }
});

// Kontentlarni olish API
app.get('/api/content', (req, res) => {
    try {
        const contentFile = path.join(__dirname, 'content.json');
        if (fs.existsSync(contentFile)) {
            const raw = fs.readFileSync(contentFile, 'utf8');
            return res.json(JSON.parse(raw || '{}'));
        }
        res.json({});
    } catch (err) {
        console.error("Content o'qishda xato:", err);
        res.json({});
    }
});

// Har qanday noma'lum xatolikni ushlab qolish (Internal Server Error bo'lmasligi uchun)
app.use((err, req, res, next) => {
    console.error("Kutilmagan xatolik:", err);
    res.status(500).send("Serverda xatolik yuz berdi: " + err.message);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${PORT}-portda muvaffaqiyatli ishga tushdi!`);
});
