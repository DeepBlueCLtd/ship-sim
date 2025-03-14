/**
 * Represents a ship in the simulation
 */
export interface CollisionPoint {
  latitude: number;
  longitude: number;
  timeToCollision: number; // minutes
}

export interface CollisionRisk {
  shipId: string;
  bearing: number;
  distance: number;
  relativeSpeed: number;
  collisionPoint?: CollisionPoint;
}

export interface Ship {
  /** Unique identifier for the ship */
  id: string;
  /** Name of the ship */
  name: string;
  /** Current position in latitude/longitude coordinates */
  position: {
    latitude: number;
    longitude: number;
  };
  /** Current heading in degrees (0-359) */
  heading: number;
  /** Demanded course in degrees (0-359) */
  demandedCourse?: number;
  /** Current turn rate in degrees per minute */
  turnRate: number;
  /** Current speed in knots */
  speed: number;
  /** Demanded speed in knots */
  demandedSpeed?: number;
  /** Normal speed to return to after collision avoidance */
  normalSpeed?: number;
  /** Ship dimensions */
  dimensions: {
    length: number;  // meters
    beam: number;    // meters
    draft: number;   // meters
  };
  /** Ship type (e.g., cargo, tanker, passenger) */
  type: string;
  /** Current status of the ship */
  status: 'underway' | 'anchored' | 'moored' | 'aground' | 'disabled';
  /** Unique color for the ship */
  color: string;
  /** Trail of previous positions and states (most recent first) */
  trail: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
    heading: number;
    speed: number;
    demandedCourse?: number;
    demandedSpeed?: number;
    status: 'underway' | 'anchored' | 'moored' | 'aground' | 'disabled';
    avoidingLand: boolean;
  }>;
  /** List of ships that pose collision risks */
  collisionRisks: CollisionRisk[];
  /** Whether the ship is currently avoiding land */
  avoidingLand: boolean;
}

/**
 * Array of ships in the simulation
 */
export type ShipDictionary = Ship[];

/**
 * Represents the current simulation time state
 */
export interface SimulationTime {
  /** Current simulation timestamp */
  timestamp: Date;
  /** Whether the simulation is currently running */
  running: boolean;
  /** Maximum number of positions to keep in ship trails */
  trailLength: number;
  /** Number of trail positions to display on the map */
  displayedTrailLength: number;
  /** Interval between simulation steps in milliseconds (100-1000) */
  stepInterval: number;
}
