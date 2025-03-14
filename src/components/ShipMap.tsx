import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ShipDictionary } from '../types';
import gbData from '../assets/gb.json';
import { ShipHeading } from './ShipHeading';
import { CompassRose } from './CompassRose';
import { MouseCoordinates } from './MouseCoordinates';
import React from 'react';

interface ShipMapProps {
  ships: ShipDictionary;
}

export const ShipMap: React.FC<ShipMapProps> = ({ ships }) => {
  // Get region polygons
  const regions = {
    iow: gbData.features.find(f => f.properties.id === 'GBIOW'),
    dorset: gbData.features.find(f => f.properties.id === 'GBDOR'),
    hampshire: gbData.features.find(f => f.properties.id === 'GBHAM'),
    bournemouth: gbData.features.find(f => f.properties.id === 'GBBMH')
  };

  // Convert GeoJSON coordinates to Leaflet format (swap lat/long)
  const getPolygonCoords = (feature: typeof regions.iow) => {
    return feature
      ? feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number])
      : [] as [number, number][];
  };

  const polygons = {
    iow: getPolygonCoords(regions.iow),
    dorset: getPolygonCoords(regions.dorset),
    hampshire: getPolygonCoords(regions.hampshire),
    bournemouth: getPolygonCoords(regions.bournemouth)
  };

  return (
    <MapContainer
      center={[50.4, -1.4]} // Centered between spawn area and coast
      zoom={11}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Add compass rose */}
      <CompassRose />
      
      {/* Add mouse coordinates */}
      <MouseCoordinates />

      {/* Show spawn radius */}
      <Circle
        center={[50.3, -1.4]}
        radius={8 * 1852} // Convert 8nm to meters (1nm = 1852m)
        pathOptions={{
          color: '#1890ff',
          fillColor: '#1890ff',
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '5,5'
        }}
      />

      {/* Display region polygons */}
      {polygons.hampshire.length > 0 && (
        <Polygon
          positions={polygons.hampshire}
          pathOptions={{
            color: '#389e0d',
            fillColor: '#389e0d',
            fillOpacity: 0.1,
            weight: 1
          }}
        />
      )}
      {polygons.bournemouth.length > 0 && (
        <Polygon
          positions={polygons.bournemouth}
          pathOptions={{
            color: '#722ed1',
            fillColor: '#722ed1',
            fillOpacity: 0.1,
            weight: 1
          }}
        />
      )}
      {polygons.dorset.length > 0 && (
        <Polygon
          positions={polygons.dorset}
          pathOptions={{
            color: '#d48806',
            fillColor: '#d48806',
            fillOpacity: 0.1,
            weight: 1
          }}
        />
      )}
      {polygons.iow.length > 0 && (
        <Polygon
          positions={polygons.iow}
          pathOptions={{
            color: '#1890ff',
            fillColor: '#1890ff',
            fillOpacity: 0.2,
            weight: 2
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
