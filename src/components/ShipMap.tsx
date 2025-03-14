import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ShipDictionary } from '../types';
import L from 'leaflet';
import gbData from '../assets/gb.json';

// Fix for default marker icons in React-Leaflet
interface IconDefault extends L.Icon.Default {
  _getIconUrl?: string;
}

delete (L.Icon.Default.prototype as IconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

interface ShipMapProps {
  ships: ShipDictionary;
}

export const ShipMap: React.FC<ShipMapProps> = ({ ships }) => {
  // Find Isle of Wight polygon
  const iowPolygon = gbData.features.find(
    (feature) => feature.properties.id === 'GBIOW'
  );

  // Convert GeoJSON coordinates to Leaflet format (swap lat/long)
  const polygonCoords = iowPolygon
    ? iowPolygon.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number])
    : [] as [number, number][];

  return (
    <MapContainer
      center={[50.67, -1.28]} // Isle of Wight center
      zoom={11}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Display Isle of Wight polygon */}
      {polygonCoords.length > 0 && (
        <Polygon
          positions={polygonCoords}
          pathOptions={{
            color: 'blue',
            fillColor: '#88c',
            fillOpacity: 0.2,
          }}
        />
      )}
      {Object.values(ships).map((ship) => (
        <Marker
          key={ship.id}
          position={[ship.position.latitude, ship.position.longitude]}
        >
          <Popup>
            <div>
              <h3>{ship.name}</h3>
              <p>Type: {ship.type}</p>
              <p>Speed: {ship.speed} knots</p>
              <p>Heading: {ship.heading}°</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
