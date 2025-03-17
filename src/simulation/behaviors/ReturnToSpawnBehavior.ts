import { Ship } from '../../types';
import { NavigationBehavior, NavigationDecision } from './NavigationBehavior';
import { SPAWN_POINT, MAX_DISTANCE_NM } from '../../config/constants';

/**
 * Behavior for returning ships to spawn point when they travel too far
 * Lowest priority - only activates when ships exceed maximum allowed distance
 */
export class ReturnToSpawnBehavior implements NavigationBehavior {
  readonly name = 'Return To Spawn';
  readonly priority = 8; // Lowest priority - only applies when no other behaviors are active
  
  evaluate(
    ship: Ship, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _otherShips: Ship[], 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _landPolygons: Array<[number, number][]>
  ): NavigationDecision | null {
    // Skip checks for disabled or aground ships
    if (ship.status !== 'underway') {
      return null;
    }
    
    // Calculate distance from spawn point in nautical miles
    const distanceFromSpawn = Math.sqrt(
      Math.pow((ship.position.latitude - SPAWN_POINT.latitude) * 60, 2) +
      Math.pow(
        (ship.position.longitude - SPAWN_POINT.longitude) * 60 * 
        Math.cos(ship.position.latitude * Math.PI / 180), 
        2
      )
    );
    
    // If ship is not too far, no action needed
    if (distanceFromSpawn <= MAX_DISTANCE_NM) {
      return null;
    }
    
    // Calculate bearing to spawn point
    const dLon = (SPAWN_POINT.longitude - ship.position.longitude) * Math.PI / 180;
    const lat1 = ship.position.latitude * Math.PI / 180;
    const lat2 = SPAWN_POINT.latitude * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    
    // Return decision to head back to spawn
    return {
      demandedCourse: bearing,
      reason: `Returning to spawn area, distance: ${distanceFromSpawn.toFixed(1)} nm, bearing: ${bearing.toFixed(1)}°`
    };
  }
}
