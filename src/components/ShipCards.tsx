import React from 'react';
import { Card, Row, Col } from 'antd';
import { ShipDictionary } from '../types';

interface ShipCardsProps {
  ships: ShipDictionary;
}

export const ShipCards: React.FC<ShipCardsProps> = ({ ships }) => {
  return (
    <Row gutter={[4, 4]} style={{ margin: '0 -2px', flexWrap: 'wrap' }}>
      {Object.values(ships).map((ship) => {
        const isChangingCourseOrSpeed = 
          (ship.demandedCourse !== undefined && ship.demandedCourse !== ship.heading) || 
          (ship.demandedSpeed !== undefined && ship.demandedSpeed !== ship.speed) ||
          ship.avoidingLand;

        return (
          <Col xs={24} sm={12} md={8} key={ship.id} style={{ marginBottom: '4px' }}>
            <Card 
            title={<span style={{ fontSize: '12px', fontWeight: 'bold' }}>{ship.name}</span>}
            size="small"
            headStyle={{ padding: '4px 8px', minHeight: '32px' }}
            bodyStyle={{ padding: '4px 8px' }}
            style={{ 
              width: '100%',
              borderLeft: ship.status === 'disabled' ? '3px solid #000000' : 
                         ship.status === 'aground' ? '3px solid #595959' : 
                         isChangingCourseOrSpeed ? '3px solid #ff4d4f' : 
                         '3px solid #1890ff'
            }}
          >
            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{
                  color: ship.status === 'disabled' ? '#000000' : 
                         ship.status === 'aground' ? '#595959' : 
                         ship.status === 'underway' ? '#52c41a' : 
                         ship.status === 'anchored' ? '#1890ff' : 
                         ship.status === 'moored' ? '#722ed1' : '#000000',
                  fontWeight: 'bold'
                }}>
                  {ship.status.charAt(0).toUpperCase() + ship.status.slice(1)}
                </span>
              </div>
              <div><strong>Type:</strong> {ship.type}</div>
              <div>
                <strong>Course:</strong> {ship.heading.toFixed(1)}°
                {ship.turnRate !== 0 && (
                  <span style={{ color: '#ff4d4f', marginLeft: '2px' }}>
                    ({ship.turnRate > 0 ? '↻' : '↺'} {Math.abs(ship.turnRate).toFixed(1)}°/min)
                  </span>
                )}
                {ship.demandedCourse !== undefined && (
                  <span style={{ 
                    color: ship.demandedCourse !== ship.heading ? '#ff4d4f' : '#52c41a',
                    marginLeft: '2px'
                  }}>
                    → {ship.demandedCourse.toFixed(1)}°
                    {ship.demandedCourse !== ship.heading && (
                      <span> ({((((ship.demandedCourse - ship.heading + 540) % 360) - 180)).toFixed(1)}°)</span>
                    )}
                  </span>
                )}
              </div>
              <div>
                <strong>Speed:</strong> {ship.speed.toFixed(1)} knots
                {ship.demandedSpeed !== undefined && (
                  <span style={{ 
                    color: ship.demandedSpeed !== ship.speed ? '#ff4d4f' : '#52c41a',
                    marginLeft: '2px'
                  }}>
                    → {ship.demandedSpeed.toFixed(1)} knots
                    {ship.demandedSpeed !== ship.speed && (
                      <span> ({(ship.demandedSpeed - ship.speed > 0 ? '+' : '')}{(ship.demandedSpeed - ship.speed).toFixed(1)})</span>
                    )}
                  </span>
                )}
              </div>
              {ship.avoidingLand && (
                <div style={{ color: '#ff4d4f' }}>
                  ⚠️ Avoiding Land
                </div>
              )}
            </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};
