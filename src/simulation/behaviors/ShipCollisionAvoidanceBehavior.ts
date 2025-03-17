import { Ship } from '../../types';
import { NavigationBehavior, NavigationDecision } from './NavigationBehavior';
import { findCollisionRisks, findClearHeading } from '../../utils/geoUtils';

/**
 * Behavior for avoiding collisions with other ships
 * Implements forward-looking collision detection and avoidance
 */
export class ShipCollisionAvoidanceBehavior implements NavigationBehavior {
  readonly name = 'Ship Collision Avoidance';
  readonly priority = 2; // Second highest priority - avoid ships after avoiding ground
  
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
    
    // Get positions and movement data of all other ships
    const otherShipsData = otherShips
      .filter(other => other.id !== ship.id && other.status !== 'disabled' && other.status !== 'aground')
      .map(other => ({
        id: other.id,
        latitude: other.position.latitude,
        longitude: other.position.longitude,
        heading: other.heading,
        speed: other.speed
      }));
    
    // Find collision risks with other ships
    const collisionRisks = findCollisionRisks(
      ship.id,
      ship.position.latitude,
      ship.position.longitude,
      ship.heading,
      ship.speed,
      otherShipsData
    );
    
    // If no collision risks, no action needed
    if (collisionRisks.length === 0) {
      return null;
    }
    
    // Find a clear heading that avoids other ships
    const clearHeading = findClearHeading(
      ship.position.latitude,
      ship.position.longitude,
      ship.heading,
      ship.speed,
      otherShipsData,
      landPolygons
    );
    
    // Calculate target speed as 2/3 of either normal speed or current speed
    const baseSpeed = ship.normalSpeed ?? ship.speed;
    const targetSpeed = baseSpeed * this.SPEED_REDUCTION_FACTOR;
    
    // If no clear heading found, maintain current heading but reduce speed
    if (clearHeading === undefined) {
      return {
        demandedSpeed: targetSpeed,
        storeNormalSpeed: ship.normalSpeed === undefined && ship.demandedSpeed !== undefined,
        reason: `Reducing speed due to collision risk with ${collisionRisks.length} ship(s), no clear heading found`
      };
    }
    
    // Format the ship names for the reason message
    const shipNames = collisionRisks
      .map(risk => otherShips.find(s => s.id === risk.shipId)?.name || risk.shipId)
      .join(', ');
    
    // Return decision with new course and reduced speed
    return {
      demandedCourse: clearHeading,
      demandedSpeed: targetSpeed,
      storeNormalSpeed: ship.normalSpeed === undefined && ship.demandedSpeed !== undefined,
      reason: `Avoiding collision with ${shipNames} by changing course to ${clearHeading.toFixed(1)}° and reducing speed`
    };
  }
}
