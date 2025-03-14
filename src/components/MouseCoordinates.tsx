import React from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export const MouseCoordinates: React.FC = () => {
  const [position, setPosition] = React.useState<L.LatLng | null>(null);

  // Update position when mouse moves
  useMapEvents({
    mousemove: (e) => {
      setPosition(e.latlng);
    },
    mouseout: () => {
      setPosition(null);
    }
  });

  if (!position) return null;

  // Position in bottom-left corner with 10px margin
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 10,
    bottom: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
    border: '1px solid #d9d9d9'
  };

  return (
    <div style={containerStyle}>
      {position.lat.toFixed(6)}°N, {position.lng.toFixed(6)}°E
    </div>
  );
};
