export function parseAIS140(req) {
  const raw = typeof req.body === "string" ? req.body : "";
  const p = raw.split(",");

  return {
    imei: p[1],
    lat: parseFloat(p[5]),
    lng: parseFloat(p[6]),
    speed: parseFloat(p[8] || 0),
    device_ts: new Date().toISOString(),
    provider: "ais140"
  };
}
