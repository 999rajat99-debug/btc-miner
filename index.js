app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const token = req.query.token;
    const amount = Number(req.query.amount) || 0;

    // Check your ADD_SPEED_SECRET
    if (token !== SECRET) {
      return res.status(403).send("Forbidden");
    }

    const ref = db.ref(`users/${uid}`);

    // Get existing user data
    const snapshot = await ref.get();
    const data = snapshot.val() || {};

    // Update speed
    const currentSpeed = data.speed_ghs || 0;
    const newSpeed = currentSpeed + amount;

    await ref.update({
      ...data,
      speed_ghs: newSpeed,
      mining_active: true
    });

    res.json({ uid, speed_ghs: newSpeed });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
