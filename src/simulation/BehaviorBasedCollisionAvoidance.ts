import { Ship } from '../types';
import { CollisionAvoidanceStrategy } from './CollisionAvoidanceStrategy';
import { BehaviorManager } from './behaviors/BehaviorManager';
import { NavigationBehavior } from './behaviors/NavigationBehavior';

/**
 * Collision avoidance strategy that uses a behavior-based approach
 * Evaluates multiple behaviors in priority order to determine the best action
 */
export class BehaviorBasedCollisionAvoidance implements CollisionAvoidanceStrategy {
  private behaviorManager: BehaviorManager;
  
  constructor(behaviors?: NavigationBehavior[]) {
    this.behaviorManager = new BehaviorManager(behaviors);
  }
  
  /**
   * Apply collision avoidance based on prioritized behaviors
   */
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
    
    // Evaluate behaviors to get a decision
    const { decision, activeBehavior } = this.behaviorManager.evaluateBehaviors(
      ship,
      otherShips,
      landPolygons
    );
    
    // If no decision was made, clear collision avoidance state if it was active
    if (!decision) {
      if (ship.collisionRisks.length > 0 || ship.avoidingLand) {
        // Clear collision avoidance state
        updatedShip.collisionRisks = [];
        updatedShip.avoidingLand = false;
        
        // Return to normal speed if it was stored
        if (updatedShip.normalSpeed !== undefined) {
          updatedShip.demandedSpeed = updatedShip.normalSpeed;
          updatedShip.normalSpeed = undefined;
        }
      }
      return updatedShip;
    }
    
    // Apply the decision
    if (decision.demandedCourse !== undefined) {
      updatedShip.demandedCourse = decision.demandedCourse;
    }
    
    // Store normal speed if requested and not already stored
    if (decision.storeNormalSpeed && updatedShip.normalSpeed === undefined && 
        updatedShip.demandedSpeed !== undefined) {
      updatedShip.normalSpeed = updatedShip.demandedSpeed;
    }
    
    // Apply demanded speed if provided, respecting existing slower speeds
    if (decision.demandedSpeed !== undefined) {
      // Only reduce speed if current demanded speed is higher than target
      // This preserves any existing slower demanded speeds
      if (updatedShip.demandedSpeed === undefined || 
          updatedShip.demandedSpeed > decision.demandedSpeed) {
        updatedShip.demandedSpeed = decision.demandedSpeed;
      }
    }
    
    // Set avoidingLand flag based on active behavior
    updatedShip.avoidingLand = activeBehavior?.name === 'Ground Avoidance';
    
    // Store the reason for the decision
    updatedShip.avoidanceReason = decision.reason;
    
    return updatedShip;
  }
  
  /**
   * Add a new behavior to the manager
   */
  addBehavior(behavior: NavigationBehavior): void {
    this.behaviorManager.addBehavior(behavior);
  }
  
  /**
   * Remove a behavior by name
   */
  removeBehavior(behaviorName: string): boolean {
    return this.behaviorManager.removeBehavior(behaviorName);
  }
  
  /**
   * Get all behaviors sorted by priority
   */
  getBehaviors(): NavigationBehavior[] {
    return this.behaviorManager.getBehaviors();
  }
}
