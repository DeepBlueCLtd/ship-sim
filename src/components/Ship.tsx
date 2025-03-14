import React from 'react';
import { Polygon, Popup } from 'react-leaflet';
import { Ship as ShipType } from '../types';
import { calculateDestination } from '../utils/geoUtils';

interface ShipProps {
  ship: ShipType;
  ships: Record<string, ShipType>;
  isChangingCourseOrSpeed: boolean;
}

export const Ship: React.FC<ShipProps> = ({ ship, isChangingCourseOrSpeed }) => {
  // Calculate corner points for ship rectangle
  const cornerPoints = [
    // Bow (front)
    calculateDestination(
      ship.position.latitude,
      ship.position.longitude,
      ship.dimensions.length / (2 * 1852), // Half length forward
      ship.heading
    ),
    // Starboard bow
    calculateDestination(
      ...calculateDestination(
        ship.position.latitude,
        ship.position.longitude,
        ship.dimensions.length / (2 * 1852),
        ship.heading
      ),
      ship.dimensions.beam / (2 * 1852),
      (ship.heading + 90) % 360
    ),
    // Starboard quarter
    calculateDestination(
      ...calculateDestination(
        ship.position.latitude,
        ship.position.longitude,
        ship.dimensions.length / (2 * 1852),
        (ship.heading + 180) % 360
      ),
      ship.dimensions.beam / (2 * 1852),
      (ship.heading + 90) % 360
    ),
    // Stern (back)
    calculateDestination(
      ship.position.latitude,
      ship.position.longitude,
      ship.dimensions.length / (2 * 1852),
      (ship.heading + 180) % 360
    ),
    // Port quarter
    calculateDestination(
      ...calculateDestination(
        ship.position.latitude,
        ship.position.longitude,
        ship.dimensions.length / (2 * 1852),
        (ship.heading + 180) % 360
      ),
      ship.dimensions.beam / (2 * 1852),
      (ship.heading + 270) % 360
    ),
    // Port bow
    calculateDestination(
      ...calculateDestination(
        ship.position.latitude,
        ship.position.longitude,
        ship.dimensions.length / (2 * 1852),
        ship.heading
      ),
      ship.dimensions.beam / (2 * 1852),
      (ship.heading + 270) % 360
    )
  ];

  return (
    <Polygon
      positions={cornerPoints}
      pathOptions={{
        color: ship.status === 'disabled' ? '#000000' : (ship.status === 'aground' ? '#595959' : (ship.collisionRisks.length > 0 ? '#ff4d4f' : (isChangingCourseOrSpeed ? '#ff7875' : '#1890ff'))),
        fillColor: ship.status === 'disabled' ? '#000000' : (ship.status === 'aground' ? '#595959' : (ship.collisionRisks.length > 0 ? '#ff4d4f' : (isChangingCourseOrSpeed ? '#ff7875' : '#40a9ff'))),
        fillOpacity: ship.status === 'disabled' || ship.status === 'aground' ? 0.9 : 0.8,
        weight: 2
      }}
    >
      <Popup>
        <div>
          <h3>{ship.name}</h3>
          <p>
            Status: <span style={{
              color: ship.status === 'disabled' ? '#000000' : 
                     ship.status === 'aground' ? '#595959' : 
                     ship.status === 'underway' ? '#52c41a' : 
                     ship.status === 'anchored' ? '#1890ff' : 
                     ship.status === 'moored' ? '#722ed1' : '#000000',
              fontWeight: 'bold'
            }}>
              {ship.status.charAt(0).toUpperCase() + ship.status.slice(1)}
            </span>
            {ship.avoidingLand && (
              <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>⚠️ Avoiding Land</span>
            )}
          </p>
          <p>Type: {ship.type}</p>
          <p>Dimensions: {(ship.dimensions.length).toFixed(0)}m × {(ship.dimensions.beam).toFixed(0)}m</p>
          <p>
            Speed: {ship.speed.toFixed(1)} knots
            {ship.demandedSpeed !== undefined && (
              <span style={{ color: ship.demandedSpeed !== ship.speed ? '#ff4d4f' : '#52c41a' }}>
                {' '}→ {ship.demandedSpeed.toFixed(1)} knots
                {ship.demandedSpeed !== ship.speed && (
                  <>
                    <span> ({(ship.demandedSpeed - ship.speed > 0 ? '+' : '')}{(ship.demandedSpeed - ship.speed).toFixed(1)})</span>
                    {(ship.avoidingLand || ship.collisionRisks.length > 0) && (
                      <span style={{ display: 'block', marginLeft: '12px', fontSize: '0.9em' }}>
                        {((ship.demandedSpeed / (ship.normalSpeed ?? ship.speed)) * 100).toFixed(0)}% of {ship.normalSpeed !== undefined ? 'normal' : 'current'} speed
                      </span>
                    )}
                  </>
                )}
              </span>
            )}
          </p>
          <p>
            Heading: {ship.heading.toFixed(1)}°
            {ship.turnRate !== 0 && (
              <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>
                ({ship.turnRate > 0 ? '↻' : '↺'} {Math.abs(ship.turnRate).toFixed(1)}°/min)
              </span>
            )}
            {ship.demandedCourse !== undefined && (
              <span style={{ color: ship.demandedCourse !== ship.heading ? '#ff4d4f' : '#52c41a', display: 'block', marginLeft: '12px' }}>
                → {ship.demandedCourse.toFixed(1)}°
                {ship.demandedCourse !== ship.heading && (
                  <span> ({((((ship.demandedCourse - ship.heading + 540) % 360) - 180)).toFixed(1)}°)</span>
                )}
              </span>
            )}
          </p>
          {ship.collisionRisks.length > 0 && (
            <div style={{ marginTop: '8px', borderTop: '1px solid #d9d9d9', paddingTop: '8px' }}>
              <p style={{ color: '#ff4d4f', margin: '0 0 8px 0' }}>
                ⚠️ Collision Risks ({ship.collisionRisks.length}):
              </p>
              {ship.collisionRisks.map(risk => (
                <div key={risk.shipId} style={{ marginBottom: '8px' }}>
                  <strong>{risk.shipId}</strong>
                  <div style={{ marginLeft: '12px', fontSize: '0.9em' }}>
                    • {risk.distance.toFixed(1)}nm at {risk.bearing.toFixed(0)}°
                    <br />
                    • Closing at {(-risk.relativeSpeed).toFixed(1)} knots
                    {risk.collisionPoint && (
                      <>
                        <br />
                        • ⚠️ Collision in {risk.collisionPoint.timeToCollision.toFixed(1)} minutes
                        <br />
                        • At {risk.collisionPoint.latitude.toFixed(4)}°N, {risk.collisionPoint.longitude.toFixed(4)}°W
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Polygon>
  );
};
