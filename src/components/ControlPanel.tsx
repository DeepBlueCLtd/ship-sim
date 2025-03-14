import { Button, Layout, Typography, Space, Slider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { SimulationTime } from '../types';

const { Sider } = Layout;

interface ControlPanelProps {
  onInitialize: () => void;
  simulationTime: SimulationTime;
  onToggleSimulation: () => void;
  onTrailLengthChange: (length: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onInitialize,
  simulationTime,
  onToggleSimulation,
  onTrailLengthChange
}) => {
  // Format the time as HH:mm
  const formattedTime = simulationTime.timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Sider width={300} style={{ background: '#fff', padding: '20px' }}>
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
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>
              Trail Length
            </Typography.Title>
            <Slider
              min={0}
              max={100}
              value={simulationTime.trailLength}
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
      </Space>
    </Sider>
  );
};
