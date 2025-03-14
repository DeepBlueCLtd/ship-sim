import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ShipDictionary } from '../types';
import gbData from '../assets/gb.json';
import { ShipHeading } from './ShipHeading';
import React from 'react';

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
      {Object.values(ships).map((ship) => {
        const isChangingCourseOrSpeed = ship.demandedCourse !== undefined || ship.demandedSpeed !== undefined;
        return (
          <React.Fragment key={ship.id}>
            {/* Ship trail */}
            {ship.trail.length > 0 && (
              <Polyline
                positions={ship.trail.map(pos => [pos.latitude, pos.longitude])}
                pathOptions={{
                  color: isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff',
                  opacity: 0.8,
                  weight: 2,
                  dashArray: '4,10'
                }}
              />
            )}
            {/* Ship marker */}
            <CircleMarker
              center={[ship.position.latitude, ship.position.longitude]}
              radius={6}
              pathOptions={{
                color: isChangingCourseOrSpeed ? '#ff4d4f' : '#1890ff',
                fillColor: isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff',
                fillOpacity: 0.8,
                weight: 2
              }}
            >
              <Popup>
                <div>
                  <h3>{ship.name}</h3>
                  <p>Type: {ship.type}</p>
                  <p>Speed: {ship.speed} knots {ship.demandedSpeed ? `(Demanded: ${ship.demandedSpeed})` : ''}</p>
                  <p>Heading: {ship.heading}° {ship.demandedCourse ? `(Demanded: ${ship.demandedCourse}°)` : ''}</p>
                  <p>Status: {ship.status}</p>
                </div>
              </Popup>
            </CircleMarker>
            <ShipHeading

              ship={ship}
              isChangingCourse={ship.demandedCourse !== undefined}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};
