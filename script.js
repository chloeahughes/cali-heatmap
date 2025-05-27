/**************************************************
 * 1.  INIT MAP
 **************************************************/
const map = L.map('map').setView([37.5, -119.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution : '&copy; OpenStreetMap contributors'
}).addTo(map);

/**************************************************
 * 2.  CONFIG
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

// colour scale used for every metric (0‒100)
const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, 100]);

let geojsonLayer;            // Leaflet layer with county polygons
let currentMetric = 'Ozone Pctl';

/**************************************************
 * 3.  LOAD COUNTY SHAPES ONCE
 **************************************************/
d3.json('data/california-counties.geojson').then(geo => {
  geojsonLayer = L.geoJSON(geo, {
    style: { weight: 1, color: 'white', fillOpacity: 0.8 },
    onEachFeature: (feature, layer) => {
      layer.bindPopup('Loading…');
    }
  }).addTo(map);

  // Initial metric
  updateMetric(currentMetric);
});

/**************************************************
 * 4.  METRIC SWITCHER
 **************************************************/
document
  .getElementById('dataset-toggle')
  .addEventListener('change', e => updateMetric(e.target.value));

/**************************************************
 * 5.  MAIN UPDATE FUNCTION
 **************************************************/
function updateMetric(metric) {
  currentMetric = metric;
  const csvPath = csvFiles[metric];

  d3.csv(csvPath).then(data => {
    /* ---- Build lookup table ---- */
    const dataMap = {};
    data.forEach(d => {
      const key = d.County.trim().toLowerCase();
      dataMap[key] = +d[metric]; // NaN if blank
    });

    /* ---- Update each polygon ---- */
    geojsonLayer.eachLayer(layer => {
      const rawName   = layer.feature.properties.NAME || layer.feature.properties.name;
      const key       = rawName.trim().toLowerCase();
      const value     = dataMap[key];

      // Attach value into the shapefile properties for later use
      layer.feature.properties[metric] = value;

      // Update style & popup
      layer.setStyle({
        fillColor : isFinite(value) ? colorScale(value) : '#cccccc'
      });
      layer.setPopupContent(`${rawName}: ${isFinite(value) ? value : 'N/A'}`);
    });
  });
}
