// =============================
// BTC Miner Backend (Cloud Mining Ready)
// =============================

const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// =============================
// Firebase Setup
// =============================
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://newsignup-default-rtdb.firebaseio.com/" // ✅ your Firebase URL
});

const db = admin.database();

// =============================
// Middleware
// =============================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// =============================
// Root Route
// =============================
app.get("/", (req, res) => {
  res.send("🚀 BTC Miner Backend is Running Successfully!");
});

// =============================
// ADD SPEED (called when user clicks Watch Ad / Get Speed)
// =============================
app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const token = req.query.token;

    if (!uid) return res.status(400).json({ error: "Missing UID" });

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once("value");

    let user = snapshot.val() || { balance: 0, speed: 0, lastUpdate: Date.now() };

    // Increase mining speed by +5 GH/s
    user.speed = (user.speed || 0) + 5;
    user.lastUpdate = Date.now();

    await userRef.update({
      speed: user.speed,
      lastUpdate: user.lastUpdate
    });

    console.log(`[ADDSPEED] ${uid} speed updated to ${user.speed} GH/s`);
    res.json({ newSpeed: user.speed });

  } catch (error) {
    console.error("❌ AddSpeed Error:", error);
    res.status(500).json({ error: "Failed to update speed" });
  }
});

// =============================
// SYNC BALANCE (called every second by Kodular Clock)
// =============================
app.post("/syncbalance/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const { balance, speed } = req.body;

    if (!uid || balance === undefined || speed === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userRef = db.ref(`users/${uid}`);

    await userRef.update({
      balance: balance,
      speed: speed,
      lastUpdate: Date.now() // 👈 saves exact time of last sync
    });

    console.log(`[SYNC] ${uid} | Balance: ${balance} | Speed: ${speed}`);
    res.json({ status: "ok", message: "Sync complete" });

  } catch (error) {
    console.error("❌ Sync Error:", error);
    res.status(500).json({ error: "Failed to sync data" });
  }
});

// =============================
// GET USER (fetch + cloud mining auto-update)
// =============================
app.get("/getuser/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = snapshot.val();
    const now = Date.now();

    user.balance = user.balance || 0;
    user.speed = user.speed || 0;
    user.lastUpdate = user.lastUpdate || now;

    // CLOUD MINING CALCULATION
    if (user.speed > 0) {
      const secondsPassed = Math.floor((now - user.lastUpdate) / 1000);
      const btc_per_ghs = 0.000000000000002; // same as in Kodular
      const mined = user.speed * btc_per_ghs * secondsPassed;
      user.balance += mined;
    }

    // MIDNIGHT RESET (optional)
    const date = new Date();
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      user.speed = 0;
    }

    // Update user data in Firebase
    await userRef.update({
      balance: user.balance,
      speed: user.speed,
      lastUpdate: now
    });

    console.log(`[GETUSER] ${uid} | Balance: ${user.balance} | Speed: ${user.speed}`);
    res.json({
      balance: user.balance,
      speed: user.speed,
      lastUpdate: user.lastUpdate
    });

  } catch (error) {
    console.error("❌ GetUser Error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// =============================
// BACKUP (optional daily backup route)
// =============================
app.get("/backup", async (req, res) => {
  try {
    const snapshot = await db.ref("users").once("value");
    const data = snapshot.val();
    const backupRef = db.ref("backups/" + new Date().toISOString());
    await backupRef.set({
      backedUpAt: new Date().toISOString(),
      users: data
    });

    res.json({ message: "Backup successful" });
  } catch (error) {
    console.error("❌ Backup Error:", error);
    res.status(500).json({ error: "Backup failed" });
  }
});

// =============================
// Start Server
// =============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
