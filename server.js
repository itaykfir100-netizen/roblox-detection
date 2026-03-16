const express = require("express");
const app = express();
app.use(express.json());

// רשימת השחקנים והסכומים
let buyers = [];

// נקודת קצה לקבל POST מהמשחק
app.post("/roblox", (req, res) => {
    const { username, userId, price } = req.body;

    if (username && userId && price) {
        // בדיקה אם השחקן כבר קיים
        let player = buyers.find(p => p.userId === userId);

        if (player) {
            player.totalSpent += price; // מוסיפים לסכום הכולל
        } else {
            buyers.push({
                username: username,
                userId: userId,
                totalSpent: price
            });
        }

        console.log(`נשלח לשרת: ${username} | Price: ${price}`);
    } else {
        console.warn("נתונים לא נכונים מהמשחק:", req.body);
    }

    res.sendStatus(200);
});

// נקודת קצה להציג את כל הקונים
app.get("/buyers", (req, res) => {
    res.json(buyers);
});

// הגדרת פורט
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
