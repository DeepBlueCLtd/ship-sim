import { Ship } from '../../types';

/**
 * Result of a navigation behavior evaluation
 */
export interface NavigationDecision {
  /** The demanded course to set (in degrees) */
  demandedCourse?: number;
  
  /** The demanded speed to set (in knots) */
  demandedSpeed?: number;
  
  /** Whether to store the current speed as normal speed */
  storeNormalSpeed?: boolean;
  
  /** Human-readable reason for the decision */
  reason: string;
}

/**
 * Interface for ship navigation behaviors
 * Each behavior can suggest course/speed changes based on different conditions
 */
export interface NavigationBehavior {
  /**
   * Name of the behavior for identification
   */
  readonly name: string;
  
  /**
   * Priority of the behavior (lower number = higher priority)
   */
  readonly priority: number;
  
  /**
   * Evaluate the current situation and decide if action is needed
   * @param ship The ship to make decisions for
   * @param otherShips Other ships in the simulation
   * @param landPolygons Land polygons to avoid
   * @param additionalData Any additional data needed for decision making
   * @returns NavigationDecision if this behavior wants to take action, null otherwise
   */
  evaluate(
    ship: Ship, 
    otherShips: Ship[], 
    landPolygons: Array<[number, number][]>,
    additionalData?: Record<string, unknown>
  ): NavigationDecision | null;
}
