import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Polyline, Circle, Tooltip } from 'react-leaflet';
import { calculateDestination } from '../utils/geoUtils';
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
            {/* Draw layers in order: detection range, collision indicators, trail, cone, ship */}
            {/* 1. Collision risk indicators */}
            {ship.collisionRisks.map(risk => {
              const otherShip = ships[risk.shipId];
              if (!otherShip) return null;

              return (
                <React.Fragment key={`collision-${ship.id}-${risk.shipId}`}>
                  {/* Line connecting ships on collision course */}
                  <Polyline
                    positions={[
                      [ship.position.latitude, ship.position.longitude],
                      [otherShip.position.latitude, otherShip.position.longitude]
                    ]}
                    pathOptions={{
                      color: '#ff4d4f',
                      weight: 1,
                      dashArray: '4,4',
                      opacity: 0.8
                    }}
                  >
                    <Tooltip permanent={true} direction='center'>
                      <div style={{ textAlign: 'center' }}>
                        <div>Distance: {risk.distance.toFixed(1)}nm</div>
                        <div>Rel. Speed: {(-risk.relativeSpeed).toFixed(1)}kts</div>
                      </div>
                    </Tooltip>
                  </Polyline>
                </React.Fragment>
              );
            })}

            {/* 2. Collision detection range (4nm) */}
            <Circle
              center={[ship.position.latitude, ship.position.longitude]}
              radius={4 * 1852} // 4nm in meters
              pathOptions={{
                color: isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff',
                fillColor: isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff',
                fillOpacity: 0.05,
                weight: 1,
                dashArray: '5,5'
              }}
            />
            {/* 2. Ship trail */}
            <Polyline
              positions={[
                [ship.position.latitude, ship.position.longitude] as [number, number],
                ...(ship.trail.length > 0 ? ship.trail.map(pos => [pos.latitude, pos.longitude] as [number, number]) : [])
              ] as [number, number][]}
              pathOptions={{
                color: isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff',
                opacity: 0.4, // Reduced opacity to make cones more visible
                weight: 2
              }}
              />
            {/* 2. Collision avoidance cone */}
            <Polygon
              positions={[
                // Cone apex at ship position
                [ship.position.latitude, ship.position.longitude],
                // Left edge of cone (15 degrees to port)
                calculateDestination(
                  ship.position.latitude,
                  ship.position.longitude,
                  2, // 2nm radius
                  (ship.heading - 15 + 360) % 360
                ),
                // Arc point 1
                calculateDestination(
                  ship.position.latitude,
                  ship.position.longitude,
                  2,
                  (ship.heading - 7.5 + 360) % 360
                ),
                // Front point of cone
                calculateDestination(
                  ship.position.latitude,
                  ship.position.longitude,
                  2,
                  ship.heading
                ),
                // Arc point 2
                calculateDestination(
                  ship.position.latitude,
                  ship.position.longitude,
                  2,
                  (ship.heading + 7.5) % 360
                ),
                // Right edge of cone (15 degrees to starboard)
                calculateDestination(
                  ship.position.latitude,
                  ship.position.longitude,
                  2,
                  (ship.heading + 15) % 360
                )
              ]}
              pathOptions={{
                color: isChangingCourseOrSpeed ? '#ff4d4f' : '#1890ff',
                fillColor: isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff',
                fillOpacity: 0.1,
                weight: 1
              }}
            >
              <Tooltip permanent={true} direction='center' offset={[0, -20]}>
                {ship.heading.toFixed(0)}°
              </Tooltip>
            </Polygon>

            {/* Ship marker */}
            <CircleMarker
              center={[ship.position.latitude, ship.position.longitude]}
              radius={6}
              pathOptions={{
                color: ship.collisionRisks.length > 0 ? '#ff4d4f' : (isChangingCourseOrSpeed ? '#ff7875' : '#1890ff'),
                fillColor: ship.collisionRisks.length > 0 ? '#ff4d4f' : (isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff'),
                fillOpacity: 0.8,
                weight: 2
              }}
            >
              <Popup>
                <div>
                  <h3>{ship.name}</h3>
                  <p>Type: {ship.type}</p>
                  <p>Speed: {ship.speed.toFixed(1)} knots {ship.demandedSpeed ? `(Demanded: ${ship.demandedSpeed.toFixed(1)})` : ''}</p>
                  <p>Heading: {ship.heading.toFixed(1)}° {ship.demandedCourse ? `(Demanded: ${ship.demandedCourse.toFixed(1)}°)` : ''}</p>
                  <p>Status: {ship.status}</p>
                  {ship.collisionRisks.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #d9d9d9', paddingTop: '8px' }}>
                      <p style={{ color: '#ff4d4f', margin: '0 0 8px 0' }}>
                        ⚠️ Collision Risks ({ship.collisionRisks.length}):
                      </p>
                      {ship.collisionRisks.map(risk => {
                        const otherShip = ships[risk.shipId];
                        if (!otherShip) return null;
                        return (
                          <div key={risk.shipId} style={{ marginBottom: '8px' }}>
                            <strong>{otherShip.name}</strong>
                            <div style={{ marginLeft: '12px', fontSize: '0.9em' }}>
                              • {risk.distance.toFixed(1)}nm at {risk.bearing.toFixed(0)}°
                              <br />
                              • Closing at {(-risk.relativeSpeed).toFixed(1)} knots
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
