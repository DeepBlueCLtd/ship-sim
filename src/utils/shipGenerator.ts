import { Ship } from '../types';
import { generateRandomPointAtDistance } from './geoUtils';
import { SPAWN_POINT, SPAWN_RADIUS_NM } from '../config/constants';
import { shipNames } from '../data/shipNames';

const shipTypes = ['cargo', 'tanker', 'passenger', 'fishing'];

// Keep track of used ship names to avoid duplicates
const usedShipNames = new Set<string>();

function getUnusedShipName(): string {
  // If all names are used, reset the used names set
  if (usedShipNames.size >= shipNames.length) {
    usedShipNames.clear();
  }
  
  // Find an unused name
  const availableNames = shipNames.filter(name => !usedShipNames.has(name));
  const selectedName = availableNames[Math.floor(Math.random() * availableNames.length)];
  usedShipNames.add(selectedName);
  return selectedName;
}

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Use spawn point from config

export function generateRandomShips(count: number): Ship[] {
  return Array.from({ length: count }, (_, index) => {
    // Generate a position 10nm from the spawn center
    const [latitude, longitude] = generateRandomPointAtDistance(
      SPAWN_POINT.latitude,
      SPAWN_POINT.longitude,
      SPAWN_RADIUS_NM
    );
    
    const heading = Math.floor(330 + Math.random() * 60);
    const speed = getRandomInRange(5, 15);
    
    // 30% chance of having a demanded course/speed different from current
    const hasDemanded = Math.random() < 0.3;
    const demandedCourse = hasDemanded ? (heading + getRandomInRange(-45, 45)) % 360 : undefined;
    // Set demanded speed to be higher than current speed to better test collision avoidance
    const demandedSpeed = hasDemanded ? speed + getRandomInRange(2, 5) : undefined;
    
    return {
      id: `ship-${index + 1}`,
      name: getUnusedShipName(),
      position: { latitude, longitude },
      heading,
      speed,
      demandedCourse,
      demandedSpeed,
      normalSpeed: demandedSpeed !== undefined ? demandedSpeed : undefined,
      dimensions: {
        length: getRandomInRange(100, 300),
        beam: getRandomInRange(15, 40),
        draft: getRandomInRange(5, 15),
      },
      type: shipTypes[Math.floor(Math.random() * shipTypes.length)],
      status: 'underway',
      trail: [],
      collisionRisks: [],
      turnRate: 2, // Initial turn rate of 2 degrees per minute
      avoidingLand: false, // Initialize not avoiding land
    };
  });
}
