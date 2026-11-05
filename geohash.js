// Minimal geohash library (encode / decode / bounds / neighbours)
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function isValid(hash) {
  return typeof hash === 'string' && hash.length > 0 && hash.length <= 12 &&
    [...hash.toLowerCase()].every(c => BASE32.includes(c));
}

export function encode(lat, lon, precision) {
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
  let hash = '', bit = 0, ch = 0, evenBit = true;
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) { ch = ch * 2 + 1; lonMin = mid; } else { ch = ch * 2; lonMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch = ch * 2 + 1; latMin = mid; } else { ch = ch * 2; latMax = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

export function bounds(hash) {
  hash = hash.toLowerCase();
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180, evenBit = true;
  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx < 0) throw new Error(`Carattere non valido: ${c}`);
    for (let n = 4; n >= 0; n--) {
      const b = (idx >> n) & 1;
      if (evenBit) {
        const mid = (lonMin + lonMax) / 2;
        if (b) lonMin = mid; else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (b) latMin = mid; else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }
  return { sw: { lat: latMin, lon: lonMin }, ne: { lat: latMax, lon: lonMax } };
}

export function center(hash) {
  const b = bounds(hash);
  return { lat: (b.sw.lat + b.ne.lat) / 2, lon: (b.sw.lon + b.ne.lon) / 2 };
}

const wrapLon = lon => ((lon + 180) % 360 + 360) % 360 - 180;

// Neighbour at offset (dx, dy) in cells; dx = east(+)/west(-), dy = north(+)/south(-).
// Works across parent boundaries and wraps longitude; returns null beyond the poles.
export function neighbour(hash, dx, dy) {
  const b = bounds(hash);
  const h = b.ne.lat - b.sw.lat, w = b.ne.lon - b.sw.lon;
  const c = center(hash);
  const lat = c.lat + dy * h;
  if (lat > 90 || lat < -90) return null;
  return encode(lat, wrapLon(c.lon + dx * w), hash.length);
}

export function neighbours(hash) {
  return {
    nw: neighbour(hash, -1, 1), n: neighbour(hash, 0, 1), ne: neighbour(hash, 1, 1),
    w: neighbour(hash, -1, 0), e: neighbour(hash, 1, 0),
    sw: neighbour(hash, -1, -1), s: neighbour(hash, 0, -1), se: neighbour(hash, 1, -1),
  };
}

export function cellSize(precision) {
  const lonBits = Math.ceil(precision * 5 / 2), latBits = Math.floor(precision * 5 / 2);
  return { w: 360 / 2 ** lonBits, h: 180 / 2 ** latBits };
}
