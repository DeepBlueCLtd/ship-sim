import { Ship } from '../types';
import { Feature, Polygon } from 'geojson';
import { generateRandomPointOutsidePolygon } from './geoUtils';
import gbData from '../assets/gb.json';

const shipTypes = ['cargo', 'tanker', 'passenger', 'fishing'];
const shipNames = ['Serenity', 'Ocean Voyager', 'Northern Star', 'Pacific Dream', 'Atlantic Spirit'];

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Find the Isle of Wight polygon
const iowPolygon = gbData.features.find(
  (feature) => feature.properties.id === 'GBIOW'
) as Feature<Polygon>;

if (!iowPolygon) {
  throw new Error('Isle of Wight polygon not found in geographic data');
}

export function generateRandomShips(count: number): Ship[] {
  return Array.from({ length: count }, (_, index) => {
    // Generate a position 5nm outside the Isle of Wight
    const [latitude, longitude] = generateRandomPointOutsidePolygon(iowPolygon);
    
    const heading = Math.floor(Math.random() * 360);
    const speed = getRandomInRange(5, 15);
    
    // 30% chance of having a demanded course/speed different from current
    const hasDemanded = Math.random() < 0.3;
    const demandedCourse = hasDemanded ? (heading + getRandomInRange(-45, 45)) % 360 : undefined;
    const demandedSpeed = hasDemanded ? Math.max(0, speed + getRandomInRange(-5, 5)) : undefined;
    
    return {
      id: `ship-${index + 1}`,
      name: shipNames[index % shipNames.length],
      position: { latitude, longitude },
      heading,
      speed,
      demandedCourse,
      demandedSpeed,
      dimensions: {
        length: getRandomInRange(100, 300),
        beam: getRandomInRange(15, 40),
        draft: getRandomInRange(5, 15),
      },
      type: shipTypes[Math.floor(Math.random() * shipTypes.length)],
      status: 'underway',
    };
  });
}
