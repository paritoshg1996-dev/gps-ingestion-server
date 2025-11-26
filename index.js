import express from "express";
import { createClient } from "@supabase/supabase-js";

// import provider parsers
import { parseAtlantasys } from "./parsers/atlantasys.js";
import { parseWheelseye } from "./parsers/wheelseye.js";
import { parseMapMyIndia } from "./parsers/mapmyindia.js";
import { parseAIS140 } from "./parsers/ais140.js";
import { parseGeneric } from "./parsers/generic.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for query & form parsing

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Detect provider & return normalized GPS data
function normalize(req) {
  const provider = req.query.provider || req.body.provider;

  // 1. Use provided "provider" parameter
  if (provider) {
    switch (provider.toLowerCase()) {
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

  // 2. Auto-detect formats
  if (req.body && typeof req.body === "object" && req.body.deviceId) {
    return parseWheelseye(req);
  }

  if (req.query && req.query.i && req.query.la) {
    return parseMapMyIndia(req);
  }

  if (typeof req.body === "string" && req.body.startsWith("$$")) {
    return parseAIS140(req);
  }

  // Fallback
  return parseGeneric(req);
}

// GPS ingestion endpoint
app.post("/webhook/gps", async (req, res) => {
  try {
    const gps = normalize(req);

    if (!gps || !gps.imei || !gps.lat || !gps.lng) {
      console.log("Invalid data received:", req.body, req.query);
      return res.status(400).json({ status: "invalid_format" });
    }

    console.log("Normalized:", gps);

    // 1️⃣ Insert into history table
    await supabase.from("realtime_locations").insert({
      ...gps,
      received_at: new Date().toISOString()
    });

    // 2️⃣ Upsert into latest table
    await supabase.from("latest_locations").upsert({
      ...gps,
      received_at: new Date().toISOString()
    });

    return res.json({ status: "success" });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ status: "server_error" });
  }
});

// Start server
app.listen(3000, () => console.log("GPS ingestion server with provider parsers running"));
