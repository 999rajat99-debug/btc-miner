const express = require("express");
const admin = require("firebase-admin");
const app = express();

const PORT = process.env.PORT || 3000;

// initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://newsignup.firebaseio.com" // <-- change to your Firebase Realtime DB URL
  });
}

const db = admin.database();

// secure token from Render env vars
const SECRET = process.env.ADD_SPEED_SECRET || "changeme";

// home route
app.get("/", (req, res) => {
  res.send("BTC Miner backend running ✅");
});

// secure addspeed route
app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const amount = Number(req.query.amount || 5);
    const token = req.query.token || "";

    if (token !== SECRET) {
      return res.status(403).send("Forbidden");
    }

    const ref = db.ref(`users/${uid}`);
    const snap = await ref.once("value");
    const user = snap.val() || {};
    const newSpeed = (user.speed_ghs || 0) + amount;

    await ref.update({ speed_ghs: newSpeed, mining_active: true });

    return res.json({ uid, speed_ghs: newSpeed });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
