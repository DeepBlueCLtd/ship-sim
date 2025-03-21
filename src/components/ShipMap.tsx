import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Circle, Tooltip, ScaleControl } from 'react-leaflet';
import { calculateDestination } from '../utils/geoUtils';
import 'leaflet/dist/leaflet.css';
import { ShipDictionary, Ship as ShipType } from '../types';
import { displayPolygons } from '../data/landPolygons';
import { SPAWN_POINT, MAX_DISTANCE_KM } from '../config/constants';
import { CompassRose } from './CompassRose';
import { MouseCoordinates } from './MouseCoordinates';
import { Ship } from './Ship';
import React from 'react';

interface ShipMapProps {
  ships: ShipDictionary;
  displayedTrailLength?: number;
  isDarkMode?: boolean;
  selectedShipId?: string | null;
}

const notAgroundOrDisabled = (state: ShipType['status']) => state !== 'aground' && state !== 'disabled';

export const ShipMap: React.FC<ShipMapProps> = ({ ships, displayedTrailLength = 30, isDarkMode = false, selectedShipId = null }) => {

  return (
    <MapContainer
      center={[50.4, -1.4]} // Centered between spawn area and coast
      zoom={11}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={isDarkMode ? 
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        }
      />
      
      <ScaleControl position="bottomleft" imperial={true} metric={false} />
      {/* Note: ScaleControl automatically shows nautical miles when both imperial and metric are false */}
      
      {/* Add compass rose */}
      <CompassRose />
      
      {/* Add mouse coordinates */}
      <MouseCoordinates />

      {/* Show spawn radius */}
      <Circle
        center={[SPAWN_POINT.latitude, SPAWN_POINT.longitude]}
        radius={8 * 1852} // Convert 8nm to meters (1nm = 1852m)
        pathOptions={{
          color: '#1890ff',
          fillOpacity: 0,
          weight: 2,
          dashArray: '5, 10'
        }}
      >
      </Circle>

      {/* Show return limit */}
      <Circle
        center={[SPAWN_POINT.latitude, SPAWN_POINT.longitude]}
        radius={MAX_DISTANCE_KM * 1000} // Convert km to meters
        pathOptions={{
          color: '#ff4d4f',
          fillOpacity: 0,
          weight: 2
        }}
      >
      </Circle>

      {/* Display land polygons */}
      {displayPolygons.map((polygon, index) => (
        <Polygon
          key={index}
          positions={polygon}
          pathOptions={{
            color: isDarkMode ? '#52c41a' : '#389e0d',
            fillColor: isDarkMode ? '#52c41a' : '#389e0d',
            fillOpacity: 0.3,
            weight: 1
          }}
        />
      ))}
      {ships.map((ship) => {
        return (
          <React.Fragment key={ship.id}>
            {/* Draw layers in order: detection range, collision indicators, trail, cone, ship */}
            {/* 1. Collision risk indicators */}
            {notAgroundOrDisabled(ship.status) && ship.collisionRisks.map(risk => {
              const otherShip = ships.find(s => s.id === risk.shipId);
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
                        {risk.collisionPoint && (
                          <div>Time: {risk.collisionPoint.timeToCollision.toFixed(1)}min</div>
                        )}
                      </div>
                    </Tooltip>
                  </Polyline>

                  {/* Predicted collision point */}
                  {risk.collisionPoint && (
                    <React.Fragment>
                      {/* Collision point marker */}
                      <CircleMarker
                        center={[risk.collisionPoint.latitude, risk.collisionPoint.longitude]}
                        radius={4}
                        pathOptions={{
                          color: '#ff4d4f',
                          fillColor: '#fff',
                          fillOpacity: 1,
                          weight: 2
                        }}
                      >
                        <Tooltip permanent={true} direction='top'>
                          <div style={{ textAlign: 'center' }}>
                            ⚠️ Collision in {risk.collisionPoint.timeToCollision.toFixed(1)}min
                          </div>
                        </Tooltip>
                      </CircleMarker>

                      {/* Ship paths to collision point */}
                      <Polyline
                        positions={[
                          [ship.position.latitude, ship.position.longitude],
                          [risk.collisionPoint.latitude, risk.collisionPoint.longitude]
                        ]}
                        pathOptions={{
                          color: '#ff4d4f',
                          weight: 1,
                          opacity: 0.4
                        }}
                      />
                      <Polyline
                        positions={[
                          [otherShip.position.latitude, otherShip.position.longitude],
                          [risk.collisionPoint.latitude, risk.collisionPoint.longitude]
                        ]}
                        pathOptions={{
                          color: '#ff4d4f',
                          weight: 1,
                          opacity: 0.4
                        }}
                      />
                    </React.Fragment>
                  )}
                </React.Fragment>
              );
            })}

            {/* 2. Collision detection range (4nm) */}
            {notAgroundOrDisabled(ship.status) && (<Circle
              center={[ship.position.latitude, ship.position.longitude]}
              radius={4 * 1852} // 4nm in meters
              pathOptions={{
                color: ship.color,
                fillColor: ship.color,
                fillOpacity: 0.05,
                weight: 1,
                dashArray: '5,5'
              }}
            />)}
            {/* 2. Ship trail */}
              {/* highlight path, if selected */}
              { ship.id === selectedShipId && (
                <Polyline
                  positions={[
                    ...(ship.trail.length > 0 ? ship.trail
                      .slice(-displayedTrailLength) // Take the last N points
                      .map(pos => [pos.latitude, pos.longitude] as [number, number]) : []),
                [ship.position.latitude, ship.position.longitude] as [number, number] // Current position last
              ] as [number, number][]}
              pathOptions={{
                color: '#ffffff',
                opacity: 0.4, // Reduced opacity to make cones more visible
                weight: 4
              }}
              />
            )}
            <Polyline
              positions={[
                ...(ship.trail.length > 0 ? ship.trail
                  .slice(-displayedTrailLength) // Take the last N points
                  .map(pos => [pos.latitude, pos.longitude] as [number, number]) : []),
                [ship.position.latitude, ship.position.longitude] as [number, number] // Current position last
              ] as [number, number][]}
              pathOptions={{
                color: ship.color,
                opacity: 0.4, // Reduced opacity to make cones more visible
                weight: 2
              }}
              />
            {/* 2. Collision avoidance cone - only show if not aground */}
            {notAgroundOrDisabled(ship.status) && (
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
                color: ship.color,
                fillColor: ship.color,
                fillOpacity: 0.1,
                weight: 1
              }}
            >
              {/* Heading indicator at cone tip */}
              <CircleMarker
                center={calculateDestination(
                  ship.position.latitude,
                  ship.position.longitude,
                  2, // 2nm radius
                  ship.heading
                )}
                radius={0}
              >
                {notAgroundOrDisabled(ship.status) && (ship.avoidingLand || ship.collisionRisks.length > 0) && (
                  <Tooltip permanent={true} direction='top' className={`transparent-tooltip ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
                    <div style={{ 
                      textAlign: 'center', 
                      backgroundColor: 'transparent',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}>
                      {/* Show what we're avoiding */}
                      {ship.avoidingLand && (
                        <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>⚠️ Avoiding Land</div>
                      )}
                      {ship.collisionRisks.length > 0 && (
                        <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                          ⚠️ Avoiding {ship.collisionRisks.length} ship{ship.collisionRisks.length > 1 ? 's' : ''}
                        </div>
                      )}
                      {/* Always show current course and speed when avoiding */}
                      <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Current: {ship.heading.toFixed(0)}°</div>
                      <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Speed: {ship.speed.toFixed(1)} kts</div>
                      {/* Show demanded course if different */}
                      {ship.demandedCourse !== undefined && ship.demandedCourse !== ship.heading && (
                        <div style={{ color: '#ff7875' }}>
                          Demanded: {ship.demandedCourse.toFixed(0)}°
                          <div style={{ fontSize: '0.9em' }}>
                            (Turn {Math.abs(((((ship.demandedCourse - ship.heading + 540) % 360) - 180))).toFixed(0)}° {((((ship.demandedCourse - ship.heading + 540) % 360) - 180)) > 0 ? 'starboard' : 'port'})
                          </div>
                        </div>
                      )}
                      {/* Show speed reduction during avoidance */}
                      {ship.demandedSpeed !== undefined && ship.demandedSpeed !== ship.speed && (
                        <div style={{ color: '#ff7875' }}>
                          Demanded: {ship.demandedSpeed.toFixed(1)} kts
                          <div style={{ fontSize: '0.9em' }}>
                            ({((ship.demandedSpeed / (ship.normalSpeed ?? ship.speed)) * 100).toFixed(0)}% of {ship.normalSpeed !== undefined ? 'normal' : 'current'} speed)
                          </div>
                        </div>
                      )}
                    </div>
                  </Tooltip>
                )}
              </CircleMarker>
            </Polygon>
            )}

            {/* Ship with dimensions */}
            <Ship
              ship={ship}
              isDarkMode={isDarkMode}
              isSelected={ship.id === selectedShipId}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};
