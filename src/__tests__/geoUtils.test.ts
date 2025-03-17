import {
  calculateDestination,
  calculateDistance,
  calculateNewHeading,
  calculateNewSpeed,
  calculateShipMovement,
  isPointInCone,
  isPointInPolygon,
  isConeIntersectingPolygon,
  findClearHeading,
  findCollisionRisks
} from '../utils/geoUtils';

describe('Geographic Utility Functions', () => {
  describe('calculateDestination', () => {
    test('should calculate a point north of the starting point', () => {
      const [lat, lon] = calculateDestination(50.0, -1.0, 1, 0);
      expect(lat).toBeGreaterThan(50.0);
      expect(lon).toBeCloseTo(-1.0, 4);
    });

    test('should calculate a point east of the starting point', () => {
      const [lat, lon] = calculateDestination(50.0, -1.0, 1, 90);
      expect(lat).toBeCloseTo(50.0, 4);
      expect(lon).toBeGreaterThan(-1.0);
    });

    test('should calculate a point at the correct distance', () => {
      const startLat = 50.0;
      const startLon = -1.0;
      const [endLat, endLon] = calculateDestination(startLat, startLon, 5, 45);
      const distance = calculateDistance(startLat, startLon, endLat, endLon);
      expect(distance).toBeCloseTo(5, 1);
    });
  });

  describe('calculateDistance', () => {
    test('should calculate zero distance for the same point', () => {
      const distance = calculateDistance(50.0, -1.0, 50.0, -1.0);
      expect(distance).toBe(0);
    });

    test('should calculate correct distance between two points', () => {
      // Portsmouth to Isle of Wight is approximately 5 nautical miles
      const distance = calculateDistance(50.8, -1.1, 50.7, -1.3);
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(6);
    });
  });

  describe('calculateNewHeading', () => {
    test('should maintain current heading when no demanded course is set', () => {
      const [newHeading, newTurnRate] = calculateNewHeading(90, 0, undefined, 1);
      expect(newHeading).toBe(90);
      expect(newTurnRate).toBe(0);
    });

    test('should turn towards demanded course', () => {
      // Starting at 0 degrees, turning to 10 degrees
      const [newHeading, newTurnRate] = calculateNewHeading(0, 0, 10, 1);
      expect(newHeading).toBeGreaterThan(0);
      expect(newHeading).toBeLessThan(10);
      expect(newTurnRate).toBeGreaterThan(0);
    });

    test('should handle crossing 0/360 boundary', () => {
      // Starting at 350 degrees, turning to 10 degrees
      const [newHeading, newTurnRate] = calculateNewHeading(350, 0, 10, 1);
      // Should turn clockwise (increase heading)
      expect(newHeading).toBeGreaterThan(350);
      expect(newTurnRate).toBeGreaterThan(0);
    });

    test('should limit turn rate to maximum value', () => {
      // Large course change that would exceed max turn rate
      const [newHeading, newTurnRate] = calculateNewHeading(0, 0, 180, 1);
      // Max turn rate is 3 degrees per minute
      expect(Math.abs(newTurnRate)).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateNewSpeed', () => {
    test('should maintain current speed when no demanded speed is set', () => {
      const newSpeed = calculateNewSpeed(10, undefined, 1);
      expect(newSpeed).toBe(10);
    });

    test('should accelerate towards demanded speed', () => {
      const newSpeed = calculateNewSpeed(10, 15, 1);
      expect(newSpeed).toBeGreaterThan(10);
      expect(newSpeed).toBeLessThan(15);
    });

    test('should decelerate towards demanded speed', () => {
      const newSpeed = calculateNewSpeed(15, 10, 1);
      expect(newSpeed).toBeLessThan(15);
      expect(newSpeed).toBeGreaterThan(10);
    });

    test('should limit acceleration to maximum value', () => {
      // Large speed change that would exceed max acceleration
      const newSpeed = calculateNewSpeed(0, 30, 1);
      // Max acceleration is 2 knots per minute
      expect(newSpeed).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateShipMovement', () => {
    test('should not move when speed is zero', () => {
      const [newLat, newLon] = calculateShipMovement(50.0, -1.0, 0, 90, 1);
      expect(newLat).toBe(50.0);
      expect(newLon).toBe(-1.0);
    });

    test('should move in the correct direction', () => {
      // Moving north at 10 knots for 1 minute
      const [newLat, newLon] = calculateShipMovement(50.0, -1.0, 10, 0, 1);
      expect(newLat).toBeGreaterThan(50.0);
      expect(newLon).toBeCloseTo(-1.0, 4);

      // Moving east at 10 knots for 1 minute
      const [eastLat, eastLon] = calculateShipMovement(50.0, -1.0, 10, 90, 1);
      expect(eastLat).toBeCloseTo(50.0, 4);
      expect(eastLon).toBeGreaterThan(-1.0);
    });

    test('should move the correct distance', () => {
      // 10 knots for 6 minutes = 1 nautical mile
      const startLat = 50.0;
      const startLon = -1.0;
      const [endLat, endLon] = calculateShipMovement(startLat, startLon, 10, 45, 6);
      const distance = calculateDistance(startLat, startLon, endLat, endLon);
      expect(distance).toBeCloseTo(1, 1);
    });
  });

  describe('isPointInCone', () => {
    test('should return true for a point directly ahead within radius', () => {
      const apexLat = 50.0;
      const apexLon = -1.0;
      const heading = 0; // North
      const radius = 2; // 2 nautical miles
      const angle = 15; // 15 degrees half-angle

      // Point 1 nautical mile directly north
      const [pointLat, pointLon] = calculateDestination(apexLat, apexLon, 1, 0);
      
      const result = isPointInCone(
        apexLat, apexLon, heading, radius, angle, pointLat, pointLon
      );
      
      expect(result).toBe(true);
    });

    test('should return false for a point outside the radius', () => {
      const apexLat = 50.0;
      const apexLon = -1.0;
      const heading = 0; // North
      const radius = 2; // 2 nautical miles
      const angle = 15; // 15 degrees half-angle

      // Point 3 nautical miles directly north (beyond radius)
      const [pointLat, pointLon] = calculateDestination(apexLat, apexLon, 3, 0);
      
      const result = isPointInCone(
        apexLat, apexLon, heading, radius, angle, pointLat, pointLon
      );
      
      expect(result).toBe(false);
    });

    test('should return false for a point outside the angle', () => {
      const apexLat = 50.0;
      const apexLon = -1.0;
      const heading = 0; // North
      const radius = 2; // 2 nautical miles
      const angle = 15; // 15 degrees half-angle

      // Point 1 nautical mile at 20 degrees (outside cone angle)
      const [pointLat, pointLon] = calculateDestination(apexLat, apexLon, 1, 20);
      
      const result = isPointInCone(
        apexLat, apexLon, heading, radius, angle, pointLat, pointLon
      );
      
      expect(result).toBe(false);
    });
  });

  describe('isPointInPolygon', () => {
    test('should return true for a point inside a polygon', () => {
      // Simple square polygon
      const polygon: [number, number][] = [
        [-1.1, 50.1], // [lon, lat]
        [-0.9, 50.1],
        [-0.9, 49.9],
        [-1.1, 49.9],
        [-1.1, 50.1], // Close the polygon
      ];

      // Point inside the square
      const point: [number, number] = [-1.0, 50.0]; // [lon, lat]
      
      expect(isPointInPolygon(point, polygon)).toBe(true);
    });

    test('should return false for a point outside a polygon', () => {
      // Simple square polygon
      const polygon: [number, number][] = [
        [-1.1, 50.1], // [lon, lat]
        [-0.9, 50.1],
        [-0.9, 49.9],
        [-1.1, 49.9],
        [-1.1, 50.1], // Close the polygon
      ];

      // Point outside the square
      const point: [number, number] = [-1.2, 50.0]; // [lon, lat]
      
      expect(isPointInPolygon(point, polygon)).toBe(false);
    });
  });

  describe('isConeIntersectingPolygon', () => {
    test('should return true when cone intersects polygon', () => {
      // Simple square polygon
      const polygon: [number, number][] = [
        [-1.1, 50.1], // [lon, lat]
        [-0.9, 50.1],
        [-0.9, 49.9],
        [-1.1, 49.9],
        [-1.1, 50.1], // Close the polygon
      ];

      // Cone pointing towards the polygon
      const apexLat = 50.2;
      const apexLon = -1.0;
      const heading = 180; // South, towards the polygon
      const radius = 2; // 2 nautical miles
      const angle = 15; // 15 degrees half-angle
      
      expect(isConeIntersectingPolygon(
        apexLat, apexLon, heading, radius, angle, polygon
      )).toBe(true);
    });

    test('should return false when cone does not intersect polygon', () => {
      // Simple square polygon
      const polygon: [number, number][] = [
        [-1.1, 50.1], // [lon, lat]
        [-0.9, 50.1],
        [-0.9, 49.9],
        [-1.1, 49.9],
        [-1.1, 50.1], // Close the polygon
      ];

      // Cone pointing away from the polygon
      const apexLat = 50.2;
      const apexLon = -1.0;
      const heading = 0; // North, away from the polygon
      const radius = 2; // 2 nautical miles
      const angle = 15; // 15 degrees half-angle
      
      expect(isConeIntersectingPolygon(
        apexLat, apexLon, heading, radius, angle, polygon
      )).toBe(false);
    });
  });
});
