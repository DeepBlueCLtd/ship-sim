import { Button, Layout, Typography, Space, Slider, Switch } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, BulbOutlined } from '@ant-design/icons';
import { SimulationTime, ShipDictionary } from '../types';
import { ShipCards } from './ShipCards';

const { Sider } = Layout;

interface ControlPanelProps {
  onInitialize: () => void;
  simulationTime: SimulationTime;
  onToggleSimulation: () => void;
  onTrailLengthChange: (length: number) => void;
  onStepIntervalChange: (stepsPerSecond: number) => void;
  ships: ShipDictionary;
  isDarkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onInitialize,
  simulationTime,
  onToggleSimulation,
  onTrailLengthChange,
  onStepIntervalChange,
  ships,
  isDarkMode,
  onThemeChange
}) => {
  // Format the time as HH:mm
  const formattedTime = simulationTime.timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Sider width={500} style={{ background: 'inherit', padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Simulation Speed
              </Typography.Text>
              <Slider
                min={1}
                max={10}
                step={1}
                value={Math.round(1000 / simulationTime.stepInterval)}
                onChange={onStepIntervalChange}
                marks={{
                  1: '1',
                  5: '5',
                  10: '10'
                }}
                tooltip={{
                  formatter: (value) => `${value} steps/sec`
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Trail Length
              </Typography.Text>
              <Slider
                min={0}
                max={100}
                value={simulationTime.displayedTrailLength}
                onChange={onTrailLengthChange}
                marks={{
                  0: 'Off',
                  20: '20',
                  50: '50',
                  100: '100'
                }}
              />
            </div>
          </div>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Button type="primary" onClick={onInitialize} style={{ width: '100%' }}>
            +5 Ships
          </Button>
          <Button 
            type="primary" 
            icon={simulationTime.running ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={onToggleSimulation}
            style={{ width: '100%' }}
          >
            {simulationTime.running ? 'Pause Simulation' : 'Start Simulation'}
          </Button>
        </Space>

        {/* Ship status cards */}
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Typography.Title level={5} style={{ margin: '8px 0', fontSize: '14px' }}>
            Ship Status
          </Typography.Title>
          <ShipCards ships={ships} />
        </Space>
      </Space>
    </Sider>
  );
};
