import React, { useState, useEffect } from 'react';
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
  const [courseValue, setCourseValue] = useState(ship.demandedCourse ?? ship.heading);
  const [speedValue, setSpeedValue] = useState(ship.demandedSpeed ?? ship.speed);

  // Update local state when ship changes
  useEffect(() => {
    setCourseValue(ship.demandedCourse ?? ship.heading);
    setSpeedValue(ship.demandedSpeed ?? ship.speed);
  }, [ship.demandedCourse, ship.demandedSpeed, ship.heading, ship.speed]);
  return (
    <div style={{ marginTop: '16px' }}>
      <Typography.Title level={5} style={{ margin: '8px 0', fontSize: '14px' }}>
        Ship Control - {ship.name}
      </Typography.Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Course Control */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <Typography.Text style={{ 
              fontSize: '12px', 
              display: 'block', 
              color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)'
            }}>
              Current Course
            </Typography.Text>
            <Typography.Text style={{ 
              fontSize: '16px', 
              display: 'block', 
              color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)'
            }}>
              {Math.round(ship.heading)}°
            </Typography.Text>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <Typography.Text style={{ 
              fontSize: '12px', 
              display: 'block', 
              color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)'
            }}>
              Demanded Course
            </Typography.Text>
            <Typography.Text style={{ 
              fontSize: '16px', 
              display: 'block', 
              color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)'
            }}>
              {Math.round(courseValue)}°
            </Typography.Text>
          </div>
          <Slider
            min={0}
            max={359}
            value={courseValue}
            onChange={(value) => {
              setCourseValue(value);
              onUpdateShip(ship.id, { demandedCourse: value });
            }}
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
          <div style={{ marginBottom: '8px' }}>
            <Typography.Text style={{ 
              fontSize: '12px', 
              display: 'block', 
              color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)'
            }}>
              Current Speed
            </Typography.Text>
            <Typography.Text style={{ 
              fontSize: '16px', 
              display: 'block', 
              color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)'
            }}>
              {ship.speed.toFixed(1)} kts
            </Typography.Text>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <Typography.Text style={{ 
              fontSize: '12px', 
              display: 'block', 
              color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)'
            }}>
              Demanded Speed
            </Typography.Text>
            <Typography.Text style={{ 
              fontSize: '16px', 
              display: 'block', 
              color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)'
            }}>
              {speedValue.toFixed(1)} kts
            </Typography.Text>
          </div>
          <Slider
            min={0}
            max={30}
            step={0.5}
            value={speedValue}
            onChange={(value) => {
              setSpeedValue(value);
              onUpdateShip(ship.id, { demandedSpeed: value });
            }}
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
