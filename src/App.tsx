import { useState, useEffect, useCallback } from 'react';
import { Layout } from 'antd';
import { ControlPanel } from './components/ControlPanel';
import { ShipMap } from './components/ShipMap';
import { ShipDictionary, SimulationTime } from './types';
import { generateRandomShips } from './utils/shipGenerator';
import { calculateShipMovement, calculateNewHeading, calculateNewSpeed } from './utils/geoUtils';
import './App.css';

const { Content } = Layout;

function App() {
  const [ships, setShips] = useState<ShipDictionary>({});
  const [simulationTime, setSimulationTime] = useState<SimulationTime>({
    timestamp: new Date(),
    running: false
  });

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
        
        Object.values(updatedShips).forEach(ship => {
          // Update heading based on demanded course
          ship.heading = calculateNewHeading(ship.heading, ship.demandedCourse, 1);
          
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
          
          // Add current position to trail (limit to 30 points)
          ship.trail = [
            {
              latitude: ship.position.latitude,
              longitude: ship.position.longitude,
              timestamp: new Date(simulationTime.timestamp)
            },
            ...ship.trail.slice(0, 29)
          ];

          // Update to new position
          ship.position = {
            latitude: newLat,
            longitude: newLon
          };

          // Clear demanded course/speed if reached
          if (ship.demandedCourse !== undefined && ship.heading === ship.demandedCourse) {
            ship.demandedCourse = undefined;
          }
          if (ship.demandedSpeed !== undefined && ship.speed === ship.demandedSpeed) {
            ship.demandedSpeed = undefined;
          }
        });

        return updatedShips;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [simulationTime.running, simulationTime.timestamp]);

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
      <Layout.Sider width={300} style={{ background: '#fff' }}>
        <ControlPanel 
          onInitialize={handleInitialize}
          simulationTime={simulationTime}
          onToggleSimulation={toggleSimulation}
        />
      </Layout.Sider>
      <Content>
        <ShipMap ships={ships} />
      </Content>
    </Layout>
  );
}

export default App;
