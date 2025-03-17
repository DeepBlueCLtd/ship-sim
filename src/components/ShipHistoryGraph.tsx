import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Brush
} from 'recharts';
import { Ship } from '../types';
import { Typography } from 'antd';

interface ShipHistoryGraphProps {
  ship: Ship;
  isDarkMode: boolean;
}

export const ShipHistoryGraph: React.FC<ShipHistoryGraphProps> = ({ ship, isDarkMode }) => {
  // Format data for the chart - reverse to get chronological order
  const data = [...ship.trail].reverse().map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    timestamp: point.timestamp,
    heading: point.heading,
    speed: point.speed,
    demandedCourse: point.demandedCourse,
    demandedSpeed: point.demandedSpeed,
    avoidingLand: point.avoidingLand ? 'Yes' : 'No'
  }));

  // Add current position as the latest point
  data.push({
    time: new Date().toLocaleTimeString(),
    timestamp: new Date(),
    heading: ship.heading,
    speed: ship.speed,
    demandedCourse: ship.demandedCourse,
    demandedSpeed: ship.demandedSpeed,
    avoidingLand: ship.avoidingLand ? 'Yes' : 'No'
  });

  // Set chart colors based on theme
  const headingColor = isDarkMode ? '#1890ff' : '#0050b3';
  const speedColor = isDarkMode ? '#52c41a' : '#389e0d';
  const gridColor = isDarkMode ? '#303030' : '#d9d9d9';
  const textColor = isDarkMode ? '#d9d9d9' : 'rgba(0, 0, 0, 0.85)';
  const backgroundColor = isDarkMode ? '#141414' : '#ffffff';

  return (
    <div style={{ 
      marginTop: '16px', 
      backgroundColor: backgroundColor,
      padding: '16px',
      borderRadius: '4px'
    }}>
      <Typography.Title level={5} style={{ 
        margin: '0 0 16px 0', 
        color: textColor,
        fontSize: '14px'
      }}>
        Ship History - {ship.name}
      </Typography.Title>
      
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="time" 
              stroke={textColor}
              tick={{ fill: textColor }}
            />
            <YAxis 
              yAxisId="heading" 
              domain={[0, 360]} 
              stroke={headingColor}
              tick={{ fill: textColor }}
              label={{ 
                value: 'Course (°)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: textColor }
              }}
            />
            <YAxis 
              yAxisId="speed" 
              orientation="right" 
              domain={[0, 'auto']} 
              stroke={speedColor}
              tick={{ fill: textColor }}
              label={{ 
                value: 'Speed (kts)', 
                angle: 90, 
                position: 'insideRight',
                style: { fill: textColor }
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
                border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                color: textColor
              }}
              itemStyle={{ color: textColor }}
              labelStyle={{ color: textColor, fontWeight: 'bold' }}
            />
            <Legend 
              wrapperStyle={{ color: textColor }}
            />
            <Line 
              yAxisId="heading"
              type="monotone" 
              dataKey="heading" 
              name="Course" 
              stroke={headingColor} 
              activeDot={{ r: 8 }}
              dot={{ r: 3 }}
            />
            <Line 
              yAxisId="heading"
              type="monotone" 
              dataKey="demandedCourse" 
              name="Demanded Course" 
              stroke={headingColor} 
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
            <Line 
              yAxisId="speed"
              type="monotone" 
              dataKey="speed" 
              name="Speed" 
              stroke={speedColor} 
              activeDot={{ r: 8 }}
              dot={{ r: 3 }}
            />
            <Line 
              yAxisId="speed"
              type="monotone" 
              dataKey="demandedSpeed" 
              name="Demanded Speed" 
              stroke={speedColor} 
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
            <Brush 
              dataKey="time" 
              height={30} 
              stroke={isDarkMode ? '#177ddc' : '#1890ff'}
              fill={isDarkMode ? '#141414' : '#ffffff'}
              tickFormatter={() => ''}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
