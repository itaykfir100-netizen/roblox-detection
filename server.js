const express = require("express");
const app = express();
app.use(express.json());

// Firebase Admin
const admin = require("firebase-admin");

// קורא את Service Account מה‑Environment Variable של Render
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://roblox-detection-default-rtdb.firebaseio.com/" // Database URL שלך
});

const db = admin.database();
const buyersRef = db.ref("buyers"); // כל הקונים נשמרים תחת "buyers"

// POST endpoint לקבל נתונים מהמשחק
app.post("/roblox", async (req, res) => {
    const { username, userId, price } = req.body;

    if (username && userId && price) {
        try {
            const playerRef = buyersRef.child(userId);
            const snapshot = await playerRef.once("value");

            if (snapshot.exists()) {
                // אם השחקן כבר קיים, מוסיפים למחיר הכולל
                const total = snapshot.val().totalSpent + price;
                await playerRef.update({ username, totalSpent: total });
            } else {
                // אם חדש, מוסיפים רשומה
                await playerRef.set({ username, totalSpent: price });
            }

            console.log(`נשלח לשרת: ${username} | Price: ${price}`);
            res.sendStatus(200);
        } catch (err) {
            console.error("Error saving to Firebase:", err);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(400);
    }
});

// GET endpoint להציג את כל הקונים
app.get("/buyers", async (req, res) => {
    try {
        const snapshot = await buyersRef.once("value");
        res.json(snapshot.val());
    } catch (err) {
        console.error("Error fetching from Firebase:", err);
        res.sendStatus(500);
    }
});

// הגדרת פורט
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
