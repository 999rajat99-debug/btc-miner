// === Import required modules ===
const express = require("express");
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
const app = express();

// === Initialize Firebase ===
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://newsignup-default-rtdb.firebaseio.com"
});
const db = admin.database();

// === Add-Speed Secret Key ===
const SECRET = process.env.ADD_SPEED_SECRET || "changeme";

// === Default Route ===
app.get("/", (req, res) => {
  res.send("BTC Miner backend running ✅");
});

// === Addspeed Route ===
app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const token = req.query.token;
    const amount = Number(req.query.amount) || 0;

    // Authorization check
    if (token !== SECRET) {
      return res.status(403).send("Forbidden");
    }

    const ref = db.ref(`users/${uid}`);
    const snapshot = await ref.get();
    const data = snapshot.val() || {};

    const currentSpeed = data.speed_ghs || 0;
    const newSpeed = currentSpeed + amount;

    await ref.update({
      ...data,
      speed_ghs: newSpeed,
      mining_active: true
    });

    res.json({ uid, speed_ghs: newSpeed });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Server error");
  }
});

// === Start Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
