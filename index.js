import express from "express";
import cors from "cors";
import admin from "firebase-admin";

// Environment variable (from Render Dashboard)
const firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
  databaseURL: "https://newsiginup-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const app = express();
app.use(cors());
app.use(express.json());

const ADD_SPEED_SECRET = process.env.ADD_SPEED_SECRET || "default_secret";
const PORT = process.env.PORT || 10000;

// ✅ Root route for testing
app.get("/", (req, res) => {
  res.json({ message: "BTC Miner Backend is Live 🚀" });
});

// ✅ 1️⃣ Get user info or auto-create new user
app.get("/getuser/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();

    if (!snapshot.exists()) {
      // Auto-create user if not found
      const newUser = {
        speed: 0,
        balance: 0,
        createdAt: Date.now()
      };
      await userRef.set(newUser);
      return res.json({ data: newUser });
    }

    // Return existing user data
    return res.json({ data: snapshot.val() });

  } catch (error) {
    console.error("Error in /getuser:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ 2️⃣ Add speed securely
app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const token = req.query.token;

    if (token !== ADD_SPEED_SECRET) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();

    if (!snapshot.exists()) {
      // Auto-create user if missing
      await userRef.set({ speed: 5, balance: 0, createdAt: Date.now() });
      return res.json({ newSpeed: 5, message: "User created and speed added" });
    }

    const userData = snapshot.val();
    const currentSpeed = userData.speed || 0;
    const newSpeed = currentSpeed + 5;

    await userRef.update({ speed: newSpeed });

    return res.json({
      message: "Speed added successfully",
      newSpeed
    });

  } catch (error) {
    console.error("Error in /addspeed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ 3️⃣ Update balance (optional, for future use)
app.post("/updatebalance/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const { balance } = req.body;

    const userRef = db.ref(`users/${uid}`);
    await userRef.update({ balance });

    return res.json({ message: "Balance updated successfully" });

  } catch (error) {
    console.error("Error in /updatebalance:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
