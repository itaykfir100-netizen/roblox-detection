const express = require("express");
const app = express();
app.use(express.json());

// רשימה של מי שקנה Gamepass
let buyers = [];

// נקודת קצה שהמשחק שולח אליה שמות
app.post("/roblox", (req, res) => {
    const { username, userId, price } = req.body;

    if (username && userId && price) {
        let player = buyers.find(p => p.userId == userId);

        if (player) {
            // אם השחקן כבר קיים, מוסיפים את המחיר לסכום הכולל
            player.totalSpent += price;
        } else {
            // אם חדש, מוסיפים לרשימה
            buyers.push({
                username: username,
                userId: userId,
                totalSpent: price
            });
        }
    }

    res.sendStatus(200);
});
// נקודת קצה שהאתר מושך ממנה את השמות
app.get("/buyers", (req, res) => {
    res.json(buyers);
});

// הגדרת פורט
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
