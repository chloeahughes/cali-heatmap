let map = L.map('map').setView([37.5, -119.5], 6);

// Add basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geojsonLayer;
let dataByCounty = {};

const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, 100]);

// Load data 
Promise.all([
  d3.json('data/california-counties.geojson'),
  d3.csv('data/calenviroscreen.csv'),
  d3.csv('data/lowincome.csv'),
  d3.csv('data/section8.csv'),
  d3.csv('data/section221.csv')
]).then(([geojson, ozoneData, lowincome, section8, section221]) => {
  [ozoneData, lowincome, section8, section221].forEach(ds => {
    ds.forEach(d => {
      const county = d.County?.trim().toLowerCase();
      if (!dataByCounty[county]) dataByCounty[county] = {};
      Object.keys(d).forEach(k => {
        if (k !== "County") dataByCounty[county][k.toLowerCase()] = +d[k];
      });
    });
  });

  function style(feature, metric) {
    const countyName = feature.properties.name.toLowerCase();
    const value = dataByCounty[countyName]?.[metric] || 0;
    return {
      fillColor: colorScale(value),
      weight: 1,
      color: 'white',
      fillOpacity: 0.8
    };
  }

  function updateMap(metric) {
    if (geojsonLayer) geojsonLayer.remove();
    geojsonLayer = L.geoJSON(geojson, {
      style: f => style(f, metric),
      onEachFeature: function (feature, layer) {
        const countyName = feature.properties.name;
        const value = dataByCounty[countyName.toLowerCase()]?.[metric] || 'N/A';
        layer.bindPopup(`${countyName}: ${value}`);
      }
    }).addTo(map);
  }

  // Initial render
  updateMap("ozone");

  // Toggle dataset
  document.getElementById('dataset-toggle').addEventListener('change', function () {
    updateMap(this.value);
  });
});
