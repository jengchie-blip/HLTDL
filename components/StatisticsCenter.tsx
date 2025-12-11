import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { SystemStat } from '../types';

const MOCK_STATS: SystemStat[] = Array.from({ length: 20 }, (_, i) => ({
  timestamp: `${10 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`,
  cpuUsage: 20 + Math.random() * 40,
  memoryUsage: 40 + Math.random() * 30,
  activeUsers: 100 + Math.floor(Math.random() * 50),
  requestLatency: 50 + Math.random() * 100
}));

export const StatisticsCenter: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full pb-6">
      <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
        <h2 className="text-xl font-bold text-slate-800 mb-4">統計監控中心 - System Load</h2>
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_STATS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '