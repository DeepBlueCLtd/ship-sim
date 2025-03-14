/**
 * Represents a ship in the simulation
 */
export interface CollisionRisk {
  shipId: string;
  bearing: number;
  distance: number;
  relativeSpeed: number;
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
  /** Current speed in knots */
  speed: number;
  /** Demanded speed in knots */
  demandedSpeed?: number;
  /** Ship dimensions */
  dimensions: {
    length: number;  // meters
    beam: number;    // meters
    draft: number;   // meters
  };
  /** Ship type (e.g., cargo, tanker, passenger) */
  type: string;
  /** Current status of the ship */
  status: 'underway' | 'anchored' | 'moored' | 'aground';
  /** Trail of previous positions (most recent first) */
  trail: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  /** List of ships that pose collision risks */
  collisionRisks: CollisionRisk[];
}

/**
 * Dictionary of ships indexed by their IDs
 */
export type ShipDictionary = {
  [id: string]: Ship;
};

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
}
