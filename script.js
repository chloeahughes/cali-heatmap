/**************************************************
 * 1.  MAP BASE
 **************************************************/
const map = L.map('map').setView([37.5, -119.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

/**************************************************
 * 2.  CSV SOURCES
 **************************************************/
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

/**************************************************
 * 3.  GLOBALS
 **************************************************/
const colour   = d3.scaleSequential(d3.interpolateOrRd);   // domain set per metric
let countyLayer, legendCtrl;

/**************************************************
 * 4.  LOAD SHAPES ONCE
 **************************************************/
d3.json('data/california-counties.geojson').then(geo => {
  countyLayer = L.geoJSON(geo, {
    weight : 1,
    color  : '#ffffff',
    fillOpacity : 0.85,
    onEachFeature : (f, layer) => layer.bindPopup('Loading…')
  }).addTo(map);

  buildLegend();
  applyMetric('Ozone Pctl');                // first view
});

/**************************************************
 * 5.  DROPDOWN HANDLER
 **************************************************/
document
  .getElementById('dataset-toggle')
  .addEventListener('change', e => applyMetric(e.target.value));

/**************************************************
 * 6.  MAIN UPDATE
 **************************************************/
function applyMetric(metric) {
  d3.csv(csvFiles[metric]).then(rows => {
    /* ---------- build lookup ---------- */
    const lookup = {};
    rows.forEach(r => {
      const key = (r.County || '').trim().toLowerCase();
      lookup[key] = +r[metric];             // NaN if blank
    });

    /* ---------- colour scale domain ---------- */
    const vals   = Object.values(lookup).filter(Number.isFinite);
    const minVal = d3.min(vals);
    const maxVal = d3.max(vals);
    colour.domain([minVal, maxVal]);

    /* ---------- recolour counties ---------- */
    countyLayer.eachLayer(layer => {
      const raw  = layer.feature.properties.NAME || layer.feature.properties.name;
      const key  = raw.trim().toLowerCase();
      const val  = lookup[key];

      layer.feature.properties[metric] = val;                 // store
      layer.setStyle({ fillColor : Number.isFinite(val) ? colour(val) : '#cccccc' });
      layer.setPopupContent(`${raw}: ${Number.isFinite(val) ? val : 'N/A'}`);
    });

    updateLegend(minVal, maxVal);
  });
}

/**************************************************
 * 7.  LEGEND CONTROL
 **************************************************/
function buildLegend() {
  legendCtrl = L.control({ position: 'bottomright' });
  legendCtrl.onAdd = () => {
    const div = L.DomUtil.create('div', 'legend');
    div.style.padding = '6px';
    div.style.background = '#ffffffee';
    div.style.font = '12px/1.2 sans-serif';
    div.style.boxShadow = '0 0 4px rgba(0,0,0,.2)';
    return div;
  };
  legendCtrl.addTo(map);
}

function updateLegend(min, max) {
  const div = legendCtrl.getContainer();
  div.innerHTML = '';                         // clear previous

  // gradient bar (5 stops)
  const stops = d3.range(0, 1.01, 0.25);      // 0, .25, .5, .75, 1
  const bar   = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.height  = '12px';
  bar.style.margin  = '4px 0';
  stops.forEach(t => {
    const seg      = document.createElement('div');
    seg.style.flex = '1';
    seg.style.background = colour(min + t * (max - min));
    bar.appendChild(seg);
  });
  div.appendChild(bar);

  // labels
  const lbl = document.createElement('div');
  lbl.style.display = 'flex';
  lbl.style.justifyContent = 'space-between';
  lbl.innerHTML = `<span>${min.toFixed(1)}</span><span>${max.toFixed(1)}</span>`;
  div.appendChild(lbl);
}
