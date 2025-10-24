const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

// ========== CONFIGURATION ==========
const BTC_PER_GHS_PER_SEC = 0.0000000000000100; // 5 GH/s = +0.0000000000000100 BTC per sec
const RESET_HOUR = 0; // Midnight (00:00)
const TIMEZONE_OFFSET = 5.5 * 60 * 60 * 1000; // +5:30 IST timezone
// ==================================

// Calculate time since last update and update balance
async function updateUserMining(uid, userData) {
  const now = Date.now();
  const lastUpdate = userData.last_update || now;
  const speed = userData.speed_ghs || 0;
  const balance = userData.balance || 0;

  // Time difference in seconds
  const diffSeconds = Math.floor((now - lastUpdate) / 1000);

  if (diffSeconds > 0 && speed > 0) {
    const mined = diffSeconds * speed * BTC_PER_GHS_PER_SEC;
    const newBalance = balance + mined;

    await db.ref(`users/${uid}`).update({
      balance: newBalance,
      last_update: now,
    });

    console.log(`Updated ${uid} mined ${mined} BTC`);
  } else {
    await db.ref(`users/${uid}`).update({ last_update: now });
  }
}

// Scheduled function: runs every 5 minutes
exports.updateMiningBalances = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    const snapshot = await db.ref("users").once("value");
    const users = snapshot.val() || {};

    for (const uid in users) {
      await updateUserMining(uid, users[uid]);
    }

    console.log("Mining balances updated successfully!");
    return null;
  });

// Scheduled function: resets speed_ghs at midnight
exports.resetMiningSpeed = functions.pubsub
  .schedule("every day 00:00")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    const snapshot = await db.ref("users").once("value");
    const users = snapshot.val() || {};

    for (const uid in users) {
      await db.ref(`users/${uid}`).update({
        speed_ghs: 0,
        mining_active: false,
      });
    }

    console.log("All mining speeds reset to 0 at midnight.");
    return null;
  });
