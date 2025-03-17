import { Ship } from '../types';
import { 
  findCollisionRisks, 
  findClearHeading, 
  isConeIntersectingPolygon 
} from '../utils/geoUtils';

/**
 * Interface for collision avoidance strategy implementations
 * This allows different collision avoidance algorithms to be plugged in
 */
export interface CollisionAvoidanceStrategy {
  /**
   * Check for and handle potential collisions
   * @param ship The ship to update
   * @param otherShips Other ships to check for collision risks
   * @param landPolygons Array of land polygons to avoid
   * @returns Updated ship with collision avoidance applied
   */
  avoidCollisions(
    ship: Ship, 
    otherShips: Ship[], 
    landPolygons: Array<[number, number][]>
  ): Ship;
}

/**
 * Default implementation of forward-looking collision avoidance 
 * Uses cone detection and progressive course changes
 */
export class ForwardLookingCollisionAvoidance implements CollisionAvoidanceStrategy {
  private readonly CONE_RADIUS = 2; // nautical miles
  private readonly CONE_ANGLE = 15; // degrees
  private readonly SPEED_REDUCTION_FACTOR = 0.67; // 2/3 of normal/current speed
  
  avoidCollisions(
    ship: Ship, 
    otherShips: Ship[], 
    landPolygons: Array<[number, number][]>
  ): Ship {
    // Skip collision checks for disabled or aground ships
    if (ship.status === 'disabled' || ship.status === 'aground' || !ship.collisionAvoidanceActive) {
      return ship;
    }



    // Create a new ship object to avoid mutating the original
    const updatedShip = { ...ship };
    
    // Check for potential collisions with other ships
    const otherShipsData = otherShips
      .filter(other => other.id !== ship.id && other.status !== 'disabled' && other.status !== 'aground')
      .map(other => ({
        id: other.id,
        latitude: other.position.latitude,
        longitude: other.position.longitude,
        heading: other.heading,
        speed: other.speed
      }));
    
    // Check for collision risks with other ships
    const collisionRisks = findCollisionRisks(
      ship.id,
      ship.position.latitude,
      ship.position.longitude,
      ship.heading,
      ship.speed,
      otherShipsData
    );
    
    // Check if forward cone intersects with land
    const isHeadingTowardsLand = landPolygons.some(polygon => 
      isConeIntersectingPolygon(
        ship.position.latitude,
        ship.position.longitude,
        ship.heading,
        this.CONE_RADIUS,
        this.CONE_ANGLE,
        polygon
      )
    );
    
    // Determine if collision avoidance is necessary
    const needsAvoidance = collisionRisks.length > 0 || isHeadingTowardsLand;
    
    // Update collision risks
    updatedShip.collisionRisks = collisionRisks;
    
    if (needsAvoidance) {
      // Find clear heading if collision risks exist
      const clearHeading = findClearHeading(
        ship.position.latitude,
        ship.position.longitude,
        ship.heading,
        ship.speed,
        otherShipsData,
        landPolygons
      );
      
      // If no collision risk before but now exists (first detection)
      if (ship.collisionRisks.length === 0) {
        // Set collision avoidance course if needed
        if (clearHeading !== undefined && clearHeading !== ship.heading) {
          updatedShip.demandedCourse = clearHeading;
          updatedShip.avoidingLand = isHeadingTowardsLand;
        }

        // Store normal speed if first time detecting collision risk and we have a demanded speed
        if (ship.normalSpeed === undefined && ship.demandedSpeed !== undefined) {
          updatedShip.normalSpeed = ship.demandedSpeed;
        }

        // Calculate target speed as 2/3 of either normal speed or current speed
        const baseSpeed = updatedShip.normalSpeed ?? updatedShip.speed;
        const targetSpeed = baseSpeed * this.SPEED_REDUCTION_FACTOR;
        
        // Only reduce speed if current demanded speed is higher than target
        // This preserves any existing slower demanded speeds
        if (updatedShip.demandedSpeed === undefined || updatedShip.demandedSpeed > targetSpeed) {
          updatedShip.demandedSpeed = targetSpeed;
        }
      } 
      // Already in collision avoidance
      else {
        // Update course if a better heading is found
        if (clearHeading !== undefined && clearHeading !== ship.heading) {
          updatedShip.demandedCourse = clearHeading;
          updatedShip.avoidingLand = isHeadingTowardsLand;
        }
        
        // Maintain speed reduction
        const baseSpeed = updatedShip.normalSpeed ?? updatedShip.speed;
        const targetSpeed = baseSpeed * this.SPEED_REDUCTION_FACTOR;
        
        if (updatedShip.demandedSpeed === undefined || updatedShip.demandedSpeed > targetSpeed) {
          updatedShip.demandedSpeed = targetSpeed;
        }
      }
    } 
    // No collision risk, but was previously avoiding
    else if (ship.collisionRisks.length > 0) {
      // Clear collision avoidance state
      updatedShip.avoidingLand = false;
      updatedShip.collisionRisks = [];
      
      // Return to normal speed if it was stored
      if (updatedShip.normalSpeed !== undefined) {
        updatedShip.demandedSpeed = updatedShip.normalSpeed;
        updatedShip.normalSpeed = undefined;
      }
    }
    
    return updatedShip;
  }
}
