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
 * Calculate new ship heading and turn rate based on current state and demanded course.
 * Uses maritime navigation angle convention (0° = North, clockwise).
 * Maximum turn rate is 3 degrees per minute with acceleration/deceleration.
 * 
 * @param currentHeading - Current heading in degrees (0-359)
 * @param currentTurnRate - Current turn rate in degrees per minute
 * @param demandedCourse - Demanded course in degrees (0-359)
 * @param minutes - Time interval in minutes
 * @returns [newHeading, newTurnRate] in degrees and degrees per minute
 */
export function calculateNewHeading(
  currentHeading: number,
  currentTurnRate: number,
  demandedCourse: number | undefined,
  minutes: number
): [number, number] { // Returns [newHeading, newTurnRate]
  if (!demandedCourse) {
    // If no demanded course, gradually reduce turn rate
    if (currentTurnRate === 0) return [currentHeading, 0];
    
    const turnDeceleration = 1.0; // degrees per second^2
    const newTurnRate = Math.abs(currentTurnRate) <= turnDeceleration * minutes * 60 
      ? 0 
      : currentTurnRate - Math.sign(currentTurnRate) * turnDeceleration * minutes * 60;
    
    return [(currentHeading + newTurnRate * minutes + 360) % 360, newTurnRate];
  }

  // Calculate shortest turn direction
  let diff = demandedCourse - currentHeading;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  // Maximum turn rate is 3 degrees per minute
  const maxTurnRate = 3.0;
  const turnAcceleration = 0.5; // degrees per second^2

  // Calculate target turn rate
  const targetTurnRate = Math.sign(diff) * Math.min(maxTurnRate, Math.abs(diff) / minutes);
  
  // Accelerate or decelerate turn rate
  const turnRateDiff = targetTurnRate - currentTurnRate;
  const maxRateChange = turnAcceleration * minutes * 60; // Convert to per minute
  const turnRateChange = Math.sign(turnRateDiff) * Math.min(Math.abs(turnRateDiff), maxRateChange);
  const newTurnRate = currentTurnRate + turnRateChange;

  // Calculate new heading
  const newHeading = (currentHeading + newTurnRate * minutes + 360) % 360;

  // If we've reached or overshot the demanded course, return demanded course and zero turn rate
  if ((diff > 0 && newHeading >= demandedCourse) ||
      (diff < 0 && newHeading <= demandedCourse)) {
    return [demandedCourse, 0];
  }

  return [newHeading, newTurnRate];
}

/**
 * Calculate new ship speed based on current and demanded speed
 * Standard acceleration/deceleration is 1 knot per minute
 * @returns New speed in knots
 */
/**
 * Generates a random point at a specified distance from a center point
 * @param centerLat - Center latitude in degrees
 * @param centerLon - Center longitude in degrees
 * @param distance - Distance in nautical miles
 * @returns [latitude, longitude]
 */
export function generateRandomPointAtDistance(
  centerLat: number,
  centerLon: number,
  distance: number
): [number, number] {
  // Generate a random bearing (0-359 degrees)
  const bearing = Math.random() * 360;
  
  // Calculate point at specified distance from center
  return calculateDestination(centerLat, centerLon, distance, bearing);
}

/**
 * Check if a point lies within a cone defined by its apex, heading, radius, and angle
 * @param apexLat - Latitude of cone apex
 * @param apexLon - Longitude of cone apex
 * @param heading - Direction cone is pointing (0-359 degrees)
 * @param radius - Radius of cone in nautical miles
 * @param angle - Half-angle of cone in degrees
 * @param pointLat - Latitude of point to check
 * @param pointLon - Longitude of point to check
 * @returns boolean indicating if point is in cone
 */
