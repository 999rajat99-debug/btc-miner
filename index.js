 const SECRET = process.env.ADD_SPEED_SECRET || "changeme";
app.get("/addspeed/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const amount = Number(req.query.amount || 5);
    const token = req.query.token || "";

    if (token !== SECRET) return res.status(403).send("Forbidden");

    const ref = db.ref(`users/${uid}`);
    const snap = await ref.once("value");
    const user = snap.val() || {};
    const newSpeed = (user.speed_ghs || 0) + amount;

    await ref.update({ speed_ghs: newSpeed, mining_active: true });

    return res.json({ uid, speed_ghs: newSpeed });
  } catch (e) {
    console.error(e);
    return res.status(500).send("error");
  }
});
