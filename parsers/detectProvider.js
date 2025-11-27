// Detect provider based on payload structure

export function detectProvider(req) {
  const body = req.body;
  const query = req.query;

  // 1️⃣ Explicit provider parameter always wins
  if (query.provider) return query.provider.toLowerCase();
  if (body.provider) return body.provider.toLowerCase();

  // 2️⃣ Wheelseye format auto-detect
  if (body && body.deviceId && body.latitude && body.longitude) {
    return "wheelseye";
  }

  // 3️⃣ MapMyIndia format auto-detect
  if (query.i && query.la && query.lo) {
    return "mapmyindia";
  }

  // 4️⃣ Atlantasyss format auto-detect
  // Common fields: lat + lon + spd + imei in query
  if (query.lat && query.lon && query.spd && query.imei) {
    return "atlantasys";
  }

  // 5️⃣ AIS-140 detection (starts with $$)
  if (typeof body === "string" && body.startsWith("$$")) {
    return "ais140";
  }

  // 6️⃣ If it has imei, lat, lng in JSON → generic standardized
  if (body && body.imei && (body.lat || body.latitude)) {
    return "generic";
  }

  // 7️⃣ If it has imei + lat in query → generic
  if (query.imei && (query.lat || query.la)) {
    return "generic";
  }

  // 8️⃣ Default fallback
  return "generic";
}
