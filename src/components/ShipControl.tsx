import React from 'react';
import { Typography, Slider } from 'antd';
import { Ship } from '../types';

interface ShipControlProps {
  ship: Ship;
  isDarkMode: boolean;
  onUpdateShip: (shipId: string, updates: Partial<Ship>) => void;
}

export const ShipControl: React.FC<ShipControlProps> = ({
  ship,
  isDarkMode,
  onUpdateShip,
}) => {
  return (
    <div style={{ marginTop: '16px' }}>
      <Typography.Title level={5} style={{ margin: '8px 0', fontSize: '14px' }}>
        Ship Control - {ship.name}
      </Typography.Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Course Control */}
        <div>
          <Typography.Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)' }}>
            Current Course: {Math.round(ship.heading)}°
          </Typography.Text>
          {ship.demandedCourse !== undefined && (
            <Typography.Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)' }}>
              Demanded Course: {Math.round(ship.demandedCourse)}°
            </Typography.Text>
          )}
          <Slider
            min={0}
            max={359}
            value={ship.demandedCourse ?? ship.heading}
            onChange={(value) => onUpdateShip(ship.id, { demandedCourse: value })}
            styles={{
              track: { backgroundColor: isDarkMode ? '#177ddc' : undefined },
              rail: { backgroundColor: isDarkMode ? '#434343' : undefined },
              handle: { borderColor: isDarkMode ? '#177ddc' : undefined }
            }}
            tooltip={{
              formatter: (value) => `${value}°`,
              overlayInnerStyle: isDarkMode ? {
                backgroundColor: '#1f1f1f',
                color: '#d9d9d9'
              } : undefined
            }}
          />
        </div>
        {/* Speed Control */}
        <div>
          <Typography.Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)' }}>
            Current Speed: {ship.speed.toFixed(1)} kts
          </Typography.Text>
          {ship.demandedSpeed !== undefined && (
            <Typography.Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)' }}>
              Demanded Speed: {ship.demandedSpeed.toFixed(1)} kts
            </Typography.Text>
          )}
          <Slider
            min={0}
            max={30}
            step={0.5}
            value={ship.demandedSpeed ?? ship.speed}
            onChange={(value) => onUpdateShip(ship.id, { demandedSpeed: value })}
            styles={{
              track: { backgroundColor: isDarkMode ? '#177ddc' : undefined },
              rail: { backgroundColor: isDarkMode ? '#434343' : undefined },
              handle: { borderColor: isDarkMode ? '#177ddc' : undefined }
            }}
            tooltip={{
              formatter: (value) => `${value} kts`,
              overlayInnerStyle: isDarkMode ? {
                backgroundColor: '#1f1f1f',
                color: '#d9d9d9'
              } : undefined
            }}
          />
        </div>
      </div>
    </div>
  );
};
