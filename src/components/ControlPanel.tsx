import { Button, Layout } from 'antd';

const { Sider } = Layout;

interface ControlPanelProps {
  onInitialize: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onInitialize }) => {
  return (
    <Sider width={300} style={{ background: '#fff', padding: '20px' }}>
      <h2>Ship Controls</h2>
      <Button type="primary" onClick={onInitialize} style={{ width: '100%' }}>
        Initialize Ships
      </Button>
    </Sider>
  );
};
