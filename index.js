// ==========================
// ✅ BTC Miner Backend Server
// ==========================

// Imports
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import admin from "firebase-admin";

// Initialize dotenv
dotenv.config();

// Create Express app
const app = express();
app.use(bodyParser.json());

// Firebase Admin SDK Initialization
const firebaseConfig = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: "https://newsiginup-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Secret key for secure speed addition
const ADD_SPEED_SECRET = process.env.ADD_SPEED_SECRET || "changeme";

// Default port for Render
const PORT = process.env.PORT || 10000;

// ==========================
// ✅ ROUTES
// ==========================

// 🟢 Root Route (for testing)
app.get("/", (req, res) => {
  res.send("✅ BTC Miner Backend is live!");
});


// 🟢 GET USER (Auto-create if not exists)
app.get("/getuser/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const ref = db.ref("users/" + uid);

    const snapshot = await ref.once("value");

    if (snapshot.exists()) {
      // ✅ Existing user found
      return res.json(snapshot.val());
    } else {
      // 🆕 Create a new user record
      const defaultData = {
        balance: 0,
        speed: 0,
        createdAt: new Date().toISOString()
      };

      await ref.set(defaultData);
      console.log(`✅ New user created: ${uid}`);
      return res.json(defaultData);
    }
  } catch (error) {
    console.error("❌ Error in /getuser:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// 🟢 ADD SPEED (Secure route with token)
app.get("/addspeed/:uid", async (req, res) => {
  const { uid } = req.params;
  const { token } = req.query;

  if (token !== ADD_SPEED_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  try {
    const ref = db.ref("users/" + uid);
    const snapshot = await ref.once("value");

    let user = snapshot.exists()
      ? snapshot.val()
      : { balance: 0, speed: 0, createdAt: new Date().toISOString() };

    // Increase speed by 5 GH/s
    user.speed = (user.speed || 0) + 5;
    await ref.set(user);

    console.log(`⚡ Speed increased for user: ${uid} → ${user.speed} GH/s`);
    res.json({ newSpeed: user.speed });
  } catch (error) {
    console.error("❌ Error in /addspeed:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// 🟢 Simple health-check endpoint
app.get("/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


// ==========================
// ✅ START SERVER
// ==========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
