import * as gh from './geohash.js';

const $ = id => document.getElementById(id);
const hashInput = $('hash'), precInput = $('precision');

const map = L.map('map', { worldCopyJump: true }).setView([45.07, 7.68], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const gridLayer = L.layerGroup().addTo(map);
const cellLayer = L.layerGroup().addTo(map);

const DIRS = [
  ['nw', -1, 1], ['n', 0, 1], ['ne', 1, 1],
  ['w', -1, 0], ['c', 0, 0], ['e', 1, 0],
  ['sw', -1, -1], ['s', 0, -1], ['se', 1, -1],
];
const STYLE = {
  sel: { color: '#dc2626', weight: 3, fillOpacity: 0.25 },
  same: { color: '#3b82f6', weight: 2, fillOpacity: 0.12 },
  diff: { color: '#f97316', weight: 2, fillOpacity: 0.12 },
  par: { color: '#111', weight: 2, dashArray: '6 6', fill: false },
  grid: { color: '#888', weight: 1, fill: false, opacity: 0.6 },
};

let current = null;

// Leaflet bounds for a hash, shifted by `shift` degrees of longitude (antimeridian handling)
function llBounds(hash, shift = 0) {
  const b = gh.bounds(hash);
  return [[b.sw.lat, b.sw.lon + shift], [b.ne.lat, b.ne.lon + shift]];
}

function label(text, latlng, cls = '') {
  return L.marker(latlng, {
    interactive: false,
    icon: L.divIcon({ className: `gh-label ${cls}`, html: text, iconSize: [120, 16], iconAnchor: [60, 8] }),
  });
}

function select(hash, { pan } = {}) {
  hash = hash.toLowerCase();
  if (!gh.isValid(hash)) return;
  current = hash;
  hashInput.value = hash;
  precInput.value = hash.length;
  $('precLabel').textContent = hash.length;
  history.replaceState(null, '', '#' + hash);
  render();
  if (pan ?? $('follow').checked) {
    const b = L.latLngBounds(llBounds(hash));
    if (!map.getBounds().contains(b.pad(1))) map.fitBounds(b.pad(1.5));
  }
}

function render() {
  cellLayer.clearLayers();
  if (!current) return;
  const parent = current.slice(0, -1);
  const c = gh.center(current);

  if (parent && $('showParent').checked) {
    L.rectangle(llBounds(parent), STYLE.par).addTo(cellLayer);
  }

  const gridEl = $('grid');
  gridEl.innerHTML = '';
  for (const [dir, dx, dy] of DIRS) {
    const btn = document.createElement('button');
    if (dir === 'c') {
      btn.className = 'center';
      btn.textContent = current;
      btn.disabled = true;
      L.rectangle(llBounds(current), STYLE.sel).addTo(cellLayer);
      label(current, [c.lat, c.lon]).addTo(cellLayer);
    } else {
      const nb = gh.neighbour(current, dx, dy);
      if (!nb) { btn.textContent = '—'; btn.disabled = true; gridEl.append(btn); continue; }
      const sameParent = nb.slice(0, -1) === parent;
      // shift across the antimeridian so the neighbour is drawn next to the selection
      const nc = gh.center(nb);
      const shift = Math.round((c.lon - nc.lon) / 360) * 360;
      L.rectangle(llBounds(nb, shift), sameParent ? STYLE.same : STYLE.diff)
        .on('click', () => select(nb, { pan: false }))
        .addTo(cellLayer);
      label(nb, [nc.lat, nc.lon + shift]).addTo(cellLayer);

      // highlight the characters that differ from the selection
      let i = 0;
      while (i < nb.length && nb[i] === current[i]) i++;
      btn.innerHTML = `${nb.slice(0, i)}<b>${nb.slice(i)}</b>`;
      btn.title = `${dir.toUpperCase()} — ${sameParent ? 'stesso padre' : 'padre: ' + nb.slice(0, -1)}`;
      if (!sameParent) btn.classList.add('diff');
      btn.onclick = () => select(nb);
    }
    gridEl.append(btn);
  }

  const b = gh.bounds(current);
  const sizeKm = cellKm(b);
  $('info').innerHTML = [
    `padre: ${parent || '(nessuno)'}`,
    `centro: ${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`,
    `SW: ${b.sw.lat.toFixed(6)}, ${b.sw.lon.toFixed(6)}`,
    `NE: ${b.ne.lat.toFixed(6)}, ${b.ne.lon.toFixed(6)}`,
    `dim: ~${sizeKm.w} × ${sizeKm.h}`,
  ].join('<br>');
}

function cellKm(b) {
  const lat = (b.sw.lat + b.ne.lat) / 2;
  const h = (b.ne.lat - b.sw.lat) * 111.32;
  const w = (b.ne.lon - b.sw.lon) * 111.32 * Math.cos(lat * Math.PI / 180);
  const fmt = km => km >= 1 ? `${km.toFixed(km < 10 ? 2 : 0)} km` : `${(km * 1000).toFixed(km < 0.01 ? 2 : 0)} m`;
  return { w: fmt(w), h: fmt(h) };
}

function renderGrid() {
  gridLayer.clearLayers();
  if (!$('showGrid').checked) return;
  const p = +precInput.value;
  const { w, h } = gh.cellSize(p);
  const vb = map.getBounds();
  const south = Math.max(-90, vb.getSouth()), north = Math.min(90, vb.getNorth());
  const lat0 = Math.floor((south + 90) / h) * h - 90;
  const lon0 = Math.floor((vb.getWest() + 180) / w) * w - 180;
  const cols = Math.ceil((vb.getEast() - lon0) / w), rows = Math.ceil((north - lat0) / h);
  if (cols * rows > 1500) return; // too many cells: zoom in
  const showLabels = cols * rows <= 400;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const la = lat0 + r * h, lo = lon0 + col * w;
      L.rectangle([[la, lo], [la + h, lo + w]], { ...STYLE.grid, interactive: false }).addTo(gridLayer);
      if (showLabels) {
        const code = gh.encode(la + h / 2, ((lo + w / 2 + 180) % 360 + 360) % 360 - 180, p);
        label(code, [la + h / 2, lo + w / 2], 'grid').addTo(gridLayer);
      }
    }
  }
}

