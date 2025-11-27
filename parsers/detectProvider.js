import { createClient } from "@supabase/supabase-js";

// Supabase client (read-only use)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Convert req into a unified key list
function extractKeys(req) {
  const keys = new Set();

  // query keys
  Object.keys(req.query || {}).forEach(k => keys.add(k.toLowerCase()));

  // body keys (if JSON)
  if (typeof req.body === "object" && req.body !== null) {
    Object.keys(req.body).forEach(k => keys.add(k.toLowerCase()));
  }

  return keys;
}

export async function detectProvider(req) {
  const keys = extractKeys(req);

  // 1️⃣ FIRST — Check DB registry
  const { data: providers } = await supabase
    .from("gps_provider_registry")
    .select()
    .order("priority", { ascending: true });

  for (const provider of providers) {
    const match = provider.signature_keys.every(sig =>
      keys.has(sig.toLowerCase())
    );

    if (match) {
      return provider.id.toLowerCase();
    }
  }

  // 2️⃣ Second — Hard-coded FALLBACKS
  if (req.body && typeof req.body === "string" && req.body.startsWith("$$"))
    return "ais140";

  if (req.body?.deviceId && req.body?.latitude)
    return "wheelseye";

  if (req.query.i && req.query.la && req.query.lo)
    return "mapmyindia";

  if (req.query.imei && req.query.lat && req.query.lon)
    return "atlantasys";

  if (req.body?.imei && req.body?.lat)
    return "generic";

  if (req.query?.imei && req.query?.lat)
    return "generic";

  // 3️⃣ Last — Full fallback
  return "generic";
}
