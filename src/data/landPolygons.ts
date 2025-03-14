import gbData from '../assets/gb.json';

// Extract region polygons from GeoJSON
const regions = {
  iow: gbData.features.find(f => f.properties.id === 'GBIOW'),
  dorset: gbData.features.find(f => f.properties.id === 'GBDOR'),
  hampshire: gbData.features.find(f => f.properties.id === 'GBHAM'),
  bournemouth: gbData.features.find(f => f.properties.id === 'GBBMH'),
  westSussex: gbData.features.find(f => f.properties.id === 'GBWSX'),
  // portsmouth: gbData.features.find(f => f.properties.id === 'GBPOR'),
  southampton: gbData.features.find(f => f.properties.id === 'GBSTH'),
  poole: gbData.features.find(f => f.properties.id === 'GBPOL')
};

// Convert GeoJSON coordinates to [lon, lat] format for collision detection
export const landPolygons: [number, number][][] = Object.values(regions)
  .filter((feature): feature is NonNullable<typeof feature> => feature !== undefined)
  .map(feature => feature.geometry.coordinates[0].map(coord => [coord[0], coord[1]] as [number, number]));

// Convert GeoJSON coordinates to Leaflet format [lat, lon] for display
export const displayPolygons: [number, number][][] = Object.values(regions)
  .filter((feature): feature is NonNullable<typeof feature> => feature !== undefined)
  .map(feature => feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]));