// --- events ---
map.on('click', e => {
  const lon = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
  select(gh.encode(e.latlng.lat, lon, +precInput.value), { pan: false });
});
map.on('moveend', renderGrid);

hashInput.addEventListener('input', () => {
  const v = hashInput.value.trim().toLowerCase();
  hashInput.style.borderColor = v && !gh.isValid(v) ? 'red' : '';
  if (gh.isValid(v)) select(v, { pan: true });
});

function setPrecision(p) {
  p = Math.min(12, Math.max(1, p));
  $('precLabel').textContent = p;
  precInput.value = p;
  if (current) {
    const c = gh.center(current);
    // going up: take the prefix; going down: take the center child
    select(p <= current.length ? current.slice(0, p) : gh.encode(c.lat, c.lon, p), { pan: true });
  }
  renderGrid();
}
precInput.addEventListener('input', () => setPrecision(+precInput.value));

['showParent', 'showGrid'].forEach(id => $(id).addEventListener('change', () => { render(); renderGrid(); }));

const KEYS = {
  ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1],
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
  q: [-1, 1], e: [1, 1], z: [-1, -1], c: [1, -1],
};
document.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT' && ev.target.type === 'text') return;
  if (ev.key === '+' || ev.key === '=') return setPrecision(+precInput.value + 1);
  if (ev.key === '-') return setPrecision(+precInput.value - 1);
  const m = KEYS[ev.key] || KEYS[ev.key.toLowerCase()];
  if (!m || !current) return;
  ev.preventDefault();
  const nb = gh.neighbour(current, m[0], m[1]);
  if (nb) select(nb);
});

// initial state from URL (#u0nd9) or default
select(location.hash.slice(1) || 'u0nd9', { pan: true });
renderGrid();
