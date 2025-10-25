import express from "express";
import admin from "firebase-admin";

// ✅ Safe dotenv import (won’t crash even if missing)
try {
  const dotenv = await import("dotenv");
  dotenv.config();
  console.log("✅ dotenv loaded successfully");
} catch (err) {
  console.warn("⚠️ dotenv not found, using Render environment variables only");
}

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Parse Firebase credentials safely
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} catch (err) {
  console.error("❌ Invalid or missing FIREBASE_CREDENTIALS");
  process.exit(1);
}

// ✅ Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://newsignup-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const ADD_SPEED_SECRET = process.env.ADD_SPEED_SECRET || "changeme";

// ✅ Root route
app.get("/", (req, res) => {
  res.send("BTC Miner backend running ✅");
});

// ✅ Add speed (Auto-create user if missing)
app.get("/addspeed/:uid", async (req, res) => {
  const { uid } = req.params;
  const { amount, token } = req.query;

  // 🔒 Token protection
  if (token !== ADD_SPEED_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  if (!uid || !amount) {
    return res.status(400).json({ error: "Missing UID or amount" });
  }

  try {
    const userRef = db.ref("users").child(uid);
    const snapshot = await userRef.once("value");

    // ✅ Auto-create user if not found
    if (!snapshot.exists()) {
      console.log(`🆕 Creating new user: ${uid}`);
      await userRef.set({
        speed_ghs: Number(amount),
        createdAt: new Date().toISOString(),
        logs: []
      });
      return res.json({ message: "New user created", uid, speed_ghs: Number(amount) });
    }

    // ✅ Update existing user speed
    const currentSpeed = snapshot.val().speed_ghs || 0;
    const newSpeed = currentSpeed + Number(amount);
    await userRef.update({ speed_ghs: newSpeed });

    // ✅ Log the action
    const logRef = db.ref("logs").child(uid);
    await logRef.push({
      timestamp: new Date().toISOString(),
      added: Number(amount),
      total: newSpeed
    });

    res.json({ uid, newSpeed });
  } catch (error) {
    console.error("🔥 AddSpeed Error:", error);
    res.status(500).json({ error: "Server error, please try again later" });
  }
});

// ✅ Status route
app.get("/status", async (req, res) => {
  try {
    const snapshot = await db.ref("users").once("value");
    const users = snapshot.val() || {};
    const totalUsers = Object.keys(users).length;
    const totalSpeed = Object.values(users).reduce(
      (sum, user) => sum + (user.speed_ghs || 0),
      0
    );

    res.json({
      totalUsers,
      totalSpeed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("🔥 Status Error:", error);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});
// ✅ Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
