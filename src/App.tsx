import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import { ControlPanel } from './components/ControlPanel';
import { ShipMap } from './components/ShipMap';
import { Ship, SimulationTime } from './types';
import { generateRandomShips } from './utils/shipGenerator';
import { landPolygons } from './data/landPolygons';
import { SPAWN_POINT, MAX_DISTANCE_NM } from './config/constants';
import { SimulationEngine } from './simulation/SimulationEngine';
import { DefaultMovementStrategy } from './simulation/MovementStrategy';
import { ForwardLookingCollisionAvoidance } from './simulation/CollisionAvoidanceStrategy';
import './App.css';

const { Content } = Layout;
const { defaultAlgorithm, darkAlgorithm } = theme;

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [ships, setShips] = useState<Ship[]>([]);
  // Store up to 120 positions (2 hours at 1-minute intervals)
  const MAX_TRAIL_LENGTH = 120;
  
  // Create simulation engine with default strategies
  const simulationEngine = useMemo(() => new SimulationEngine(
    new DefaultMovementStrategy(),
    new ForwardLookingCollisionAvoidance(),
    { maxTrailLength: MAX_TRAIL_LENGTH }
  ), []);

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

  const handleToggleCollisionAvoidance = useCallback((shipId: string) => {
    setShips(prevShips => {
      return prevShips.map(ship => {
        if (ship.id === shipId) {
          // Toggle collision avoidance and clear any existing collision avoidance state
          const collisionAvoidanceActive = !ship.collisionAvoidanceActive;
          return {
            ...ship,
            collisionAvoidanceActive,
            // Clear collision avoidance state when turning it off
            collisionRisks: collisionAvoidanceActive ? ship.collisionRisks : [],
            demandedCourse: collisionAvoidanceActive ? ship.demandedCourse : undefined,
            demandedSpeed: collisionAvoidanceActive ? ship.demandedSpeed : undefined,
            normalSpeed: collisionAvoidanceActive ? ship.normalSpeed : undefined,
            avoidingLand: collisionAvoidanceActive ? ship.avoidingLand : false
          };
        }
        return ship;
      });
    });
  }, []);

  const handleUpdateShip = useCallback((shipId: string, updates: Partial<Ship>) => {
    setShips(prevShips => {
      return prevShips.map(ship => {
        if (ship.id === shipId) {
          if (!ship.collisionAvoidanceActive) {
            // When not in collision avoidance, apply updates and store normal speed
            const newShip = {
              ...ship,
              ...updates,
              // Clear collision avoidance state
              collisionRisks: [],
              avoidingLand: false
            };
            // Store normal speed if setting a new demanded speed
            if (updates.demandedSpeed !== undefined) {
              newShip.normalSpeed = updates.demandedSpeed;
            }
            return newShip;
          }
        }
        return ship;
      });
    });
  }, []);

  // Update simulation time and ship positions when running
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
        // Create a new array of ships to modify
        let updatedShips = [...prevShips];
        
        // Check if ships are too far from spawn point
        updatedShips = updatedShips.map(ship => {
          if (ship.status !== 'underway') return ship;

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
            
            return {
              ...ship,
              demandedCourse: bearing
            };
          }
          
          return ship;
        });

        // Clear collision-related states for ships with disabled collision avoidance
        updatedShips = updatedShips.map(ship => {
          if (ship.status === 'disabled' || ship.status === 'aground') {
            return {
              ...ship,
              collisionRisks: [],
              demandedCourse: undefined,
              demandedSpeed: undefined,
              normalSpeed: undefined,
              avoidingLand: false
            };
          }
          
          if (!ship.collisionAvoidanceActive) {
            return {
              ...ship,
              collisionRisks: [],
              normalSpeed: undefined,
              avoidingLand: false
            };
          }
          
          return ship;
        });

        // Use the simulation engine to handle ship movement and collision avoidance
        updatedShips = simulationEngine.updateSimulation(
          updatedShips,
          landPolygons,
          simulationTime,
          1 // 1 minute time step
        );

        return updatedShips;
      });
    }, simulationTime.stepInterval);

    return () => clearInterval(interval);
  }, [simulationTime, simulationEngine]);

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

  const handleClearShips = () => {
    setShips([]);
  };

  const handleAddShips = () => {
    const newShips = generateRandomShips(5);
    setShips(prevShips => [...prevShips, ...newShips]);
  };



  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Content>
          <div style={{ display: 'flex', height: '100vh' }}>
            <ControlPanel
              simulationTime={simulationTime}
              onTrailLengthChange={handleTrailLengthChange}
              onStepIntervalChange={handleStepIntervalChange}
              onToggleSimulation={toggleSimulation}
              onClearShips={handleClearShips}
              onAddShips={handleAddShips}
              onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
              ships={ships}
              isDarkMode={isDarkMode}
              onThemeChange={setIsDarkMode}
              onToggleCollisionAvoidance={handleToggleCollisionAvoidance}
              onUpdateShip={handleUpdateShip}
            />
            <div style={{ flex: 1 }}>
              <ShipMap
                ships={ships}
                displayedTrailLength={simulationTime.displayedTrailLength}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
