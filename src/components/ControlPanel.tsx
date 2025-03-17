import { useState } from 'react';
import { Button, Layout, Typography, Space, Slider, Switch } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, BulbOutlined } from '@ant-design/icons';
import { SimulationTime, Ship } from '../types';
import { ShipControl } from './ShipControl';

const { Sider } = Layout;

interface ControlPanelProps {
  onAddShips: () => void;
  onClearShips: () => void;
  simulationTime: SimulationTime;
  onToggleSimulation: () => void;
  onTrailLengthChange: (length: number) => void;
  onStepIntervalChange: (stepsPerSecond: number) => void;
  ships: Ship[];
  isDarkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
  onToggleDarkMode: () => void;
  onToggleCollisionAvoidance: (shipId: string) => void;
  onUpdateShip?: (shipId: string, updates: Partial<Ship>) => void;
  onSelectShip?: (shipId: string | null) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onAddShips,
  onClearShips,
  simulationTime,
  onToggleSimulation,
  onTrailLengthChange,
  onStepIntervalChange,
  ships,
  isDarkMode,
  onThemeChange,
  onToggleCollisionAvoidance,
  onUpdateShip,
  onSelectShip
}) => {
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const selectedShip = selectedShipId ? ships.find(s => s.id === selectedShipId) : null;
  // Format the time as HH:mm
  const formattedTime = simulationTime.timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Sider width={500} style={{ background: 'inherit', padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'start' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Ship Controls
          </Typography.Title>
          <Switch
            checkedChildren={<BulbOutlined />}
            unCheckedChildren={<BulbOutlined />}
            checked={isDarkMode}
            onChange={onThemeChange}
          />
        </Space>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Simulation Time
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  ({Math.round(1000 / simulationTime.stepInterval)} steps/sec)
                </Typography.Text>
              </div>
              <Typography.Text style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>
                {formattedTime}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                Each step advances time by 1 minute
              </Typography.Text>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '30%' }}>
              <Button type="primary" onClick={onAddShips}>
                +5 Ships
              </Button>
              <Button type="primary" danger onClick={onClearShips}>
                Clear
              </Button>
              <Button 
                type="primary" 
                icon={simulationTime.running ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={onToggleSimulation}
              >
                {simulationTime.running ? 'Pause' : 'Start'}
              </Button></div>
          </div>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <Typography.Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)' }}>
                Simulation Speed
              </Typography.Text>
              <Slider
                min={1}
                max={10}
                step={1}
                value={Math.round(1000 / simulationTime.stepInterval)}
                onChange={onStepIntervalChange}
                styles={{
                  track: { backgroundColor: isDarkMode ? '#177ddc' : undefined },
                  rail: { backgroundColor: isDarkMode ? '#434343' : undefined },
                  handle: { borderColor: isDarkMode ? '#177ddc' : undefined }
                }}
                marks={{
                  1: { label: '1', style: { color: isDarkMode ? '#d9d9d9' : undefined } },
                  5: { label: '5', style: { color: isDarkMode ? '#d9d9d9' : undefined } },
                  10: { label: '10', style: { color: isDarkMode ? '#d9d9d9' : undefined } }
                }}
                tooltip={{
                  formatter: (value) => `${value} steps/sec`,
                  overlayInnerStyle: isDarkMode ? {
                    backgroundColor: '#1f1f1f',
                    color: '#d9d9d9'
                  } : undefined
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.45)' }}>
                Trail Length
              </Typography.Text>
              <Slider
                min={0}
                max={100}
                value={simulationTime.displayedTrailLength}
                onChange={onTrailLengthChange}
                styles={{
                  track: { backgroundColor: isDarkMode ? '#177ddc' : undefined },
                  rail: { backgroundColor: isDarkMode ? '#434343' : undefined },
                  handle: { borderColor: isDarkMode ? '#177ddc' : undefined }
                }}
                marks={{
                  0: { label: 'Off', style: { color: isDarkMode ? '#d9d9d9' : undefined } },
                  20: { label: '20', style: { color: isDarkMode ? '#d9d9d9' : undefined } },
                  50: { label: '50', style: { color: isDarkMode ? '#d9d9d9' : undefined } },
                  100: { label: '100', style: { color: isDarkMode ? '#d9d9d9' : undefined } }
                }}
                tooltip={{
                  formatter: (value) => `${value} positions`,
                  overlayInnerStyle: isDarkMode ? {
                    backgroundColor: '#1f1f1f',
                    color: '#d9d9d9'
                  } : undefined
                }}
              />
            </div>
          </div>
        </div>

        {/* Ship status cards */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Typography.Title level={5} style={{ margin: '8px 0', fontSize: '14px' }}>
            Ship Status
          </Typography.Title>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 380px)', // Leave space for other controls
            paddingRight: '8px', // Space for scrollbar
            marginRight: '-8px' // Compensate for padding to maintain alignment
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
              {ships.map(ship => (
                <div
                  key={ship.id}
                  onClick={() => {
                    const newSelectedId = ship.id === selectedShipId ? null : ship.id;
                    setSelectedShipId(newSelectedId);
                    if (onSelectShip) {
                      onSelectShip(newSelectedId);
                    }
                    // If selecting a ship, disable collision avoidance
                    if (newSelectedId) {
                      onToggleCollisionAvoidance(ship.id);
                    }
                  }}
                  style={{
                    padding: '8px',
                    borderLeft: `4px solid ${ship.color}`,
                    backgroundColor: isDarkMode ? 
                      (ship.id === selectedShipId ? '#1f1f1f' : '#141414') : 
                      (ship.id === selectedShipId ? '#f0f0f0' : '#fff'),
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer'
                  }}>
                  <Typography.Text style={{ 
                    color: isDarkMode ? '#d9d9d9' : undefined,
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {ship.name}
                  </Typography.Text>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Typography.Text type="secondary" style={{ fontSize: '11px', color: isDarkMode ? '#d9d9d9' : undefined }}>
                      {ship.status}
                    </Typography.Text>
                    {ship.collisionRisks.length > 0 && (
                      <Typography.Text type="warning" style={{ fontSize: '11px', color: isDarkMode ? '#d9d9d9' : undefined }}>
                        {ship.collisionRisks.length} risks
                      </Typography.Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ship Control Panel */}
        {selectedShip && (
          <ShipControl
            ship={selectedShip}
            isDarkMode={isDarkMode}
            onUpdateShip={onUpdateShip!}
          />
        )}
      </Space>
    </Sider>
  );
};
