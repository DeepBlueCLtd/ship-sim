import { Ship } from '../../types';
import { NavigationBehavior, NavigationDecision } from './NavigationBehavior';
import { GroundAvoidanceBehavior } from './GroundAvoidanceBehavior';
import { ShipCollisionAvoidanceBehavior } from './ShipCollisionAvoidanceBehavior';
import { ReturnToSpawnBehavior } from './ReturnToSpawnBehavior';

/**
 * Manages a prioritized list of navigation behaviors
 * Evaluates behaviors in priority order and applies the first valid decision
 */
export class BehaviorManager {
  private behaviors: NavigationBehavior[] = [];
  
  constructor(behaviors?: NavigationBehavior[]) {
    // Initialize with default behaviors if none provided
    if (!behaviors || behaviors.length === 0) {
      this.behaviors = [
        new GroundAvoidanceBehavior(),
        new ShipCollisionAvoidanceBehavior(),
        new ReturnToSpawnBehavior()
      ];
    } else {
      this.behaviors = [...behaviors];
    }
    
    // Sort behaviors by priority (lowest number = highest priority)
    this.behaviors.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Add a new behavior to the manager
   * @param behavior The behavior to add
   */
  addBehavior(behavior: NavigationBehavior): void {
    this.behaviors.push(behavior);
    // Re-sort behaviors by priority
    this.behaviors.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Remove a behavior by name
   * @param behaviorName Name of the behavior to remove
   * @returns true if behavior was found and removed, false otherwise
   */
  removeBehavior(behaviorName: string): boolean {
    const initialLength = this.behaviors.length;
    this.behaviors = this.behaviors.filter(b => b.name !== behaviorName);
    return this.behaviors.length !== initialLength;
  }
  
  /**
   * Evaluate all behaviors in priority order and return the first valid decision
   * @param ship The ship to evaluate behaviors for
   * @param otherShips Other ships in the simulation
   * @param landPolygons Land polygons to avoid
   * @param additionalData Any additional data needed for decision making
   * @returns The decision from the highest priority behavior that returned a non-null result,
   *          or null if all behaviors returned null
   */
  evaluateBehaviors(
    ship: Ship,
    otherShips: Ship[],
    landPolygons: Array<[number, number][]>,
    additionalData?: Record<string, unknown>
  ): { decision: NavigationDecision | null, activeBehavior: NavigationBehavior | null } {
    // Skip evaluation if collision avoidance is disabled for this ship
    if (!ship.collisionAvoidanceActive) {
      return { decision: null, activeBehavior: null };
    }
    
    // Evaluate behaviors in priority order
    for (const behavior of this.behaviors) {
      const decision = behavior.evaluate(ship, otherShips, landPolygons, additionalData);
      
      // Return the first non-null decision
      if (decision !== null) {
        return { decision, activeBehavior: behavior };
      }
    }
    
    // If all behaviors returned null, return null
    return { decision: null, activeBehavior: null };
  }
  
  /**
   * Get all behaviors sorted by priority
   */
  getBehaviors(): NavigationBehavior[] {
    return [...this.behaviors];
  }
}
