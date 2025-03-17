import { Ship, ShipTrailPoint } from '../types';
import { DefaultMovementStrategy } from '../simulation/MovementStrategy';

describe('DefaultMovementStrategy', () => {
  let strategy: DefaultMovementStrategy;
  let ship: Ship;
  const simulationTime = new Date('2025-03-17T12:00:00Z');

  beforeEach(() => {
    strategy = new DefaultMovementStrategy();
    
    // Create a basic ship for testing
    ship = {
      id: 'test-ship-1',
      name: 'Test Ship 1',
      type: 'cargo',
      color: '#0f0',
      status: 'underway',
      position: {
      latitude: 50.0,
      longitude: -1.0 },
      heading: 90, // East
      turnRate: 0,
      speed: 10, // 10 knots
      demandedCourse: undefined,
      demandedSpeed: undefined,
      dimensions: {
      length: 100,
      beam: 20,
      draft: 5,
      },
      collisionAvoidanceActive: true,
      collisionRisks: [],
      avoidingLand: false,
      trail: [] as ShipTrailPoint[],
    };
  });

  describe('updateMovement', () => {
    test('should not update position for disabled ships', () => {
      const disabledShip: Ship = { ...ship, status: 'disabled' };
      const updatedShip = strategy.updateMovement(disabledShip, 1, simulationTime);
      
      expect(updatedShip.position.latitude).toBe(ship.position.latitude);
      expect(updatedShip.position.longitude).toBe(ship.position.longitude);
      expect(updatedShip.heading).toBe(ship.heading);
      expect(updatedShip.speed).toBe(ship.speed);
    });

    test('should not update position for aground ships', () => {
      const agroundShip: Ship = { ...ship, status: 'aground' };
      const updatedShip = strategy.updateMovement(agroundShip, 1, simulationTime);
      
      expect(updatedShip.position.latitude).toBe(ship.position.latitude);
      expect(updatedShip.position.longitude).toBe(ship.position.longitude);
      expect(updatedShip.heading).toBe(ship.heading);
      expect(updatedShip.speed).toBe(ship.speed);
    });

    test('should update position based on heading and speed', () => {
      const updatedShip = strategy.updateMovement(ship, 1, simulationTime);
      
      // Ship is heading east (90°), so longitude should increase
      expect(updatedShip.position.longitude).toBeGreaterThan(ship.position.longitude);
      // Latitude should remain approximately the same
      expect(updatedShip.position.latitude).toBeCloseTo(ship.position.latitude, 4);
    });

    test('should turn towards demanded course', () => {
      const shipWithDemandedCourse = { 
        ...ship, 
        heading: 90, // East
        demandedCourse: 100 // Turn 10 degrees to starboard
      };
      
      const updatedShip = strategy.updateMovement(shipWithDemandedCourse, 1, simulationTime);
      
      // Heading should increase towards demanded course
      expect(updatedShip.heading).toBeGreaterThan(90);
      expect(updatedShip.heading).toBeLessThan(100);
      // Turn rate should be positive (turning starboard)
      expect(updatedShip.turnRate).toBeGreaterThan(0);
    });

    test('should change speed towards demanded speed', () => {
      const shipWithDemandedSpeed = { 
        ...ship, 
        speed: 10, // 10 knots
        demandedSpeed: 15 // Increase to 15 knots
      };
      
      const updatedShip = strategy.updateMovement(shipWithDemandedSpeed, 1, simulationTime);
      
      // Speed should increase towards demanded speed
      expect(updatedShip.speed).toBeGreaterThan(10);
      expect(updatedShip.speed).toBeLessThan(15);
    });

    test('should add a trail point with the correct timestamp', () => {
      const updatedShip = strategy.updateMovement(ship, 1, simulationTime);
      
      // Should add a new trail point
      expect(updatedShip.trail.length).toBe(1);
      
      // Trail point should have the simulation time
      const trailPoint = updatedShip.trail[0];
      expect(trailPoint.timestamp).toEqual(simulationTime);
      expect(trailPoint.latitude).toBe(ship.position.latitude);
      expect(trailPoint.longitude).toBe(ship.position.longitude);
    });

    test('should limit trail length to maximum value', () => {
      // Create a ship with a full trail
      const MAX_TRAIL_LENGTH = 100; // This should match the value in MovementStrategy
      const fullTrail: Partial<ShipTrailPoint>[] = Array(MAX_TRAIL_LENGTH).fill(0).map(() => ({
        timestamp: new Date(),
        latitude: ship.position.latitude,
        longitude: ship.position.longitude
      }));
      
      const shipWithFullTrail: Ship = { ...ship, trail: fullTrail as ShipTrailPoint[] };
      
      const updatedShip = strategy.updateMovement(shipWithFullTrail, 1, simulationTime);
      
      // Trail length should still be MAX_TRAIL_LENGTH
      expect(updatedShip.trail.length).toBe(MAX_TRAIL_LENGTH);
      
      // The newest trail point should have the simulation time
      const newestTrailPoint = updatedShip.trail[updatedShip.trail.length - 1];
      expect(newestTrailPoint.timestamp).toEqual(simulationTime);
    });
  });
});
