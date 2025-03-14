import { Feature, Polygon } from 'geojson';

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate a point at a given distance and bearing from start point using maritime navigation angles.
 * 
 * Maritime Navigation Angle Convention:
 * - 0° points North (up)
 * - 90° points East (right)
 * - 180° points South (down)
 * - 270° points West (left)
 * - Angles increase clockwise
 * 
 * @param startLat - Starting latitude in degrees
 * @param startLon - Starting longitude in degrees
 * @param distance - Distance in nautical miles
 * @param bearing - Bearing in degrees (0-359), using maritime navigation convention
 * @returns [latitude, longitude] in degrees
 */
export function calculateDestination(
  startLat: number,
  startLon: number,
  distance: number,
  bearing: number
): [number, number] {
  const R = 3440.065; // Earth's radius in nautical miles
  const d = distance;
  const brng = toRadians(bearing);
  const lat1 = toRadians(startLat);
  const lon1 = toRadians(startLon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) +
    Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
    Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [toDegrees(lat2), toDegrees(lon2)];
}

/**
 * Calculate distance between two points in nautical miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Finds the center point of a polygon
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @returns [latitude, longitude]
 */
export function findPolygonCenter(coordinates: number[][]): [number, number] {
  const length = coordinates.length;
  const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  const sumLon = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  return [sumLat / length, sumLon / length];
}

/**
 * Find the maximum distance from center to any point in the polygon
 */
function findMaxDistanceFromCenter(center: [number, number], coordinates: number[][]): number {
  const [centerLat, centerLon] = center;
  return Math.max(...coordinates.map(coord => 
    calculateDistance(centerLat, centerLon, coord[1], coord[0])
  ));
}

/**
 * Generates a random point approximately 5 nautical miles outside a polygon
 * @param polygon - GeoJSON polygon feature
 * @returns [latitude, longitude]
 */
export function generateRandomPointOutsidePolygon(polygon: Feature<Polygon>): [number, number] {
  const coordinates = polygon.geometry.coordinates[0];
  const center = findPolygonCenter(coordinates);
  
  // Find maximum distance from center to any point in polygon
  const maxDistance = findMaxDistanceFromCenter(center, coordinates);
  
  // Generate a random bearing (0-359 degrees)
  const bearing = Math.random() * 360;
  
  // Calculate point maxDistance + 5 nautical miles from center
  return calculateDestination(center[0], center[1], maxDistance + 5, bearing);
}

/**
 * Calculate ship movement for a given time interval using maritime navigation angles.
 * Uses the standard maritime navigation convention where:
 * - Ship heading of 0° means moving North
 * - Ship heading of 90° means moving East
 * - Ship heading of 180° means moving South
 * - Ship heading of 270° means moving West
 * 
 * @param currentLat - Current latitude in degrees
 * @param currentLon - Current longitude in degrees
 * @param speed - Speed in knots
 * @param heading - Ship's heading in degrees (0-359), using maritime navigation convention
 * @param minutes - Number of minutes to simulate
 * @returns New position [latitude, longitude]
 */
export function calculateShipMovement(
  currentLat: number,
  currentLon: number,
  speed: number,
  heading: number,
  minutes: number
): [number, number] {
  // Convert speed from knots to nautical miles per minute
  const distanceNM = (speed / 60) * minutes;
  
  // Calculate new position
  return calculateDestination(currentLat, currentLon, distanceNM, heading);
}

/**
 * Calculate new ship heading based on current and demanded course.
 * Uses maritime navigation angle convention (0° = North, clockwise).
 * Standard rate turn is 3 degrees per minute.
 * 
 * @param currentHeading - Current heading in degrees (0-359)
 * @param demandedCourse - Demanded course in degrees (0-359)
 * @param minutes - Time interval in minutes
 * @returns New heading in degrees using maritime navigation convention
 */
export function calculateNewHeading(currentHeading: number, demandedCourse: number | undefined, minutes: number): number {
  if (!demandedCourse) return currentHeading;

  const turnRate = 3; // degrees per minute
  const maxTurn = turnRate * minutes;
  
  // Calculate shortest turn direction
  let diff = demandedCourse - currentHeading;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  // Apply turn, limited by maximum turn rate
  if (Math.abs(diff) <= maxTurn) {
    return demandedCourse;
  }
  return currentHeading + Math.sign(diff) * maxTurn;
}

/**
 * Calculate new ship speed based on current and demanded speed
 * Standard acceleration/deceleration is 1 knot per minute
 * @returns New speed in knots
 */
export function calculateNewSpeed(currentSpeed: number, demandedSpeed: number | undefined, minutes: number): number {
  if (!demandedSpeed) return currentSpeed;

  const speedChangeRate = 1; // knots per minute
  const maxSpeedChange = speedChangeRate * minutes;
  
  const diff = demandedSpeed - currentSpeed;
  
  // Apply speed change, limited by maximum rate
  if (Math.abs(diff) <= maxSpeedChange) {
    return demandedSpeed;
  }
  return currentSpeed + Math.sign(diff) * maxSpeedChange;
}
