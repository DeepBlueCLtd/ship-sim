import { Ship } from '../../types';
import { NavigationBehavior, NavigationDecision } from './NavigationBehavior';
import { isConeIntersectingPolygon, findClearHeading } from '../../utils/geoUtils';

/**
 * Behavior for avoiding land/ground collisions
 * Uses forward-looking cone detection to identify potential ground collisions
 */
export class GroundAvoidanceBehavior implements NavigationBehavior {
  readonly name = 'Ground Avoidance';
  readonly priority = 1; // Highest priority - avoid ground at all costs
  
  private readonly CONE_RADIUS = 2; // nautical miles
  private readonly CONE_ANGLE = 15; // degrees
  private readonly SPEED_REDUCTION_FACTOR = 0.67; // 2/3 of normal/current speed
  
  evaluate(
    ship: Ship, 
    otherShips: Ship[], 
    landPolygons: Array<[number, number][]>
  ): NavigationDecision | null {
    // Skip checks for disabled or aground ships
    if (ship.status === 'disabled' || ship.status === 'aground') {
      return null;
    }
    
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
    
    // If not heading towards land, no action needed
    if (!isHeadingTowardsLand) {
      // If the ship was previously avoiding land but is now clear,
      // explicitly return a null decision to clear the avoidance state
      if (ship.avoidingLand) {
        return null;
      }
      return null;
    }
    
    // Get positions and movement data of all other ships for findClearHeading
    const otherShipsData = otherShips
      .filter(other => other.id !== ship.id)
      .map(other => ({
        id: other.id,
        latitude: other.position.latitude,
        longitude: other.position.longitude,
        heading: other.heading,
        speed: other.speed
      }));
    
    // Find a clear heading that avoids land
    const clearHeading = findClearHeading(
      ship.position.latitude,
      ship.position.longitude,
      ship.heading,
      ship.speed,
      otherShipsData,
      landPolygons
    );
    
    // If no clear heading found, maintain current heading but reduce speed
    if (clearHeading === undefined) {
      // Calculate target speed as 2/3 of either normal speed or current speed
      const baseSpeed = ship.normalSpeed ?? ship.speed;
      const targetSpeed = baseSpeed * this.SPEED_REDUCTION_FACTOR;
      
      return {
        demandedSpeed: targetSpeed,
        storeNormalSpeed: ship.normalSpeed === undefined && ship.demandedSpeed !== undefined,
        reason: 'Reducing speed due to land ahead, no clear heading found'
      };
    }
    
    // Calculate target speed as 2/3 of either normal speed or current speed
    const baseSpeed = ship.normalSpeed ?? ship.speed;
    const targetSpeed = baseSpeed * this.SPEED_REDUCTION_FACTOR;
    
    return {
      demandedCourse: clearHeading,
      demandedSpeed: targetSpeed,
      storeNormalSpeed: ship.normalSpeed === undefined && ship.demandedSpeed !== undefined,
      reason: `Avoiding land by changing course to ${clearHeading.toFixed(1)}° and reducing speed`
    };
  }
}
