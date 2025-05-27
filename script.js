/********************************************************************
 *  California County Heat-map (Leaflet + D3)
 *  - loads county GeoJSON once
 *  - swaps any metric from CalEnviroScreen or other CSVs
 *  - colours counties by metric value
 *  - adds auto-updating legend
 ********************************************************************/

/* --------------------------------------------------
 * 1.  MAP BASE-LAYER
 * -------------------------------------------------- */
const map = L.map('map').setView([37.5, -119.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

/* --------------------------------------------------
 * 2.  CSV SOURCES  (dropdown value -> file path)
 * -------------------------------------------------- */
const csvFiles = {
  'Ozone Pctl'            : 'data/calenviroscreen.csv',
  'Drinking Water Pctl'   : 'data/calenviroscreen.csv',
  'Lead Pctl'             : 'data/calenviroscreen.csv',
  'Pollution Burden Pctl' : 'data/calenviroscreen.csv',
  'Poverty Pctl'          : 'data/calenviroscreen.csv',
  'lowincome'             : 'data/lowincome.csv',
  'section8'              : 'data/section8.csv',
  'section221'            : 'data/section221.csv'
};

/* --------------------------------------------------
 * 3.  GLOBALS
 * -------------------------------------------------- */
const colour = d3.scaleSequential(d3.interpolateOrRd); // domain set per metric
let countyLayer;                                       // Leaflet GeoJSON layer
let legendCtrl;                                        // Leaflet legend control

/* --------------------------------------------------
 * 4.  STRING NORMALISER  (CSV & GeoJSON names)
 * -------------------------------------------------- */
function normalise(str = '') {
  return str
    .toLowerCase()
    .replace(/\s+county$/, '')   // drop trailing “ county”
    .replace(/[^a-z\s]/g, '')    // strip punctuation
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();
}

/* --------------------------------------------------
 * 5.  LOAD COUNTY SHAPES ONCE
 * -------------------------------------------------- */
d3.json('data/california-counties.geojson').then(geo => {
  countyLayer = L.geoJSON(geo, {
    weight: 1, color: '#ffffff', fillOpacity: 0.85,
    onEachFeature: (f, layer) => layer.bindPopup('Loading…')
  }).addTo(map);

  buildLegend();          // add empty legend box
  applyMetric('Ozone Pctl');   // initial render
});

/* --------------------------------------------------
 * 6.  DROPDOWN HANDLER
 * -------------------------------------------------- */
document
  .getElementById('dataset-toggle')
  .addEventListener('change', e => applyMetric(e.target.value));

/* --------------------------------------------------
 * 7.  MAIN UPDATE FUNCTION
 * -------------------------------------------------- */
function applyMetric(metric) {
  d3.csv(csvFiles[metric]).then(rows => {
    /* ---- CSV lookup: { countyKey -> numericValue } ---- */
    const lookup = {};
    rows.forEach(r => {
      const key = normalise(r.County);
      lookup[key] = +r[metric]; // NaN if empty
    });

    /* ---- set colour domain (min-max of numeric values) ---- */
    const vals = Object.values(lookup).filter(Number.isFinite);
    const min = d3.min(vals), max = d3.max(vals);
    colour.domain([min, max]);

    /* ---- update every county polygon ---- */
    countyLayer.eachLayer(layer => {
      const geoName = layer.feature.properties.NAME || layer.feature.properties.name;
      const key     = normalise(geoName);
      const val     = lookup[key];

      // debug: log first time a county is missing
      if (!Number.isFinite(val) && !layer.feature.__warned) {
        console.warn('No match for:', geoName);
        layer.feature.__warned = true;
      }

      layer.feature.properties[metric] = val;               // store value
      layer.setStyle({ fillColor: Number.isFinite(val) ? colour(val) : '#cccccc' });
      layer.setPopupContent(`${geoName}: ${Number.isFinite(val) ? val : 'N/A'}`);
    });

    updateLegend(min, max);
  });
}

/* --------------------------------------------------
 * 8.  LEGEND (Gradient + min/max)
 * -------------------------------------------------- */
function buildLegend() {
  legendCtrl = L.control({ position: 'bottomright' });
  legendCtrl.onAdd = () => {
    const div = L.DomUtil.create('div', 'legend');
    div.style.cssText =
      'padding:6px;background:#ffffffee;font:12px/1.2 sans-serif;box-shadow:0 0 4px rgba(0,0,0,.25)';
    return div;
  };
  legendCtrl.addTo(map);
}

function updateLegend(min, max) {
  const div = legendCtrl.getContainer();
  div.innerHTML = ''; // clear

  /* gradient bar (5 stops) */
  const bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.height  = '12px';
  bar.style.margin  = '4px 0';
  d3.range(0, 1.0001, 0.25).forEach(t => {
    const seg = document.createElement('div');
    seg.style.flex = '1';
    seg.style.background = colour(min + t * (max - min));
    bar.appendChild(seg);
  });
  div.appendChild(bar);

  /* min / max labels */
  const labels = document.createElement('div');
  labels.style.display = 'flex';
  labels.style.justifyContent = 'space-between';
  labels.innerHTML = `<span>${min.toFixed(1)}</span><span>${max.toFixed(1)}</span>`;
  div.appendChild(labels);
}
