export function parseWheelseye(req) {
  const body = req.body;
  return {
    imei: body.deviceId,
    lat: parseFloat(body.latitude),
    lng: parseFloat(body.longitude),
    speed: parseFloat(body.speed || 0),
    device_ts: body.timestamp,
    provider: "wheelseye"
  };
}
