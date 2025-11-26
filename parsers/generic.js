export function parseGeneric(req) {
  return {
    imei: req.body.imei || req.query.imei || req.query.i,
    lat: parseFloat(req.body.lat || req.query.lat || req.query.la),
    lng: parseFloat(req.body.lng || req.query.lng || req.query.lo),
    speed: parseFloat(req.body.speed || req.query.speed || req.query.sp || 0),
    device_ts: new Date().toISOString(),
    provider: "generic"
  };
}