export function isPointInCone(
  apexLat: number,
  apexLon: number,
  heading: number,
  radius: number,
  angle: number,
  pointLat: number,
  pointLon: number
): boolean {
  // Calculate distance from apex to point
  const distance = calculateDistance(apexLat, apexLon, pointLat, pointLon);
  if (distance > radius) return false;

  // Calculate bearing from apex to point
  const φ1 = toRadians(apexLat);
  const φ2 = toRadians(pointLat);
  const Δλ = toRadians(pointLon - apexLon);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let bearing = toDegrees(Math.atan2(y, x));
  if (bearing < 0) bearing += 360;

  // Calculate angular difference from heading to bearing
  let diff = Math.abs(bearing - heading);
  if (diff > 180) diff = 360 - diff;

  return diff <= angle;
}

/**
 * Check if there are any ships in a cone ahead of a given ship
 * @param shipLat - Ship's latitude
 * @param shipLon - Ship's longitude
 * @param heading - Ship's heading
 * @param speed - Ship's speed in knots
 * @param otherShips - Array of other ships with position, heading, and speed
 * @param coneRadius - Radius of cone in nautical miles
 * @param coneAngle - Half-angle of cone in degrees
 * @returns boolean indicating if cone is clear
 */
interface CollisionPoint {
  latitude: number;
  longitude: number;
  timeToCollision: number; // minutes
}

interface CollisionRisk {
  shipId: string;
  bearing: number;
  distance: number;
  relativeSpeed: number;
  collisionPoint?: CollisionPoint;
}

/**
 * Check for potential collision risks with other ships
 * @returns Array of collision risks with details
 */
/**
 * Calculate the predicted collision point between two ships
 */
export function calculateCollisionPoint(
  ship1Lat: number,
  ship1Lon: number,
  ship1Heading: number,
  ship1Speed: number,
  ship2Lat: number,
  ship2Lon: number,
  ship2Heading: number,
  ship2Speed: number
): CollisionPoint | undefined {
  // Convert speeds from knots to nm/minute
  const speed1 = ship1Speed / 60;
  const speed2 = ship2Speed / 60;

  // Calculate velocities in nm/minute
  const v1x = speed1 * Math.sin(toRadians(ship1Heading));
  const v1y = speed1 * Math.cos(toRadians(ship1Heading));
  const v2x = speed2 * Math.sin(toRadians(ship2Heading));
  const v2y = speed2 * Math.cos(toRadians(ship2Heading));

  // Relative velocity
  const vx = v2x - v1x;
  const vy = v2y - v1y;

  // Convert positions to nm using simple flat earth approximation (good enough for small distances)
  const lat1 = ship1Lat;
  const lon1 = ship1Lon;
  const lat2 = ship2Lat;
  const lon2 = ship2Lon;

  const dx = (lon2 - lon1) * 60 * Math.cos(toRadians((lat1 + lat2) / 2));
  const dy = (lat2 - lat1) * 60;

  // Solve quadratic equation for time to closest point of approach (CPA)
  const a = vx * vx + vy * vy;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;

  // If ships aren't moving relative to each other, no collision
  if (Math.abs(a) < 1e-10) return undefined;

  // Solve quadratic equation at^2 + bt + c = 0
  // Discriminant b^2 - 4ac tells us if there's a real solution
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return undefined; // No real solutions

  // Time to closest point of approach (CPA)
  // Using -b/(2a) which gives us the time of minimum separation
  const t = -b / (2 * a); // Time to CPA in minutes

  // If time is negative, ships are moving apart
  if (t < 0) return undefined;

  // Calculate CPA position
  const cpaLon = lon1 + (v1x * t) / (60 * Math.cos(toRadians(lat1)));
  const cpaLat = lat1 + (v1y * t) / 60;

  // Calculate distance at CPA
  const cpaDistance = calculateDistance(lat1, lon1, cpaLat, cpaLon);

  // If ships will pass more than 0.5nm apart, not considered a collision
  if (cpaDistance > 0.5) return undefined;

  return {
    latitude: cpaLat,
    longitude: cpaLon,
    timeToCollision: t
  };
}

