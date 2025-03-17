import { Ship, ShipTrailPoint, SimulationTime } from '../types';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { MovementStrategy } from '../simulation/MovementStrategy';
import { CollisionAvoidanceStrategy } from '../simulation/CollisionAvoidanceStrategy';
import * as geoUtils from '../utils/geoUtils';

// Mock strategies for testing
class MockMovementStrategy implements MovementStrategy {
  updateMovement(ship: Ship, _minutes: number, simulationTime?: Date): Ship {
    // Don't update disabled or aground ships
    if (ship.status === 'disabled' || ship.status === 'aground') {
      return ship;
    }
    
    // Simple mock that just moves the ship north by 0.01 degrees
    return {
      ...ship,
      position: {
        latitude: ship.position.latitude + 0.01,
        longitude: ship.position.longitude
      },
      trail: [
        ...ship.trail,
        {
          timestamp: simulationTime || new Date(),
          latitude: ship.position.latitude,
          longitude: ship.position.longitude
        } as ShipTrailPoint
      ]
    };
  }
}

class MockCollisionAvoidanceStrategy implements CollisionAvoidanceStrategy {
  avoidCollisions(ship: Ship, _otherShips: Ship[], landPolygons: Array<[number, number][]>): Ship {
    // Simple mock that sets demandedCourse to 10 degrees if ship is close to land
    const isNearLand = landPolygons.length > 0;
    return {
      ...ship,
      demandedCourse: isNearLand ? 10 : undefined,
      avoidingLand: isNearLand
    };
  }
}

