import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";

// Initialize environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://newsiginup-default-rtdb.firebaseio.com/" // <-- Use your correct Firebase URL here
});

const db = admin.database();

// Root route
app.get("/", (req, res) => {
  res.send("🚀 BTC Miner Backend is Live!");
});


// ===================================================================
// ✅ Add Speed Route (with Auto-create User)
// ===================================================================
app.get("/addspeed/:uid", async (req, res) => {
  const token = req.query.token;
  const uid = req.params.uid;

  // 🛡️ Verify secret token
  if (token !== process.env.ADD_SPEED_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  try {
    const userRef = db.ref("users/" + uid);
    const snapshot = await userRef.once("value");

    // 🟢 Auto-create user if not exists
    if (!snapshot.exists()) {
      console.log(`User ${uid} not found, creating new user...`);
      await userRef.set({
        username: "NewUser_" + uid.slice(0, 6),
        email: "",
        speed: 1,
        joinedAt: new Date().toISOString()
      });
    }

    // 🟢 Increment speed safely
    const currentData = (await userRef.once("value")).val() || {};
    const newSpeed = (currentData.speed || 1) + 1;

    await userRef.update({ speed: newSpeed });
    console.log(`✅ Speed updated for UID: ${uid}, new speed: ${newSpeed}`);

    res.json({ success: true, uid, newSpeed });

  } catch (error) {
    console.error("❌ Error updating speed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ===================================================================
// ✅ Get User Info Route (for Kodular app to fetch user data)
// ===================================================================
app.get("/getuser/:uid", async (req, res) => {
  const uid = req.params.uid;

  try {
    const userRef = db.ref("users/" + uid);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = snapshot.val();
    res.json({
      success: true,
      uid,
      data: userData
    });

  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ===================================================================
// ✅ Start Server
// ===================================================================
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
