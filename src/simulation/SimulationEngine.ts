import { Ship, SimulationTime } from '../types';
import { MovementStrategy, DefaultMovementStrategy } from './MovementStrategy';
import { CollisionAvoidanceStrategy } from './CollisionAvoidanceStrategy';
import { BehaviorBasedCollisionAvoidance } from './BehaviorBasedCollisionAvoidance';
import { isPointInPolygon } from '../utils/geoUtils';

/**
 * Simulation configuration parameters
 */
export interface SimulationConfig {
  maxTrailLength: number;
}

/**
 * The SimulationEngine is responsible for coordinating and executing
 * the simulation logic, using pluggable strategies for movement and
 * collision avoidance.
 */
export class SimulationEngine {
  private movementStrategy: MovementStrategy;
  private collisionAvoidanceStrategy: CollisionAvoidanceStrategy;
  private config: SimulationConfig;

  constructor(
    movementStrategy?: MovementStrategy,
    collisionAvoidanceStrategy?: CollisionAvoidanceStrategy,
    config?: Partial<SimulationConfig>
  ) {
    // Use provided strategies or defaults
    this.movementStrategy = movementStrategy || new DefaultMovementStrategy();
    this.collisionAvoidanceStrategy = collisionAvoidanceStrategy || new BehaviorBasedCollisionAvoidance();
    
    // Use provided config or defaults
    this.config = {
      maxTrailLength: 100,
      ...config
    };
  }

  /**
   * Update all ships for a given time interval
   * @param ships Array of ships to update
   * @param landPolygons Array of land polygons to avoid
   * @param simulationTime Current simulation time
   * @param minutes Time interval in minutes (usually 1)
   * @returns Updated ships array
   */
  updateSimulation(
    ships: Ship[],
    landPolygons: Array<[number, number][]>,
    simulationTime: SimulationTime,
    minutes: number = 1
  ): Ship[] {
    if (ships.length === 0) return [];

    // Create a copy of ships array to avoid direct mutation
    let updatedShips = [...ships];
    
    // First apply collision avoidance to all ships (to determine demanded course/speed)
    updatedShips = updatedShips.map(ship => {
      // Skip ships that don't have collision avoidance enabled
      if (!ship.collisionAvoidanceActive) return ship;
      
      // Get other ships for collision check (excluding this one)
      const otherShips = updatedShips.filter(other => other.id !== ship.id);
      
      // Apply collision avoidance strategy
      return this.collisionAvoidanceStrategy.avoidCollisions(ship, otherShips, landPolygons);
    });

    // Check for ships running aground
    updatedShips = this.checkGrounding(updatedShips, landPolygons);
    
    // Check for actual collisions between ships
    updatedShips = this.checkShipCollisions(updatedShips);

    // Then update all ship movements
    updatedShips = updatedShips.map(ship => 
      this.movementStrategy.updateMovement(ship, minutes, simulationTime.timestamp)
    );

    // Limit trail length for all ships
    updatedShips = this.limitTrailLength(updatedShips);

    return updatedShips;
  }

  /**
   * Check for ships running aground
   */
  private checkGrounding(ships: Ship[], landPolygons: Array<[number, number][]>): Ship[] {
    return ships.map(ship => {
      // Skip already disabled or aground ships
      if (ship.status === 'disabled' || ship.status === 'aground') return ship;

      // Check if ship is inside any land polygon
      for (const polygon of landPolygons) {
        // Check if ship's position is inside the land polygon
        if (isPointInPolygon(
          [ship.position.longitude, ship.position.latitude], 
          polygon
        )) {
          return { ...ship, status: 'aground' };
        }
      }
      return ship;
    });
  }

  /**
   * Check for collisions between ships and update their status accordingly
   */
  private checkShipCollisions(ships: Ship[]): Ship[] {
    const updatedShips = [...ships];
    
    // Check each pair of ships for collisions
    for (let i = 0; i < updatedShips.length; i++) {
      const ship = updatedShips[i];
      if (ship.status === 'disabled' || ship.status === 'aground') continue;
      
      for (let j = i + 1; j < updatedShips.length; j++) {
        const otherShip = updatedShips[j];
        if (otherShip.status === 'disabled' || otherShip.status === 'aground') continue;

        // Calculate distance in nautical miles
        const distanceInNm = Math.sqrt(
          Math.pow((ship.position.latitude - otherShip.position.latitude) * 60, 2) +
          Math.pow(
            (ship.position.longitude - otherShip.position.longitude) * 60 * 
            Math.cos(ship.position.latitude * Math.PI / 180), 
            2
          )
        );

        // Convert ship lengths to nautical miles
        const shipLengthNm = ship.dimensions.length / 1852;
        const otherShipLengthNm = otherShip.dimensions.length / 1852;

        // If distance is less than sum of ship lengths, handle collision
        if (distanceInNm < (shipLengthNm + otherShipLengthNm) / 2) {
          if (ship.dimensions.length === otherShip.dimensions.length) {
            // Both ships become disabled if equal length
            updatedShips[i] = { ...ship, status: 'disabled' };
            updatedShips[j] = { ...otherShip, status: 'disabled' };
          } else if (ship.dimensions.length < otherShip.dimensions.length) {
            // Shorter ship becomes disabled
            updatedShips[i] = { ...ship, status: 'disabled' };
          } else {
            // Shorter ship becomes disabled
            updatedShips[j] = { ...otherShip, status: 'disabled' };
          }
        }
      }
    }
    
    return updatedShips;
  }

  /**
   * Set movement strategy
   * @param strategy New movement strategy
   */
  setMovementStrategy(strategy: MovementStrategy): void {
    this.movementStrategy = strategy;
  }

  /**
   * Set collision avoidance strategy
   * @param strategy New collision avoidance strategy
   */
  setCollisionAvoidanceStrategy(strategy: CollisionAvoidanceStrategy): void {
    this.collisionAvoidanceStrategy = strategy;
  }

  /**
   * Update simulation configuration
   * @param config New configuration (partial)
   */
  updateConfig(config: Partial<SimulationConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Limit trail length for all ships to the configured maximum
   * @param ships Array of ships to process
   * @returns Updated ships with limited trail length
   */
  private limitTrailLength(ships: Ship[]): Ship[] {
    return ships.map(ship => {
      if (ship.trail.length <= this.config.maxTrailLength) {
        return ship;
      }
      
      // Create a new ship object with the trail limited to maxTrailLength
      return {
        ...ship,
        trail: ship.trail.slice(-this.config.maxTrailLength) // Keep only the most recent points
      };
    });
  }
}