describe('SimulationEngine', () => {
  let engine: SimulationEngine;
  let mockMovementStrategy: MovementStrategy;
  let mockCollisionAvoidanceStrategy: CollisionAvoidanceStrategy;
  let ships: Ship[];
  let landPolygons: Array<[number, number][]>;
  let simulationTime: SimulationTime;

  beforeEach(() => {
    mockMovementStrategy = new MockMovementStrategy();
    mockCollisionAvoidanceStrategy = new MockCollisionAvoidanceStrategy();
    
    // Reset any mocks
    jest.restoreAllMocks();
    
    engine = new SimulationEngine(
      mockMovementStrategy,
      mockCollisionAvoidanceStrategy,
      { maxTrailLength: 10 }
    );
    
    // Create test ships
    ships = [
      {
        id: 'test-ship-1',
        name: 'Test Ship 1',
        color: '#00f',
        type: 'cargo',
        status: 'underway',
        position: {
          latitude: 50.0,
          longitude: -1.0
        },
        heading: 0, // North
        turnRate: 0,
        speed: 10, // 10 knots
        demandedCourse: undefined,
        demandedSpeed: undefined,
        dimensions: {
          length: 100,
          beam: 20,
          draft: 5
        },
        collisionAvoidanceActive: true,
        collisionRisks: [],
        avoidingLand: false,
        trail: [] as ShipTrailPoint[],
      },
      {
        id: 'test-ship-2',
        name: 'Test Ship 2',
        color: '#00f',
        type: 'cargo',
        status: 'underway',
        position: {
          latitude: 51.0,
          longitude: -1.0
        },
        heading: 180, // South
        turnRate: 0,
        speed: 10, // 10 knots
        demandedCourse: undefined,
        demandedSpeed: undefined,
        dimensions: {
          length: 100,
          beam: 20,
          draft: 5
        },
        collisionAvoidanceActive: true,
        collisionRisks: [],
        avoidingLand: false,
        trail: [] as ShipTrailPoint[],
      }
    ];
    
    // Create a simple land polygon
    landPolygons = [
      [
        [-1.1, 50.2], // [lon, lat]
        [-0.9, 50.2],
        [-0.9, 50.1],
        [-1.1, 50.1],
        [-1.1, 50.2], // Close the polygon
      ]
    ];
    
    // Set simulation time
    simulationTime = {
      timestamp: new Date('2025-03-17T12:00:00Z')
    } as SimulationTime;
  });

  describe('updateSimulation', () => {
    test('should update all ships', () => {
      const updatedShips = engine.updateSimulation(ships, [], simulationTime, 1);
      
      // Should return the same number of ships
      expect(updatedShips.length).toBe(ships.length);
      
      // Each ship should be moved (latitude increased by our mock)
      updatedShips.forEach((updatedShip, index) => {
        expect(updatedShip.position.latitude).toBeGreaterThan(ships[index].position.latitude);
      });
    });

    test('should apply collision avoidance', () => {
      const updatedShips = engine.updateSimulation(ships, landPolygons, simulationTime, 1);
      
      // Ships should have avoidance applied due to land
      updatedShips.forEach(ship => {
        expect(ship.avoidingLand).toBe(true);
        expect(ship.demandedCourse).toBe(10); // From our mock
      });
    });

    test('should detect ships aground', () => {
      // Position a ship inside a land polygon
      const shipInLand: Ship = {
        ...ships[0],
        position: {
          latitude: 50.15, // Inside the land polygon
          longitude: -1.0
        },
        status: 'underway' // Make sure it starts as underway
      };
      
      // Mock the isPointInPolygon function to return true for our test ship
      jest.spyOn(geoUtils, 'isPointInPolygon').mockReturnValue(true);
      
      const updatedShips = engine.updateSimulation([shipInLand], landPolygons, simulationTime, 1);
      
      // Ship should be marked as aground
      expect(updatedShips[0].status).toBe('aground');
      
      // Verify the isPointInPolygon function was called
      expect(geoUtils.isPointInPolygon).toHaveBeenCalled();
    });

    test('should not update disabled ships', () => {
      // Create a disabled ship
      const disabledShip: Ship = {
        ...ships[0],
        status: 'disabled'
      };
      
      // Spy on the movement strategy to verify it's not called for disabled ships
      const updateMovementSpy = jest.spyOn(mockMovementStrategy, 'updateMovement');
      
      const updatedShips = engine.updateSimulation([disabledShip], landPolygons, simulationTime, 1);
      
      // Position should not change for disabled ship
      expect(updatedShips[0].position.latitude).toBe(disabledShip.position.latitude);
      expect(updatedShips[0].position.longitude).toBe(disabledShip.position.longitude);
      
      // The movement strategy should still be called, but our mock implementation
      // should return the ship unchanged
      expect(updateMovementSpy).toHaveBeenCalled();
    });

    test('should pass simulation time to movement strategy', () => {
      // Create a spy on the mock movement strategy
      const updateMovementSpy = jest.spyOn(mockMovementStrategy, 'updateMovement');
      
      engine.updateSimulation(ships, [], simulationTime, 1);
      
      // Check that the simulation time was passed to the movement strategy
      expect(updateMovementSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        simulationTime.timestamp
      );
    });

    test('should limit trail length to configured maximum', () => {
      // Create a ship with a trail longer than the configured maximum
      const MAX_TRAIL_LENGTH = 10; // From engine config
      
      // Create a ship with exactly MAX_TRAIL_LENGTH trail points
      // The movement strategy will add one more point, which should trigger the limit
      const longTrail: Partial<ShipTrailPoint>[] = Array(MAX_TRAIL_LENGTH).fill(0).map(() => ({
        timestamp: new Date(),
        latitude: ships[0].position.latitude,
        longitude: ships[0].position.longitude
      }));
      
      const shipWithLongTrail: Ship = {
        ...ships[0],
        trail: longTrail as ShipTrailPoint[]
      };
      
      // Override the mock movement strategy for this test to ensure it adds exactly one trail point
      jest.spyOn(mockMovementStrategy, 'updateMovement').mockImplementationOnce((ship) => {
        return {
          ...ship,
          trail: [
            ...ship.trail,
            {
              timestamp: new Date(),
              latitude: ship.position.latitude,
              longitude: ship.position.longitude
            } as ShipTrailPoint
          ]
        };
      });
      
      const updatedShips = engine.updateSimulation([shipWithLongTrail], [], simulationTime, 1);
      
      // Trail should be limited to the configured maximum
      expect(updatedShips[0].trail.length).toBeLessThanOrEqual(MAX_TRAIL_LENGTH);
    });
  });
});
