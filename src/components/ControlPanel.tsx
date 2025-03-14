import { Button, Layout, Typography, Space, Slider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
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
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onInitialize,
  simulationTime,
  onToggleSimulation,
  onTrailLengthChange,
  onStepIntervalChange,
  ships
}) => {
  // Format the time as HH:mm
  const formattedTime = simulationTime.timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Sider width={500} style={{ background: '#fff', padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Ship Controls
          </Typography.Title>
        </div>

        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Simulation Time
          </Typography.Title>
          <Typography.Text style={{ fontSize: '24px', display: 'block' }}>
            {formattedTime}
          </Typography.Text>
          <div style={{ marginTop: '8px' }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              Simulation Speed: {Math.round(1000 / simulationTime.stepInterval)} steps/sec
              <br />
              <span style={{ fontSize: '11px' }}>Each step advances time by 1 minute</span>
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
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
              Displayed Trail Length
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              Number of past positions to show
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

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" onClick={onInitialize} style={{ width: '100%' }}>
              Initialize Ships
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
