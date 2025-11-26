import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GPS webhook
app.post("/webhook/gps", async (req, res) => {
  try {
    const data = req.body;

    console.log("Received GPS:", data);

    const { imei, lat, lng, speed, provider, vehicle_no, device_ts } = data;

    // insert into Supabase table
    const { error } = await supabase.from("realtime_locations").insert({
      imei,
      lat,
      lng,
      speed,
      provider,
      vehicle_no,
      device_ts,
      received_at: new Date().toISOString()
    });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ status: "db_error", error });
    }

    return res.json({ status: "success" });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ status: "server_error" });
  }
});

// Start server
app.listen(3000, () => console.log("GPS ingestion server running"));
