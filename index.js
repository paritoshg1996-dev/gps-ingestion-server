import express from "express";
import { createClient } from "@supabase/supabase-js";

// Provider auto-detection
import { detectProvider } from "./parsers/detectProvider.js";

// Provider parsers
import { parseAtlantasys } from "./parsers/atlantasys.js";
import { parseWheelseye } from "./parsers/wheelseye.js";
import { parseMapMyIndia } from "./parsers/mapmyindia.js";
import { parseAIS140 } from "./parsers/ais140.js";
import { parseGeneric } from "./parsers/generic.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());   //  REQUIRED for AIS-140 raw packets

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize function using auto-detection
async function normalize(req) {
  const provider = await detectProvider(req);

  switch (provider) {
    case "atlantasys":
      return parseAtlantasys(req);

    case "wheelseye":
      return parseWheelseye(req);

    case "mapmyindia":
      return parseMapMyIndia(req);

    case "ais140":
      return parseAIS140(req);

    default:
      return parseGeneric(req);
  }
}

// Main GPS ingestion endpoint
app.post("/webhook/gps", async (req, res) => {
  try {
    const gps = await normalize(req);

    if (!gps || !gps.imei || !gps.lat || !gps.lng) {
      console.log("Invalid:", req.body, req.query);
      return res.status(400).json({ status: "invalid_format" });
    }

    console.log("Detected provider:", gps.provider, "Normalized:", gps);

    await supabase.from("realtime_locations").insert({
      ...gps,
      received_at: new Date().toISOString()
    });

    await supabase.from("latest_locations").upsert({
      ...gps,
      received_at: new Date().toISOString()
    });

    return res.json({ status: "success" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "server_error" });
  }
});

// Start server
app.listen(3000, () =>
  console.log("GPS server with auto-detection running")
);
