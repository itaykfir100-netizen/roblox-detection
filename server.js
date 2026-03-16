const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://roblox-detection-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const donationsRef = db.ref("donations"); // כל תרומה נשמרת פה
const statsRef = db.ref("stats/totalRaised"); // סכום כולל

// מגיש קבצים סטטיים
app.use(express.static(path.join(__dirname, "/")));

// GET ל-/
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// POST מה-Roblox
app.post("/roblox", async (req, res) => {
    const { username, userId, price, timestamp } = req.body;

    if (username && userId && price && timestamp) {
        try {
            // שמירה של תרומה נפרדת
            const donationRef = donationsRef.push();
            await donationRef.set({ username, userId, price, timestamp });

            // עדכון סכום כולל
            await statsRef.transaction(current => (current || 0) + price);

            console.log(`נשלח לשרת: ${username} | Price: ${price} | Timestamp: ${timestamp}`);
            res.sendStatus(200);
        } catch (err) {
            console.error("Error saving to Firebase:", err);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(400);
    }
});

// GET לכל התרומות
app.get("/donations", async (req, res) => {
    try {
        const snapshot = await donationsRef.once("value");
        res.json(snapshot.val());
    } catch (err) {
        console.error("Error fetching donations:", err);
        res.sendStatus(500);
    }
});

// GET לסכום כולל
app.get("/goal", async (req, res) => {
    try {
        const snapshot = await statsRef.once("value");
        res.json({ totalRaised: snapshot.val() || 0, goal: 1000000 });
    } catch (err) {
        console.error("Error fetching goal:", err);
        res.sendStatus(500);
    }
});

// מאזין פורט
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});