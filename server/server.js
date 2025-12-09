require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ----- Mongo connection -----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });


// ----- Schema -----
const dailyStatSchema = new mongoose.Schema(
  {
    // YYYY-MM-DD
    date: { type: String, required: true, unique: true },

    steps: { type: Number, default: 0 },
    pushups: { type: Number, default: 0 },
    situps: { type: Number, default: 0 },
    pullups: { type: Number, default: 0 },
    plankMinutes: { type: Number, default: 0 },
    gym: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const DailyStat = mongoose.model("DailyStat", dailyStatSchema);

// Helper: strip internal fields
function cleanDoc(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return rest;
}

// ----- Routes -----

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get stats for a given date (YYYY-MM-DD)
app.get("/api/stats/:date", async (req, res) => {
  const { date } = req.params;

  try {
    const doc = await DailyStat.findOne({ date }).lean();
    if (!doc) {
      return res.json({
        date,
        steps: 0,
        pushups: 0,
        situps: 0,
        pullups: 0,
        plankMinutes: 0,
        gym: 0,
      });
    }
    res.json(cleanDoc(doc));
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Save/update stats for a given date
app.put("/api/stats/:date", async (req, res) => {
  const { date } = req.params;
  const body = req.body || {};

  const payload = {
    date,
    steps: body.steps ?? 0,
    pushups: body.pushups ?? 0,
    situps: body.situps ?? 0,
    pullups: body.pullups ?? 0,
    plankMinutes: body.plankMinutes ?? 0,
    gym: body.gym ?? 0,
  };

  try {
    const doc = await DailyStat.findOneAndUpdate(
      { date },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.json(cleanDoc(doc));
  } catch (err) {
    console.error("Error saving stats:", err);
    res.status(500).json({ error: "Failed to save stats" });
  }
});

// Yearly totals (for 2026 totals page)
app.get("/api/totals", async (req, res) => {
  const year = req.query.year || "2026";
  const prefix = `${year}-`;

  try {
    const [row] = await DailyStat.aggregate([
      { $match: { date: { $regex: `^${prefix}` } } },
      {
        $group: {
          _id: null,
          steps: { $sum: "$steps" },
          pushups: { $sum: "$pushups" },
          situps: { $sum: "$situps" },
          pullups: { $sum: "$pullups" },
          plankMinutes: { $sum: "$plankMinutes" },
          gym: { $sum: "$gym" },
        },
      },
    ]);

    const totals = {
      year,
      steps: row?.steps || 0,
      pushups: row?.pushups || 0,
      situps: row?.situps || 0,
      pullups: row?.pullups || 0,
      plankMinutes: row?.plankMinutes || 0,
      gym: row?.gym || 0,
    };

    res.json(totals);
  } catch (err) {
    console.error("Error fetching totals:", err);
    res.status(500).json({ error: "Failed to fetch totals" });
  }
});

// Monthly totals (for 2026 monthly page)
app.get("/api/monthly-totals", async (req, res) => {
  let { year = "2026", month } = req.query;
  if (!month) {
    return res.status(400).json({ error: "month query parameter is required" });
  }

  month = String(month).padStart(2, "0"); // "01", "02", etc.
  const prefix = `${year}-${month}-`;

  try {
    const [row] = await DailyStat.aggregate([
      { $match: { date: { $regex: `^${prefix}` } } },
      {
        $group: {
          _id: null,
          steps: { $sum: "$steps" },
          pushups: { $sum: "$pushups" },
          situps: { $sum: "$situps" },
          pullups: { $sum: "$pullups" },
          plankMinutes: { $sum: "$plankMinutes" },
          gym: { $sum: "$gym" },
        },
      },
    ]);

    const totals = {
      year,
      month,
      steps: row?.steps || 0,
      pushups: row?.pushups || 0,
      situps: row?.situps || 0,
      pullups: row?.pullups || 0,
      plankMinutes: row?.plankMinutes || 0,
      gym: row?.gym || 0,
    };

    res.json(totals);
  } catch (err) {
    console.error("Error fetching monthly totals:", err);
    res.status(500).json({ error: "Failed to fetch monthly totals" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
