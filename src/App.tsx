import { useState } from 'react';
import { Layout } from 'antd';
import { ControlPanel } from './components/ControlPanel';
import { ShipMap } from './components/ShipMap';
import { ShipDictionary } from './types';
import { generateRandomShips } from './utils/shipGenerator';
import './App.css';

const { Content } = Layout;

function App() {
  const [ships, setShips] = useState<ShipDictionary>({});

  const handleInitialize = () => {
    const newShips = generateRandomShips(5);
    const shipDictionary = newShips.reduce((acc, ship) => {
      acc[ship.id] = ship;
      return acc;
    }, {} as ShipDictionary);
    setShips(shipDictionary);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <ControlPanel onInitialize={handleInitialize} />
      <Content>
        <ShipMap ships={ships} />
      </Content>
    </Layout>
  );
}

export default App;
