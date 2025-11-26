export function parseMapMyIndia(req) {
  return {
    imei: req.query.i,
    lat: parseFloat(req.query.la),
    lng: parseFloat(req.query.lo),
    speed: parseFloat(req.query.sp || 0),
    device_ts: req.query.t || new Date().toISOString(),
    provider: "mapmyindia"
  };
}
