import express from "express";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Parse Firebase credentials from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

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

// ✅ Add Speed Route
app.get("/addspeed/:uid", async (req, res) => {
  const { uid } = req.params;
  const { amount, token } = req.query;

  // 🔒 Security check
  if (token !== ADD_SPEED_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  if (!uid || !amount) {
    return res.status(400).json({ error: "Missing UID or amount" });
  }

  try {
    const userRef = db.ref("users").child(uid);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Invalid UID" });
    }

    const currentSpeed = snapshot.val().speed_ghs || 0;
    const newSpeed = currentSpeed + Number(amount);

    // Update speed
    await userRef.update({ speed_ghs: newSpeed });

    // Log this action
    const logRef = db.ref("logs").child(uid);
    await logRef.push({
      timestamp: new Date().toISOString(),
      added: Number(amount),
      total: newSpeed
    });

    res.json({ uid, newSpeed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Status Route
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
    console.error(error);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
