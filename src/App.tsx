import { useState, useEffect, useCallback } from 'react';
import { Layout } from 'antd';
import { ControlPanel } from './components/ControlPanel';
import { ShipMap } from './components/ShipMap';
import { ShipDictionary, SimulationTime } from './types';
import { generateRandomShips } from './utils/shipGenerator';
import { calculateShipMovement, calculateNewHeading, calculateNewSpeed, findClearHeading, findCollisionRisks, isConeIntersectingPolygon } from './utils/geoUtils';
import { landPolygons } from './data/landPolygons';
import './App.css';

const { Content } = Layout;

function App() {
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
        
        // First, check for potential collisions and update demanded courses
        Object.values(updatedShips).forEach(ship => {
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

          // Update demanded course based on collision avoidance
          if (clearHeading === undefined) {
            // No collision risk, clear any collision avoidance course
            if (ship.demandedCourse !== undefined) {
              ship.demandedCourse = undefined;
              ship.avoidingLand = false;
            }
          } else if (clearHeading !== ship.heading) {
            // Set new collision avoidance course
            ship.demandedCourse = clearHeading;
            ship.avoidingLand = isHeadingTowardsLand;
          }
        });

        // Then update all ship positions
        Object.values(updatedShips).forEach(ship => {
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
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider width={500} style={{ background: '#fff' }}>
        <ControlPanel 
          onInitialize={handleInitialize}
          simulationTime={simulationTime}
          onToggleSimulation={toggleSimulation}
          onTrailLengthChange={handleTrailLengthChange}
          onStepIntervalChange={handleStepIntervalChange}
          ships={ships}
        />
      </Layout.Sider>
      <Content>
        <ShipMap ships={ships} displayedTrailLength={simulationTime.displayedTrailLength} />
      </Content>
    </Layout>
  );
}

export default App;
