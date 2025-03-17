import { Ship, ShipTrailPoint } from '../types';
import { BehaviorBasedCollisionAvoidance } from '../simulation/BehaviorBasedCollisionAvoidance';

describe('BehaviorBasedCollisionAvoidance', () => {
  let avoidanceStrategy: BehaviorBasedCollisionAvoidance;
  let ship: Ship;
  let otherShips: Ship[];
  let landPolygons: Array<[number, number][]>;

  beforeEach(() => {
    avoidanceStrategy = new BehaviorBasedCollisionAvoidance();
    
    // Create a basic ship for testing
    ship = {
      id: 'test-ship-1',
      name: 'Test Ship 1',
      type: 'cargo',
      status: 'underway',
      color: '#ff0000',
      position: {
        latitude: 50.0,
        longitude: -1.0,
      },
      heading: 0, // North
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
    
    // Create other ships for collision testing
    otherShips = [
      {
        id: 'test-ship-2',
        name: 'Test Ship 2',
        color: '#ffaadd',
        type: 'cargo',
        status: 'underway',
        position: {
          latitude: 50.1, // North of test-ship-1
          longitude: -1.0,
        },
        heading: 180, // South (heading towards test-ship-1)
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
  });

  describe('avoidCollisions', () => {
    test('should not modify disabled ships', () => {
      const disabledShip: Ship = { ...ship, status: 'disabled' };
      const updatedShip = avoidanceStrategy.avoidCollisions(disabledShip, otherShips, landPolygons);
      
      // Should return the ship unchanged
      expect(updatedShip).toEqual(disabledShip);
    });

    test('should not modify aground ships', () => {
      const agroundShip: Ship = { ...ship, status: 'aground' };
      const updatedShip = avoidanceStrategy.avoidCollisions(agroundShip, otherShips, landPolygons);
      
      // Should return the ship unchanged
      expect(updatedShip).toEqual(agroundShip);
    });

    test('should not modify ships with collision avoidance disabled', () => {
      const noAvoidanceShip = { ...ship, collisionAvoidanceActive: false };
      const updatedShip = avoidanceStrategy.avoidCollisions(noAvoidanceShip, otherShips, landPolygons);
      
      // Should return the ship unchanged
      expect(updatedShip).toEqual(noAvoidanceShip);
    });

    test('should detect collision risk with oncoming ship', () => {
      // Position ships for a head-on collision
      const updatedShip = avoidanceStrategy.avoidCollisions(
        { ...ship, position: { latitude: 50.0, longitude: -1.0 }, heading: 0 }, // Heading north
        [{ ...otherShips[0], position: { latitude: 50.03, longitude: -1.0 }, heading: 180 }], // Heading south, close by
        []
      );
      
      // Should detect collision risk
      expect(updatedShip.collisionRisks.length).toBeGreaterThan(0);
      
      // Should reduce speed
      expect(updatedShip.demandedSpeed).toBeLessThan(ship.speed);
      
      // Should change course to avoid collision
      expect(updatedShip.demandedCourse).toBeDefined();
      expect(updatedShip.demandedCourse).not.toEqual(ship.heading);
    });

    test('should detect land ahead and change course', () => {
      // Position ship heading towards land
      const shipHeadingToLand = {
        ...ship,
        latitude: 50.05, // Just south of the land polygon
        longitude: -1.0,
        heading: 0 // Heading north, towards land
      };
      
      const updatedShip = avoidanceStrategy.avoidCollisions(
        shipHeadingToLand,
        [],
        landPolygons
      );
      
      // Should detect land ahead
      expect(updatedShip.avoidingLand).toBe(true);
      
      // Should change course to avoid land
      expect(updatedShip.demandedCourse).toBeDefined();
      expect(updatedShip.demandedCourse).not.toEqual(shipHeadingToLand.heading);
    });

    test('should store normal speed when reducing speed for collision avoidance', () => {
      // Ship with a demanded speed already set
      const shipWithDemandedSpeed = {
        ...ship,
        demandedSpeed: 15 // Higher than current speed
      };
      
      // Position ships for a collision
      const updatedShip = avoidanceStrategy.avoidCollisions(
        shipWithDemandedSpeed,
        [{ ...otherShips[0], position: { latitude: 50.03, longitude: -1.0 }, heading: 180 }], // Heading south, close by
        []
      );
      
      // Should store the original demanded speed
      expect(updatedShip.normalSpeed).toBe(15);
      
      // Should reduce speed for collision avoidance
      expect(updatedShip.demandedSpeed).toBeLessThan(15);
    });

    test('should return to normal speed when collision risk clears', () => {
      // Ship that was previously avoiding a collision
      const avoidingShip = {
        ...ship,
        demandedSpeed: 6.67, // Reduced speed (2/3 of 10)
        normalSpeed: 10, // Original speed
        collisionRisks: [{ shipId: 'test-ship-2', bearing: 0, distance: 1, relativeSpeed: -20 }]
      };
      
      // No ships nearby now
      const updatedShip = avoidanceStrategy.avoidCollisions(
        avoidingShip,
        [], // No other ships
        []  // No land
      );
      
      // Should clear collision risks
      expect(updatedShip.collisionRisks.length).toBe(0);
      
      // Should return to normal speed
      expect(updatedShip.demandedSpeed).toBe(10);
      
      // Should clear the stored normal speed
      expect(updatedShip.normalSpeed).toBeUndefined();
    });

    test('should set avoidance reason when avoiding collision', () => {
      // Position ships for a collision
      const updatedShip = avoidanceStrategy.avoidCollisions(
        ship,
        [{ ...otherShips[0], position: { latitude: 50.03, longitude: -1.0 }, heading: 180 }], // Heading south, close by
        []
      );
      
      // Should set avoidance reason
      expect(updatedShip.avoidanceReason).toBeDefined();
    });
  });
});
