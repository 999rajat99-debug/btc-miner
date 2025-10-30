// ✅ index.js — Final Stable Version
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");

// ✅ Initialize Express App
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Firebase Configuration (Environment Variables on Render)
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

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,  // ✅ Use the correct DB URL
});
}

const db = admin.database();

// ✅ Default Route
app.get("/", (req, res) => {
  res.send("BTC Miner Backend is Running ✅");
});

// ✅ Get User Info (balance, speed)
app.get("/getuser/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) return res.status(400).json({ error: "UID missing" });

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once("value");
    const userData = snapshot.val() || { balance: 0, speed: 0 };

    return res.json({
      status: "success",
      balance: userData.balance || 0,
      speed: userData.speed || 0,
    });
  } catch (error) {
    console.error("Error in /getuser:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Add Speed (+5 GH/s)
app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) return res.status(400).json({ error: "UID missing" });

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once("value");
    const userData = snapshot.val() || { balance: 0, speed: 0 };

    const newSpeed = (userData.speed || 0) + 5;

    await userRef.update({
      speed: newSpeed,
      lastUpdate: Date.now(),
    });

    console.log(`✅ Speed updated for UID: ${uid} → ${newSpeed} GH/s`);

    return res.json({
      status: "success",
      newSpeed: newSpeed,
      message: `Speed updated to ${newSpeed} GH/s`,
    });
  } catch (error) {
    console.error("Error in /addspeed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Sync Balance (cloud persistence)
app.post("/syncbalance/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const { balance, speed } = req.body;

    const db = admin.database();
    const userRef = db.ref("users/" + uid);
    const snapshot = await userRef.once("value");
    const user = snapshot.val() || {};

    const now = Date.now();
    const lastUpdate = user.lastUpdate || now;

    // Time difference in seconds
    const timeDiff = (now - lastUpdate) / 1000;

    // Simulate mining while offline
    const minedWhileOffline = (user.speed || 0) * 0.00000000000002 * timeDiff;

    const newBalance = (user.balance || 0) + minedWhileOffline;

    // Save everything
    await userRef.update({
      balance: balance ?? newBalance,
      speed: speed ?? user.speed,
      lastUpdate: now
    });

    // ✅ Return all values
    return res.json({
      status: "success",
      minedWhileOffline,
      newBalance
    });

  } catch (error) {
    console.error("❌ Sync Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

// 🌙 Midnight Reset Route
app.post("/resetmidnight", async (req, res) => {
  try {
    const db = admin.database();
    const usersRef = db.ref("users");

    // Fetch all users
    const snapshot = await usersRef.once("value");
    const users = snapshot.val();

    if (users) {
      for (const uid in users) {
        await usersRef.child(uid).update({
          speed: 0,
          lastReset: Date.now()
        });
      }
    }

    console.log("✅ Midnight reset complete at", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
    return res.json({ status: "success", message: "Midnight reset complete" });

  } catch (error) {
    console.error("❌ Midnight reset error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});


// ✅ Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
