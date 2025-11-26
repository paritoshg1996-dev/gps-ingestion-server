import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // enable form/query parsing

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NORMALIZE FUNCTION
function normalizeData(req) {
  // FORMAT 1: JSON BODY
  if (req.body && req.body.imei) {
    return {
      imei: req.body.imei,
      lat: parseFloat(req.body.lat),
      lng: parseFloat(req.body.lng),
      speed: parseFloat(req.body.speed || 0),
      provider: req.body.provider || "json",
      vehicle_no: req.body.vehicle_no || null,
      device_ts: req.body.device_ts || new Date().toISOString()
    };
  }

  // FORMAT 2: QUERY PARAMETERS
  if (req.query.imei || req.query.i) {
    return {
      imei: req.query.imei || req.query.i,
      lat: parseFloat(req.query.lat || req.query.la),
      lng: parseFloat(req.query.lng || req.query.lo),
      speed: parseFloat(req.query.speed || req.query.sp || 0),
      provider: "query",
      vehicle_no: req.query.vehicle_no || null,
      device_ts: new Date().toISOString()
    };
  }

  // FORMAT 3: RAW AIS-140 STYLE TEXT (comma-separated)
  if (typeof req.body === "string" && req.body.startsWith("$$")) {
    const parts = req.body.split(",");
    return {
      imei: parts[1],
      lat: parseFloat(parts[5]),
      lng: parseFloat(parts[6]),
      speed: parseFloat(parts[8] || 0),
      provider: "ais140",
      device_ts: new Date().toISOString()
    };
  }

  // no recognizable format
  return null;
}

app.post("/webhook/gps", async (req, res) => {
  try {
    const data = normalizeData(req);

    if (!data || !data.imei || !data.lat || !data.lng) {
      console.log("Invalid GPS payload:", req.body, req.query);
      return res.status(400).json({ status: "invalid_format" });
    }

    console.log("Normalized GPS:", data);

    // Insert to history
    await supabase.from("realtime_locations").insert({
      ...data,
      received_at: new Date().toISOString()
    });

    // Upsert to latest
    await supabase.from("latest_locations").upsert({
      ...data,
      received_at: new Date().toISOString()
    });

    return res.json({ status: "success" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "server_error" });
  }
});

app.listen(3000, () => console.log("Multi-format GPS ingestion server running"));
