import { useState, useEffect, useCallback } from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import { ControlPanel } from './components/ControlPanel';
import { ShipMap } from './components/ShipMap';
import { ShipDictionary, SimulationTime } from './types';
import { generateRandomShips } from './utils/shipGenerator';
import { calculateShipMovement, calculateNewHeading, calculateNewSpeed, findClearHeading, findCollisionRisks, isConeIntersectingPolygon, isPointInPolygon } from './utils/geoUtils';
import { landPolygons } from './data/landPolygons';
import { SPAWN_POINT, MAX_DISTANCE_NM } from './config/constants';
import './App.css';

const { Content } = Layout;
const { defaultAlgorithm, darkAlgorithm } = theme;

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [ships, setShips] = useState<ShipDictionary>({});
  // Store up to 120 positions (2 hours at 1-minute intervals)
  const MAX_TRAIL_LENGTH = 120;

  const [simulationTime, setSimulationTime] = useState<SimulationTime>({
    timestamp: new Date(),
    running: false,
    trailLength: MAX_TRAIL_LENGTH, // Store 2 hours of positions
    displayedTrailLength: 30, // Default to showing 30 positions
    stepInterval: 200 // Default to 5 steps/sec
  });

  const handleTrailLengthChange = useCallback((newLength: number) => {
    setSimulationTime(prev => ({
      ...prev,
      displayedTrailLength: newLength
    }));
  }, []);

  // Update simulation time and ship positions every 2 seconds when running
  useEffect(() => {
    if (!simulationTime.running) return;

    const interval = setInterval(() => {
      // Update time by 1 minute
      setSimulationTime(prev => ({
        ...prev,
        timestamp: new Date(prev.timestamp.getTime() + 60000)
      }));

      // Update ship positions
      setShips(prevShips => {
        const updatedShips = { ...prevShips };
        
        // Check if ships are too far from spawn point

        Object.values(updatedShips).forEach(ship => {
          if (ship.status !== 'underway') return;

          // Calculate distance from spawn point in nautical miles
          const distanceFromSpawn = Math.sqrt(
            Math.pow((ship.position.latitude - SPAWN_POINT.latitude) * 60, 2) +
            Math.pow((ship.position.longitude - SPAWN_POINT.longitude) * 60 * Math.cos(ship.position.latitude * Math.PI / 180), 2)
          );

          // If ship is too far, set demanded course back to spawn point
          if (distanceFromSpawn > MAX_DISTANCE_NM) {
            // Calculate bearing to spawn point
            const dLon = (SPAWN_POINT.longitude - ship.position.longitude) * Math.PI / 180;
            const lat1 = ship.position.latitude * Math.PI / 180;
            const lat2 = SPAWN_POINT.latitude * Math.PI / 180;
            const y = Math.sin(dLon) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
            const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            
            ship.demandedCourse = bearing;
          }
        });

        // First, check for potential collisions and update demanded courses
        Object.values(updatedShips).forEach(ship => {
          // Skip collision checks for disabled or aground ships
          if (ship.status === 'disabled' || ship.status === 'aground') {
            ship.collisionRisks = [];
            ship.demandedCourse = undefined;
            ship.demandedSpeed = undefined;
            ship.normalSpeed = undefined;
            ship.avoidingLand = false;
            return;
          }
          // Get positions and movement data of all other ships
          const otherShips = Object.values(updatedShips)
            .filter(other => other.id !== ship.id)
            .map(other => ({
              id: other.id,
              latitude: other.position.latitude,
              longitude: other.position.longitude,
              heading: other.heading,
              speed: other.speed
            }));

          // Find collision risks
          ship.collisionRisks = findCollisionRisks(
            ship.id,
            ship.position.latitude,
            ship.position.longitude,
            ship.heading,
            ship.speed,
            otherShips
          );

          // Check if current course is clear or find a new clear heading
          const clearHeading = findClearHeading(
            ship.position.latitude,
            ship.position.longitude,
            ship.heading,
            ship.speed,
            otherShips,
            landPolygons
          );

          // Check if current heading intersects with land
          const isHeadingTowardsLand = landPolygons.some(polygon => 
            isConeIntersectingPolygon(ship.position.latitude, ship.position.longitude, ship.heading, 2, 15, polygon)
          );

          // Update demanded course and speed based on collision avoidance
          if (clearHeading === undefined && ship.collisionRisks.length === 0) {
            // No collision risk, clear collision avoidance course
            if (ship.demandedCourse !== undefined) {
              ship.demandedCourse = undefined;
              ship.avoidingLand = false;
            }
            // Restore normal speed if we were avoiding something
            if (ship.normalSpeed !== undefined) {
              ship.demandedSpeed = ship.normalSpeed;
              ship.normalSpeed = undefined;
            }
          } else {
            // Collision risk detected
            if (clearHeading !== ship.heading) {
              // Set new collision avoidance course
              ship.demandedCourse = clearHeading;
              ship.avoidingLand = isHeadingTowardsLand;
            }
            // Store normal speed if ship has a demanded speed and isn't already avoiding
            if (ship.normalSpeed === undefined && ship.demandedSpeed !== undefined) {
              ship.normalSpeed = ship.demandedSpeed;
            }
            // Reduce to 2/3 of normal or current speed
            const baseSpeed = ship.normalSpeed ?? ship.speed;
            const targetSpeed = baseSpeed * 0.67;
            if (ship.demandedSpeed === undefined || ship.demandedSpeed > targetSpeed) {
              ship.demandedSpeed = targetSpeed;
            }
          }
        });

        // Check for ships running aground
        Object.values(updatedShips).forEach(ship => {
          // Skip already disabled or aground ships
          if (ship.status === 'disabled' || ship.status === 'aground') return;

          // Check if ship is inside any land polygon
          for (const polygon of landPolygons) {
            // Check if ship's position is inside the land polygon
            if (isPointInPolygon([ship.position.longitude, ship.position.latitude], polygon)) {
              updatedShips[ship.id] = { ...updatedShips[ship.id], status: 'aground' };
              break;
            }
          }
        });

        // Check for actual collisions between ships
        Object.values(updatedShips).forEach(ship => {
          if (ship.status === 'disabled' || ship.status === 'aground') return; // Skip disabled or aground ships
          
          Object.values(updatedShips).forEach(otherShip => {
            if (ship.id === otherShip.id || otherShip.status === 'disabled') return;

            // Calculate distance in nautical miles
            const distanceInNm = Math.sqrt(
              Math.pow((ship.position.latitude - otherShip.position.latitude) * 60, 2) +
              Math.pow((ship.position.longitude - otherShip.position.longitude) * 60 * Math.cos(ship.position.latitude * Math.PI / 180), 2)
            );

            // Convert ship lengths to nautical miles
            const shipLengthNm = ship.dimensions.length / 1852;
            const otherShipLengthNm = otherShip.dimensions.length / 1852;

            // If distance is less than sum of ship lengths, handle collision
            if (distanceInNm < (shipLengthNm + otherShipLengthNm) / 2) { // Divide by 2 since we're measuring from ship centers
              if (ship.dimensions.length === otherShip.dimensions.length) {
                // Both ships become disabled if equal length
                updatedShips[ship.id] = { ...updatedShips[ship.id], status: 'disabled' };
                updatedShips[otherShip.id] = { ...updatedShips[otherShip.id], status: 'disabled' };
              } else if (ship.dimensions.length < otherShip.dimensions.length) {
                // Shorter ship becomes disabled
                updatedShips[ship.id] = { ...updatedShips[ship.id], status: 'disabled' };
              }
            }
          });
        });

        // Then update all ship positions
        Object.values(updatedShips).forEach(ship => {
          // Skip position updates for disabled or aground ships
          if (ship.status === 'disabled' || ship.status === 'aground') return;
          // Update heading and turn rate based on demanded course
          const [newHeading, newTurnRate] = calculateNewHeading(ship.heading, ship.turnRate, ship.demandedCourse, 1);
          ship.heading = newHeading;
          ship.turnRate = newTurnRate;
          
          // Update speed based on demanded speed
          ship.speed = calculateNewSpeed(ship.speed, ship.demandedSpeed, 1);
          
          // Calculate new position based on current heading and speed
          const [newLat, newLon] = calculateShipMovement(
            ship.position.latitude,
            ship.position.longitude,
            ship.speed,
            ship.heading,
            1
          );
          
          // Add current position to trail (limit to maximum length)
          ship.trail = [
            ...ship.trail.slice(-(MAX_TRAIL_LENGTH - 1)),
            {
              latitude: ship.position.latitude,
              longitude: ship.position.longitude,
              timestamp: new Date(simulationTime.timestamp)
            }
          ];

          // Update to new position
          ship.position = {
            latitude: newLat,
            longitude: newLon
          };

          // Clear demanded course/speed if reached
          if (ship.demandedCourse !== undefined && Math.abs(ship.heading - ship.demandedCourse) < 0.1 && Math.abs(ship.turnRate) < 0.1) {
            ship.heading = ship.demandedCourse; // Snap to exact course
            ship.turnRate = 0;
            ship.demandedCourse = undefined;
          }
          if (ship.demandedSpeed !== undefined && Math.abs(ship.speed - ship.demandedSpeed) < 0.1) {
            ship.speed = ship.demandedSpeed; // Snap to exact speed
            ship.demandedSpeed = undefined;
          }
        });

        return updatedShips;
      });
    }, simulationTime.stepInterval);

    return () => clearInterval(interval);
  }, [simulationTime.running, simulationTime.stepInterval, simulationTime.timestamp]);

  const handleStepIntervalChange = useCallback((stepsPerSecond: number) => {
    setSimulationTime(prev => ({
      ...prev,
      stepInterval: Math.round(1000 / stepsPerSecond)
    }));
  }, []);

  const toggleSimulation = useCallback(() => {
    setSimulationTime(prev => ({
      ...prev,
      running: !prev.running
    }));
  }, []);

  const handleInitialize = () => {
    const newShips = generateRandomShips(5);
    const shipDictionary = newShips.reduce((acc, ship) => {
      acc[ship.id] = ship;
      return acc;
    }, {} as ShipDictionary);
    setShips(shipDictionary);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh', background: isDarkMode ? '#141414' : '#fff' }}>
        <Layout.Sider width={500} style={{ background: 'inherit' }}>
          <ControlPanel
            isDarkMode={isDarkMode}
            onThemeChange={setIsDarkMode}
            onInitialize={handleInitialize}
            simulationTime={simulationTime}
            onToggleSimulation={toggleSimulation}
            onTrailLengthChange={handleTrailLengthChange}
            onStepIntervalChange={handleStepIntervalChange}
            ships={ships}
          />
        </Layout.Sider>
        <Content>
          <ShipMap 
            ships={ships} 
            displayedTrailLength={simulationTime.displayedTrailLength}
            isDarkMode={isDarkMode}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
