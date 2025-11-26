export function parseAtlantasys(req) {
  return {
    imei: req.query.imei,
    lat: parseFloat(req.query.lat),
    lng: parseFloat(req.query.lon),
    speed: parseFloat(req.query.spd || 0),
    device_ts: req.query.ts || new Date().toISOString(),
    provider: "atlantasys"
  };
}
