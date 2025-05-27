/***********************
 *  SET-UP
 **********************/
const map = L.map('map').setView([37.5, -119.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// which CSV to open for each dropdown item
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

// d3 colour scale template (domain will be set per-metric)
const colour = d3.scaleSequential(d3.interpolateOrRd);

let countyLayer;   // Leaflet GeoJSON layer (drawn once)

/***********************
 *  LOAD COUNTY SHAPES
 **********************/
d3.json('data/california-counties.geojson').then(geo => {
  countyLayer = L.geoJSON(geo, {
    weight: 1,  color: '#fff', fillOpacity: 0.85,
    onEachFeature(feature, layer) {
      layer.bindPopup('Loading…');
    }
  }).addTo(map);

  // first render
  applyMetric('Ozone Pctl');
});

/***********************
 *  DROPDOWN LISTENER
 **********************/
document
  .getElementById('dataset-toggle')
  .addEventListener('change', e => applyMetric(e.target.value));

/***********************
 *  MAIN FUNCTION
 **********************/
function applyMetric(metric) {
  const csvPath = csvFiles[metric];

  d3.csv(csvPath).then(rows => {
    /* ---- build lookup { countyKey -> numericValue } ---- */
    const lookup = {};
    rows.forEach(r => {
      const key = (r.County || '').trim().toLowerCase();
      const val = +r[metric];            // NaN if blank / non-numeric
      lookup[key] = val;
    });

    /* ---- determine colour scale limits ---- */
    const numericVals = Object.values(lookup).filter(v => isFinite(v));
    const minVal = d3.min(numericVals);
    const maxVal = d3.max(numericVals);
    colour.domain([minVal, maxVal]);     // e.g. [5, 95]

    /* ---- update every polygon ---- */
    countyLayer.eachLayer(layer => {
      const raw   = (layer.feature.properties.NAME || '').trim();
      const key   = raw.toLowerCase();
      const value = lookup[key];

      // write value into the feature for future use
      layer.feature.properties[metric] = value;

      // style + popup
      layer.setStyle({
        fillColor: isFinite(value) ? colour(value) : '#cccccc'
      });
      layer.setPopupContent(
        `${raw}: ${ isFinite(value) ? value : 'N/A' }`
      );
    });
  });
}
