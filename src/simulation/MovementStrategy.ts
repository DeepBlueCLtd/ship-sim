import { Ship } from '../types';
import { 
  calculateNewHeading, 
  calculateNewSpeed, 
  calculateShipMovement 
} from '../utils/geoUtils';

/**
 * Interface for movement strategy implementations
 * This allows different movement algorithms to be swapped in the future
 */
export interface MovementStrategy {
  /**
   * Update ship movement for a given time interval
   * @param ship The ship to update
   * @param minutes Time interval in minutes
   * @param simulationTime Current simulation time
   * @returns Updated ship with new position, heading, and speed
   */
  updateMovement(ship: Ship, minutes: number, simulationTime?: Date): Ship;
}

/**
 * Default implementation of ship movement strategy
 * Uses maritime navigation conventions and gradual speed/heading changes
 */
export class DefaultMovementStrategy implements MovementStrategy {
  updateMovement(ship: Ship, minutes: number, simulationTime?: Date): Ship {
    // Skip position updates for disabled or aground ships
    if (ship.status === 'disabled' || ship.status === 'aground') {
      return ship;
    }

    // Create a new ship object to avoid mutating the original
    const updatedShip = { ...ship };

    // Update heading and turn rate based on demanded course
    const [newHeading, newTurnRate] = calculateNewHeading(
      ship.heading, 
      ship.turnRate, 
      ship.demandedCourse, 
      minutes
    );
    updatedShip.heading = newHeading;
    updatedShip.turnRate = newTurnRate;
    
    // Update speed based on demanded speed
    updatedShip.speed = calculateNewSpeed(
      ship.speed, 
      ship.demandedSpeed, 
      minutes
    );
    
    // Calculate new position based on current heading and speed
    const [newLat, newLon] = calculateShipMovement(
      ship.position.latitude,
      ship.position.longitude,
      updatedShip.speed,
      updatedShip.heading,
      minutes
    );
    
    // Update to new position
    updatedShip.position = {
      latitude: newLat,
      longitude: newLon
    };

    // Add current position and state to trail (limit to maximum length)
    const MAX_TRAIL_LENGTH = 100; // This should be configurable
    updatedShip.trail = [
      ...ship.trail.slice(-(MAX_TRAIL_LENGTH - 1)),
      {
        latitude: ship.position.latitude,
        longitude: ship.position.longitude,
        timestamp: simulationTime || new Date(), // Use simulation time if provided
        heading: ship.heading,
        speed: ship.speed,
        demandedCourse: ship.demandedCourse,
        demandedSpeed: ship.demandedSpeed,
        status: ship.status,
        avoidingLand: ship.avoidingLand
      }
    ];

    // Clear demanded course/speed if reached
    if (updatedShip.demandedCourse !== undefined && 
        Math.abs(updatedShip.heading - updatedShip.demandedCourse) < 0.1 && 
        Math.abs(updatedShip.turnRate) < 0.1) {
      updatedShip.heading = updatedShip.demandedCourse; // Snap to exact course
      updatedShip.turnRate = 0;
      updatedShip.demandedCourse = undefined;
    }
    
    if (updatedShip.demandedSpeed !== undefined && 
        Math.abs(updatedShip.speed - updatedShip.demandedSpeed) < 0.1) {
      updatedShip.speed = updatedShip.demandedSpeed; // Snap to exact speed
      updatedShip.demandedSpeed = undefined;
    }

    return updatedShip;
  }
}
