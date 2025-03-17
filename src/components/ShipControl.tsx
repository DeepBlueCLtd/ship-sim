import React, { useState, useEffect } from 'react';
import { Typography, InputNumber, Button, Space } from 'antd';
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
    <div style={{ marginTop: '8px' }}>
      <Typography.Title level={5} style={{ margin: '4px 0', fontSize: '13px' }}>
        {ship.name}
      </Typography.Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {/* Course Control */}
        <div>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography.Text style={{ 
                  fontSize: '11px', 
                  display: 'block', 
                  color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)'
                }}>
                  Course
                </Typography.Text>
                <Typography.Text style={{ 
                  fontSize: '14px', 
                  display: 'block', 
                  color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)'
                }}>
                  {Math.round(ship.heading)}°
                </Typography.Text>
              </div>
              <Space.Compact style={{ width: '120px' }}>
                <InputNumber
                  min={0}
                  max={345} /* Max is 345 to allow for 15-degree increments up to 359 */
                  value={Math.round(courseValue / 15) * 15} /* Round to nearest 15 degrees */
                  onChange={(value) => {
                    if (value !== null) {
                      const newValue = Math.round(value / 15) * 15;
                      setCourseValue(newValue);
                      onUpdateShip(ship.id, { demandedCourse: newValue });
                    }
                  }}
                  style={{ width: '60px' }}
                  step={15}
                  controls={false}
                />
                <Button 
                  onClick={() => {
                    const newValue = (courseValue + 15) % 360;
                    setCourseValue(newValue);
                    onUpdateShip(ship.id, { demandedCourse: newValue });
                  }}
                  style={{ backgroundColor: isDarkMode ? '#177ddc' : undefined }}
                >
                  +
                </Button>
                <Button 
                  onClick={() => {
                    const newValue = (courseValue - 15 + 360) % 360;
                    setCourseValue(newValue);
                    onUpdateShip(ship.id, { demandedCourse: newValue });
                  }}
                  style={{ backgroundColor: isDarkMode ? '#177ddc' : undefined }}
                >
                  -
                </Button>
              </Space.Compact>
            </div>
          </div>

        </div>
        {/* Speed Control */}
        <div>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography.Text style={{ 
                  fontSize: '11px', 
                  display: 'block', 
                  color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)'
                }}>
                  Speed
                </Typography.Text>
                <Typography.Text style={{ 
                  fontSize: '14px', 
                  display: 'block', 
                  color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)'
                }}>
                  {ship.speed.toFixed(1)} kts
                </Typography.Text>
              </div>
              <Space.Compact style={{ width: '120px' }}>
                <InputNumber
                  min={0}
                  max={30}
                  value={Math.round(speedValue / 2) * 2} /* Round to nearest 2 knots */
                  onChange={(value) => {
                    if (value !== null) {
                      const newValue = Math.round(value / 2) * 2;
                      setSpeedValue(newValue);
                      onUpdateShip(ship.id, { demandedSpeed: newValue });
                    }
                  }}
                  style={{ width: '60px' }}
                  step={2}
                  controls={false}
                />
                <Button 
                  onClick={() => {
                    const newValue = Math.min(30, speedValue + 2);
                    setSpeedValue(newValue);
                    onUpdateShip(ship.id, { demandedSpeed: newValue });
                  }}
                  style={{ backgroundColor: isDarkMode ? '#177ddc' : undefined }}
                >
                  +
                </Button>
                <Button 
                  onClick={() => {
                    const newValue = Math.max(0, speedValue - 2);
                    setSpeedValue(newValue);
                    onUpdateShip(ship.id, { demandedSpeed: newValue });
                  }}
                  style={{ backgroundColor: isDarkMode ? '#177ddc' : undefined }}
                >
                  -
                </Button>
              </Space.Compact>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
