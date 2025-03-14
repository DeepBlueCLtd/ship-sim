import { Ship } from '../types';
import { generateRandomPointAtDistance } from './geoUtils';

const shipTypes = ['cargo', 'tanker', 'passenger', 'fishing'];
const shipNames = ['Serenity', 'Ocean Voyager', 'Northern Star', 'Pacific Dream', 'Atlantic Spirit'];

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Fixed spawn point coordinates (moved south into open water)
const SPAWN_CENTER_LAT = 50.3;
const SPAWN_CENTER_LON = -1.4;
const SPAWN_RADIUS_NM = 8;

export function generateRandomShips(count: number): Ship[] {
  return Array.from({ length: count }, (_, index) => {
    // Generate a position 10nm from the spawn center
    const [latitude, longitude] = generateRandomPointAtDistance(
      SPAWN_CENTER_LAT,
      SPAWN_CENTER_LON,
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
      name: shipNames[index % shipNames.length],
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
