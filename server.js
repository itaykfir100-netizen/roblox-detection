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
const buyersRef = db.ref("buyers");

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
            const playerRef = buyersRef.child(userId);
            const snapshot = await playerRef.once("value");

            if (snapshot.exists()) {
                const total = snapshot.val().totalSpent + price;
                await playerRef.update({ username, totalSpent: total, timestamp });
            } else {
                await playerRef.set({ username, totalSpent: price, timestamp });
            }

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

// מאזין פורט
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});