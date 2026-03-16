const express = require("express");
const app = express();
app.use(express.json());

// Serve static files from "public"
app.use(express.static("public"));

// Firebase Admin
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://roblox-detection-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const buyersRef = db.ref("buyers");
const donationsRef = db.ref("donations");
const statsRef = db.ref("stats/totalRaised");

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// POST endpoint from Roblox
app.post("/roblox", async (req, res) => {
    const { username, userId, price } = req.body;
    if (!username || !userId || !price) return res.sendStatus(400);

    const timestamp = Date.now();

    try {
        // Update buyers
        const buyerRef = buyersRef.child(userId);
        const snapshot = await buyerRef.once("value");
        if (snapshot.exists()) {
            const total = snapshot.val().totalSpent + price;
            await buyerRef.update({ username, totalSpent: total });
        } else {
            await buyerRef.set({ username, totalSpent: price });
        }

        // Update donations (keep last 50)
        const donationSnapshot = await donationsRef.once("value");
        const donations = donationSnapshot.val() ? Object.entries(donationSnapshot.val()) : [];
        const newDonationRef = donationsRef.push();
        await newDonationRef.set({ username, userId, price, timestamp });

        if (donations.length >= 50) {
            const sorted = donations.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const oldestKey = sorted[0][0];
            await donationsRef.child(oldestKey).remove();
        }

        // Update totalRaised
        const totalSnapshot = await statsRef.once("value");
        const totalRaised = totalSnapshot.val() || 0;
        await statsRef.set(totalRaised + price);

        console.log(`Donation received: ${username} - ${price} Robux`);
        res.sendStatus(200);

    } catch (err) {
        console.error("Error saving donation:", err);
        res.sendStatus(500);
    }
});

// GET endpoints
app.get("/buyers", async (req, res) => {
    try {
        const snapshot = await buyersRef.once("value");
        res.json(snapshot.val());
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get("/donations", async (req, res) => {
    try {
        const snapshot = await donationsRef.once("value");
        res.json(snapshot.val());
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get("/stats", async (req, res) => {
    try {
        const snapshot = await statsRef.once("value");
        res.json({ totalRaised: snapshot.val() || 0 });
    } catch (err) {
        res.sendStatus(500);
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
