/**
 * Core simulation constants
 */

/** Spawn point for ships in open water south of Isle of Wight */
export const SPAWN_POINT = {
  latitude: 50.3,
  longitude: -1.4
} as const;

/** Maximum distance (in km) ships can travel from spawn point */
export const MAX_DISTANCE_KM = 70;

/** Maximum distance in nautical miles (converted from km) */
export const MAX_DISTANCE_NM = MAX_DISTANCE_KM / 1.852;

/** Spawn radius in nautical miles */
export const SPAWN_RADIUS_NM = 8;
