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

// Enable all body formats
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); // REQUIRED for AIS-140 raw packets

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* --------------------------------------------------------
   1️⃣  API Key Authentication (MUST COME BEFORE EVERYTHING)
---------------------------------------------------------*/
async function authenticateTransporter(req) {
  // api_key can be passed either as:
  // ?api_key=xxxx OR header: x-api-key: xxxx
  const api_key = req.query.api_key || req.header("x-api-key");

  if (!api_key) return null;

  const { data, error } = await supabase
    .from("transporters")
    .select("transporter_id")
    .eq("api_key", api_key)
    .single();

  if (error || !data) return null;

  return data.transporter_id;
}

/* --------------------------------------------------------
   2️⃣  Normalize incoming GPS using provider detection
---------------------------------------------------------*/
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

/* --------------------------------------------------------
   3️⃣  Main GPS ingestion route
---------------------------------------------------------*/
app.post("/webhook/gps", async (req, res) => {
  try {
    // Authenticate transporter first
    const transporter_id = await authenticateTransporter(req);

    if (!transporter_id) {
      return res.status(401).json({
        status: "unauthorized",
        message: "Invalid or missing API key"
      });
    }

    // Normalize GPS packet
    const gps = await normalize(req);

    if (!gps || !gps.imei || !gps.lat || !gps.lng) {
      console.log("Invalid payload:", req.body, req.query);
      return res.status(400).json({ status: "invalid_format" });
    }

    // Attach transporter to GPS object
    gps.transporter_id = transporter_id;

    console.log(
      "Transporter:", transporter_id,
      "Provider:", gps.provider,
      "GPS:", gps
    );

    // Insert into history
    await supabase.from("realtime_locations").insert({
      ...gps,
      received_at: new Date().toISOString()
    });

    // Upsert into latest
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

/* --------------------------------------------------------
   4️⃣  Start Server
---------------------------------------------------------*/
app.listen(3000, () =>
  console.log("GPS server with API auth + auto-detection running")
);
