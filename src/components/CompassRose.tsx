import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export const CompassRose: React.FC = () => {
  const map = useMap();
  const [position, setPosition] = React.useState<L.Point>();

  React.useEffect(() => {
    // Update compass position when map moves or resizes
    const updatePosition = () => {
      const mapSize = map.getSize();
      // Position in top-right corner with 20px margin
      setPosition(L.point(mapSize.x - 70, 70));
    };

    updatePosition();
    map.on('move', updatePosition);
    map.on('resize', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('resize', updatePosition);
    };
  }, [map]);

  if (!position) return null;

  // Convert position to screen coordinates
  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x - 50,
    top: position.y - 50,
    width: 100,
    height: 100,
    pointerEvents: 'none',
    zIndex: 1000,
  };

  return (
    <svg style={svgStyle} viewBox="0 0 100 100">
      {/* Outer circle */}
      <circle cx="50" cy="50" r="48" fill="white" fillOpacity="0.8" stroke="#666" strokeWidth="1" />
      
      {/* Cardinal directions */}
      <g fontSize="14" fontFamily="Arial" textAnchor="middle" fill="#333">
        <text x="50" y="20">N</text>
        <text x="80" y="54">E</text>
        <text x="50" y="88">S</text>
        <text x="20" y="54">W</text>
      </g>

      {/* Direction pointers */}
      <g stroke="#666" strokeWidth="1">
        {/* North pointer (red) */}
        <path d="M 50 50 L 50 10" stroke="#ff4d4f" strokeWidth="2" />
        <path d="M 45 15 L 50 10 L 55 15" stroke="#ff4d4f" fill="none" strokeWidth="2" />
        
        {/* Other cardinal directions */}
        <path d="M 50 50 L 90 50" />
        <path d="M 50 50 L 50 90" />
        <path d="M 50 50 L 10 50" />
        
        {/* Intercardinal lines (shorter) */}
        <path d="M 50 50 L 75 25" strokeDasharray="2,2" />
        <path d="M 50 50 L 75 75" strokeDasharray="2,2" />
        <path d="M 50 50 L 25 75" strokeDasharray="2,2" />
        <path d="M 50 50 L 25 25" strokeDasharray="2,2" />
      </g>
    </svg>
  );
};
