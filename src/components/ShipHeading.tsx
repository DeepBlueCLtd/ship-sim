import React from 'react';
import { Ship } from '../types';
import { Polygon, useMap } from 'react-leaflet';

interface ShipHeadingProps {
  ship: Ship;
  isChangingCourse: boolean;
}

export const ShipHeading: React.FC<ShipHeadingProps> = ({ ship, isChangingCourse }) => {
  const map = useMap();
  const [points, setPoints] = React.useState<[number, number][]>([]);

  // Calculate heading indicator points (a triangle pointing in ship's direction)
  const calculateHeadingPoints = React.useCallback(() => {
    const lat = ship.position.latitude;
    const lon = ship.position.longitude;
    const heading = ship.heading;
    
    // Scale size based on zoom level (smaller at higher zoom levels)
    const zoom = map.getZoom();
    const baseSize = 0.005; // Base size at zoom level 10
    const size = baseSize * Math.pow(0.8, zoom - 10); // Exponential scaling

    // Convert heading to radians
    const rad = (heading - 90) * (Math.PI / 180);

    // Calculate triangle points
    const point1: [number, number] = [
      lat + size * Math.cos(rad),
      lon + size * Math.sin(rad)
    ];
    const point2: [number, number] = [
      lat + size * 0.4 * Math.cos(rad + (120 * Math.PI / 180)),
      lon + size * 0.4 * Math.sin(rad + (120 * Math.PI / 180))
    ];
    const point3: [number, number] = [
      lat + size * 0.4 * Math.cos(rad - (120 * Math.PI / 180)),
      lon + size * 0.4 * Math.sin(rad - (120 * Math.PI / 180))
    ];

    return [point1, point2, point3, point1];
  }, [map, ship.position, ship.heading]);

  React.useEffect(() => {
    // Update points initially and when ship heading changes
    setPoints(calculateHeadingPoints());
    
    // Update points when zoom changes
    const handleZoom = () => {
      setPoints(calculateHeadingPoints());
    };
    
    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map, ship.heading, ship.position, calculateHeadingPoints]);

  return (
    <Polygon
      positions={points}
      pathOptions={{
        color: isChangingCourse ? '#ff4d4f' : '#1890ff',
        fillColor: isChangingCourse ? '#ff7875' : '#40a9ff',
        fillOpacity: 0.8,
        weight: 1
      }}
    />
  );
};
