const express = require("express");
const https   = require("https");
const app = express();
app.use(express.json());

// Serve static files
app.use(express.static("public"));

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://roblox-detection-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const buyersRef    = db.ref("buyers");
const donationsRef = db.ref("donations");
const statsRef     = db.ref("stats");

// ── Serve main page ─────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// ── Avatar proxy (fixes Roblox hotlink blocking in browsers) ────────────────
// Roblox Thumbnails API returns JSON with the real CDN image URL.
// We proxy through our server so the browser never hits Roblox directly.
const avatarCache = {};

app.get("/api/avatar/:userId", async (req, res) => {
  const { userId } = req.params;

  if (avatarCache[userId]) {
    return res.json({ url: avatarCache[userId] });
  }

  const apiUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=100x100&format=Png&isCircular=false`;

  https.get(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (apiRes) => {
    let body = "";
    apiRes.on("data", (chunk) => (body += chunk));
    apiRes.on("end", () => {
      try {
        const data = JSON.parse(body);
        const url  = data?.data?.[0]?.imageUrl;
        if (!url) return res.status(404).json({ url: "" });
        avatarCache[userId] = url; // simple in-memory cache
        res.json({ url });
      } catch (e) {
        res.status(500).json({ url: "" });
      }
    });
  }).on("error", (e) => {
    console.error("Avatar fetch error:", e.message);
    res.status(500).json({ url: "" });
  });
});

// ── POST endpoint from Roblox ────────────────────────────────────────────────
app.post("/roblox", async (req, res) => {
  const { username, userId, price } = req.body;
  if (!username || !userId || !price) return res.sendStatus(400);

  const timestamp = Date.now();

  try {
    // Update buyers
    const buyerRef  = buyersRef.child(userId);
    const snapshot  = await buyerRef.once("value");
    if (snapshot.exists()) {
      const total = snapshot.val().totalSpent + price;
      await buyerRef.update({ username, totalSpent: total, userId });
    } else {
      await buyerRef.set({ username, totalSpent: price, userId });
    }

    // Update donations (keep last 50)
    const donationSnapshot = await donationsRef.once("value");
    const donations = donationSnapshot.val() ? Object.entries(donationSnapshot.val()) : [];
    const newDonationRef = donationsRef.push();
    await newDonationRef.set({ username, userId, price, timestamp });

    if (donations.length >= 50) {
      const sorted    = donations.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const oldestKey = sorted[0][0];
      await donationsRef.child(oldestKey).remove();
    }

    // Update totalRaised
    const totalSnapshot = await statsRef.once("value");
    const totalData     = totalSnapshot.val() || {};
    const totalRaised   = totalData.totalRaised || 0;
    const goal          = totalData.goal || 1000000;
    await statsRef.update({ totalRaised: totalRaised + price, goal });

    console.log(`Donation received: ${username} - ${price} Robux`);
    res.sendStatus(200);

  } catch (err) {
    console.error("Error saving donation:", err);
    res.sendStatus(500);
  }
});

// ── GET helper endpoints ─────────────────────────────────────────────────────
app.get("/buyers", async (req, res) => {
  try {
    const snapshot = await buyersRef.once("value");
    res.json(snapshot.val());
  } catch (err) { res.sendStatus(500); }
});

app.get("/donations", async (req, res) => {
  try {
    const snapshot = await donationsRef.once("value");
    res.json(snapshot.val());
  } catch (err) { res.sendStatus(500); }
});

app.get("/stats", async (req, res) => {
  try {
    const snapshot = await statsRef.once("value");
    res.json(snapshot.val() || { totalRaised: 0, goal: 1000000 });
  } catch (err) { res.sendStatus(500); }
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
