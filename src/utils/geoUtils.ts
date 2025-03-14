import { Feature, Polygon } from 'geojson';
import * as turf from '@turf/turf';



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
  const start = turf.point([startLon, startLat]);
  // turf.destination expects kilometers, convert from nautical miles
  const dest = turf.destination(start, distance * 1.852, bearing);
  const coords = dest.geometry.coordinates;
  return [coords[1], coords[0]];
}

/**
 * Calculate distance between two points in nautical miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  // turf.distance returns kilometers, convert to nautical miles
  return turf.distance(from, to) / 1.852;
}

/**
 * Finds the center point of a polygon
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @returns [latitude, longitude]
 */
export function findPolygonCenter(coordinates: number[][]): [number, number] {
  // Ensure polygon coordinates are closed
  const closedCoords = [...coordinates];
  if (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]) {
    closedCoords.push(closedCoords[0]);
  }
  
  const polygon = turf.polygon([closedCoords]);
  const center = turf.centroid(polygon);
  const coords = center.geometry.coordinates;
  return [coords[1], coords[0]];
}

/**
 * Find the maximum distance from center to any point in the polygon
 */
function findMaxDistanceFromCenter(center: [number, number], coordinates: number[][]): number {
  // Ensure polygon coordinates are closed
  const closedCoords = [...coordinates];
  if (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]) {
    closedCoords.push(closedCoords[0]);
  }
  
  const centerPoint = turf.point([center[1], center[0]]);
  const polygon = turf.polygon([closedCoords]);
  // Convert km to nautical miles
  return turf.pointToPolygonDistance(centerPoint, polygon) / 1.852;
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
  const start = turf.point([currentLon, currentLat]);
  // Convert speed from knots to kilometers per minute, then multiply by minutes
  const distanceKm = (speed * 1.852 / 60) * minutes;
  const end = turf.destination(start, distanceKm, heading);
  const coords = end.geometry.coordinates;
  return [coords[1], coords[0]];
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
  const apex = turf.point([apexLon, apexLat]);
  const point = turf.point([pointLon, pointLat]);
  
  // Check if point is within radius
  const distanceKm = turf.distance(apex, point);
  if (distanceKm > radius * 1.852) return false;
  
  // Calculate bearing from apex to point
  const bearing = (turf.bearing(apex, point) + 360) % 360;
  
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
  const ship1 = turf.point([ship1Lon, ship1Lat]);
  const ship2 = turf.point([ship2Lon, ship2Lat]);
  
  // Convert speeds from knots to km/minute
  const speed1Km = (ship1Speed * 1.852) / 60;
  const speed2Km = (ship2Speed * 1.852) / 60;
  
  // Calculate future positions after 1 minute
  const ship1Future = turf.destination(ship1, speed1Km, ship1Heading);
  const ship2Future = turf.destination(ship2, speed2Km, ship2Heading);
  
  // Create lines representing ship paths
  const ship1Line = turf.lineString([ship1.geometry.coordinates, ship1Future.geometry.coordinates]);
  const ship2Line = turf.lineString([ship2.geometry.coordinates, ship2Future.geometry.coordinates]);
  
  // Find intersection of paths
  const intersection = turf.lineIntersect(ship1Line, ship2Line);
  
  if (intersection.features.length === 0) return undefined;
  
  // Get intersection point
  const intersectPoint = intersection.features[0].geometry.coordinates;
  
  // Calculate time to intersection for both ships
  const dist1 = turf.distance(ship1, turf.point(intersectPoint));
  const dist2 = turf.distance(ship2, turf.point(intersectPoint));
  
  const time1 = (dist1 / speed1Km) * 60; // Convert back to minutes
  const time2 = (dist2 / speed2Km) * 60;
  
  // If times are too different, ships won't collide
  if (Math.abs(time1 - time2) > 5) return undefined;
  
  // Use average time as collision time
  const timeToCollision = (time1 + time2) / 2;
  
  // If collision point is too far (> 0.5nm), not considered a collision
  const distanceNM = turf.distance(ship1, turf.point(intersectPoint)) / 1.852;
  if (distanceNM > 0.5) return undefined;
  
  return {
    latitude: intersectPoint[1],
    longitude: intersectPoint[0],
    timeToCollision
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
  const ship = turf.point([shipLon, shipLat]);
  
  return otherShips
    .filter(other => other.id !== shipId) // Don't check collision with self
    .map(other => {
      const otherPoint = turf.point([other.longitude, other.latitude]);
      const bearing = (turf.bearing(ship, otherPoint) + 360) % 360;
      const distance = turf.distance(ship, otherPoint) / 1.852; // Convert to nautical miles
      
      // Calculate relative speed (negative means closing)
      const bearingRad = (bearing * Math.PI) / 180;
      const headingRad = (heading * Math.PI) / 180;
      const otherHeadingRad = (other.heading * Math.PI) / 180;
      
      const relativeSpeed = speed * Math.cos(bearingRad - headingRad) - 
                           other.speed * Math.cos(bearingRad - otherHeadingRad);
      
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
  const ship = turf.point([shipLon, shipLat]);
  
  return otherShips.some(other => {
    const otherPoint = turf.point([other.longitude, other.latitude]);
    const bearing = (turf.bearing(ship, otherPoint) + 360) % 360;
    const relativeBearing = Math.abs(bearing - heading);
    if (relativeBearing > 90) return false; // Ship is behind us

    // Calculate relative speed (negative means closing)
    const bearingRad = (bearing * Math.PI) / 180;
    const headingRad = (heading * Math.PI) / 180;
    const otherHeadingRad = (other.heading * Math.PI) / 180;
    
    const relativeSpeed = speed * Math.cos(bearingRad - headingRad) - 
                         other.speed * Math.cos(bearingRad - otherHeadingRad);
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
 * Check if a point is inside a polygon
 * @param point - [longitude, latitude] coordinates
 * @param polygon - Array of [longitude, latitude] coordinates forming a polygon
 * @returns boolean indicating if point is inside polygon
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const turfPoint = turf.point([point[0], point[1]]);
  
  // Ensure polygon coordinates are closed
  const closedPolygon = [...polygon];
  if (closedPolygon[0][0] !== closedPolygon[closedPolygon.length - 1][0] ||
      closedPolygon[0][1] !== closedPolygon[closedPolygon.length - 1][1]) {
    closedPolygon.push(closedPolygon[0]);
  }
  
  const turfPolygon = turf.polygon([closedPolygon]);
  return turf.booleanPointInPolygon(turfPoint, turfPolygon);
}

/**
 * Check if a cone intersects with a polygon
 * @param apexLat - Latitude of cone apex
 * @param apexLon - Longitude of cone apex
 * @param heading - Direction cone is pointing (0-359 degrees)
 * @param radius - Radius of cone in nautical miles
 * @param angle - Half-angle of cone in degrees
 * @param polygon - Array of [longitude, latitude] coordinates forming a polygon
 * @returns boolean indicating if cone intersects polygon
 */
export function isConeIntersectingPolygon(
  apexLat: number,
  apexLon: number,
  heading: number,
  radius: number,
  angle: number,
  polygon: [number, number][]
): boolean {
  // Ensure polygon coordinates are closed (first and last points are the same)
  const closedPolygon = [...polygon];
  if (closedPolygon[0][0] !== closedPolygon[closedPolygon.length - 1][0] ||
      closedPolygon[0][1] !== closedPolygon[closedPolygon.length - 1][1]) {
    closedPolygon.push(closedPolygon[0]);
  }
  
  // Create the polygon feature
  const turfPolygon = turf.polygon([closedPolygon]);
  
  // Create a point for the apex
  const apex = turf.point([apexLon, apexLat]);
  
  // Check if apex is inside polygon
  if (turf.booleanPointInPolygon(apex, turfPolygon)) return true;
  
  // Create the cone as a sector
  const leftHeading = (heading - angle + 360) % 360;
  const rightHeading = (heading + angle + 360) % 360;
  
  // Convert radius to kilometers for turf
  const radiusKm = radius * 1.852;
  
  // Create an arc between the edges with more points for better accuracy
  const numPoints = 20;
  const arcPoints: [number, number][] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const bearing = leftHeading + (rightHeading - leftHeading) * (i / numPoints);
    const point = turf.destination(apex, radiusKm, bearing);
    arcPoints.push([point.geometry.coordinates[0], point.geometry.coordinates[1]]);
  }
  
  // Create the cone polygon (already closed since we start and end at apex)
  const coneCoords = [
    [apexLon, apexLat],
    ...arcPoints,
    [apexLon, apexLat]
  ];
  const cone = turf.polygon([coneCoords]);
  
  // Check if polygons intersect
  return turf.booleanIntersects(cone, turfPolygon);
}

/**
 * Find a clear heading by checking cones at increasing angles to starboard
 * @param shipLat - Ship's latitude
 * @param shipLon - Ship's longitude
 * @param currentHeading - Ship's current heading
 * @param speed - Ship speed in knots
 * @param otherShips - Array of other ships to avoid
 * @param landPolygons - Array of land polygons to avoid
 * @returns Clear heading or undefined if no clear heading found
 */
export function findClearHeading(
  shipLat: number,
  shipLon: number,
  currentHeading: number,
  speed: number,
  otherShips: Array<{ latitude: number; longitude: number; heading: number; speed: number }>,
  landPolygons: Array<[number, number][]>
): number | undefined {
  const ship = turf.point([shipLon, shipLat]);
  
  // Check if any ships are within 4nm
  const nearbyShips = otherShips.filter(other => {
    const otherPoint = turf.point([other.longitude, other.latitude]);
    const distance = turf.distance(ship, otherPoint) / 1.852; // Convert to nautical miles
    return distance < 4;
  });

  // Helper function to check if a heading is blocked
  const isHeadingBlocked = (heading: number): boolean => {
    // Check for ships
    if (isConeBlocked(shipLat, shipLon, heading, speed, otherShips)) {
      return true;
    }
    
    // Check for land
    return landPolygons.some(polygon =>
      isConeIntersectingPolygon(
        shipLat,
        shipLon,
        heading,
        2, // 2nm cone
        15, // 15 degrees
        polygon
      )
    );
  };

  // If no ships are within 4nm and we're not heading towards land, no need to change course
  if (nearbyShips.length === 0 && !isHeadingBlocked(currentHeading)) {
    return undefined;
  }

  // Check current heading first
  if (!isHeadingBlocked(currentHeading)) {
    return currentHeading;
  }

  // Try increasingly larger turns to starboard (10 degree increments)
  for (let turn = 10; turn <= 180; turn += 10) {
    const newHeading = (currentHeading + turn) % 360;
    if (!isHeadingBlocked(newHeading)) {
      return newHeading;
    }
  }

  // If no clear heading found to starboard, try port side
  for (let turn = 10; turn <= 180; turn += 10) {
    const newHeading = (currentHeading - turn + 360) % 360;
    if (!isHeadingBlocked(newHeading)) {
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
  const point1 = turf.point([lon1, lat1]);
  const point2 = turf.point([lon2, lat2]);
  let bearing = turf.bearing(point1, point2);
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