export function findCollisionRisks(
  shipId: string,
  shipLat: number,
  shipLon: number,
  heading: number,
  speed: number,
  otherShips: Array<{ id: string; latitude: number; longitude: number; heading: number; speed: number }>
): CollisionRisk[] {
  return otherShips
    .filter(other => other.id !== shipId) // Don't check collision with self
    .map(other => {
      const bearing = calculateBearing(shipLat, shipLon, other.latitude, other.longitude);
      const relativeBearing = Math.abs(bearing - heading);
      const distance = calculateDistance(shipLat, shipLon, other.latitude, other.longitude);
      
      // Calculate relative speed (negative means closing)
      const relativeSpeed = speed * Math.cos(toRadians(relativeBearing)) - 
                           other.speed * Math.cos(toRadians(Math.abs(bearing - other.heading)));
      
      // Calculate potential collision point
      const collisionPoint = calculateCollisionPoint(
        shipLat,
        shipLon,
        heading,
        speed,
        other.latitude,
        other.longitude,
        other.heading,
        other.speed
      );

      return {
        shipId: other.id,
        bearing,
        distance,
        relativeSpeed,
        collisionPoint
      };
    })
    .filter(risk => 
      risk.distance < 4 && // Within 4nm
      Math.abs(risk.bearing - heading) <= 90 && // Roughly ahead
      risk.relativeSpeed < 0 // Converging
    );
}

export function isConeBlocked(
  shipLat: number,
  shipLon: number,
  heading: number,
  speed: number,
  otherShips: Array<{ latitude: number; longitude: number; heading: number; speed: number }>,
  coneRadius: number = 2,
  coneAngle: number = 15
): boolean {
  return otherShips.some(other => {
    // First check if the other ship is roughly ahead of us
    const bearing = calculateBearing(shipLat, shipLon, other.latitude, other.longitude);
    const relativeBearing = Math.abs(bearing - heading);
    if (relativeBearing > 90) return false; // Ship is behind us

    // Calculate relative speed (negative means closing)
    const relativeSpeed = speed * Math.cos(toRadians(relativeBearing)) - 
                         other.speed * Math.cos(toRadians(Math.abs(bearing - other.heading)));
    if (relativeSpeed >= 0) return false; // Ships are moving apart

    // Only then check if it's in our cone
    return isPointInCone(
      shipLat,
      shipLon,
      heading,
      coneRadius,
      coneAngle,
      other.latitude,
      other.longitude
    );
  });
}

/**
 * Find a clear heading by checking cones at increasing angles to starboard
 * @param shipLat - Ship's latitude
 * @param shipLon - Ship's longitude
 * @param currentHeading - Ship's current heading
 * @param otherShips - Array of positions to check
 * @returns Clear heading or undefined if no clear heading found
 */
export function findClearHeading(
  shipLat: number,
  shipLon: number,
  currentHeading: number,
  speed: number,
  otherShips: Array<{ latitude: number; longitude: number; heading: number; speed: number }>
): number | undefined {
  // Calculate bearing to each ship
  const bearings = otherShips.map(other => ({
    bearing: calculateBearing(shipLat, shipLon, other.latitude, other.longitude),
    distance: calculateDistance(shipLat, shipLon, other.latitude, other.longitude)
  }));

  // If no ships are within 4nm, no need to change course
  if (!bearings.some(b => b.distance < 4)) {
    return undefined;
  }

  // Check current heading first
  if (!isConeBlocked(shipLat, shipLon, currentHeading, speed, otherShips)) {
    return currentHeading;
  }

  // Try increasingly larger turns to starboard (10 degree increments)
  for (let turn = 10; turn <= 180; turn += 10) {
    const newHeading = (currentHeading + turn) % 360;
    if (!isConeBlocked(shipLat, shipLon, newHeading, speed, otherShips)) {
      return newHeading;
    }
  }

  return undefined; // No clear heading found
}

/**
 * Calculate bearing from point 1 to point 2 using maritime navigation angles
 * @returns Bearing in degrees (0-359)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let bearing = toDegrees(Math.atan2(y, x));
  if (bearing < 0) bearing += 360;

  return bearing;
}

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
