const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://newsignup-default-rtdb.firebaseio.com" // change to your DB URL
});

const db = admin.database();
const app = express();

// 1 GH/s = 0.0000000000000020 BTC per sec
const BTC_PER_GHS_PER_SEC = 0.0000000000000020;

// function to update mining balance
async function updateMining() {
  const snapshot = await db.ref("users").once("value");
  const users = snapshot.val() || {};
  const now = Date.now();

  for (const uid in users) {
    const user = users[uid];
    const speed = user.speed_ghs || 0;
    const last = user.last_update || now;
    const balance = user.balance || 0;

    const diffSec = Math.floor((now - last) / 1000);
    if (speed > 0 && diffSec > 0) {
      const mined = diffSec * speed * BTC_PER_GHS_PER_SEC;
      const newBalance = balance + mined;

      await db.ref(`users/${uid}`).update({
        balance: newBalance,
        last_update: now,
      });
      console.log(`✅ Updated ${uid}: +${mined.toFixed(16)} BTC`);
    }
  }
  console.log("Mining update complete.");
}

// Reset speed every midnight (IST)
async function resetSpeed() {
  const snapshot = await db.ref("users").once("value");
  const users = snapshot.val() || {};

  for (const uid in users) {
    await db.ref(`users/${uid}`).update({
      speed_ghs: 0,
      mining_active: false,
    });
  }
  console.log("🕛 Speeds reset to 0 at midnight.");
}

// Routes
app.get("/", (req, res) => res.send("✅ Replit mining API is live!"));
app.get("/mine", async (req, res) => {
  await updateMining();
  res.send("Mining updated successfully.");
});
app.get("/reset", async (req, res) => {
  await resetSpeed();
  res.send("Speeds reset successfully.");
});

app.listen(3000, () => console.log("🚀 Server started on port 3000"));
