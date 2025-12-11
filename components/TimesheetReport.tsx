import React, { useState } from 'react';
import { TimesheetEntry } from '../types';

const MOCK_DATA: TimesheetEntry[] = [
  { id: '1', employeeName: 'Alice Johnson', project: 'Alpha', date: '2023-10-23', hours: 8, status: 'Approved' },
  { id: '2', employeeName: 'Bob Smith', project: 'Beta', date: '2023-10-23', hours: 7.5, status: 'Pending' },
  { id: '3', employeeName: 'Charlie Brown', project: 'Alpha', date: '2023-10-24', hours: 9, status: 'Approved' },
  { id: '4', employeeName: 'Alice Johnson', project: 'Gamma', date: '2023-10-24', hours: 4, status: 'Rejected' },
  { id: '5', employeeName: 'David Lee', project: 'Beta', date: '2023-10-25', hours: 8, status: 'Approved' },
  { id: '6', employeeName: 'Eva Green', project: 'Internal', date: '2023-10-25', hours: 6, status: 'Pending' },
];

export const TimesheetReport: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [entries] = useState<TimesheetEntry[]>(MOCK_DATA);

  const filteredEntries = entries.filter(entry =>
    entry.employeeName.toLowerCase().includes(filter.toLowerCase()) ||
    entry.project.toLowerCase().includes(filter.toLowerCase())
  );

  const handleExport = () => {
    // Simulation of export functionality
    const headers = ['ID', 'Employee', 'Project', 'Date', 'Hours', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(e => `${e.id},${e.employeeName},${e.project},${e.date},${e.hours},${e.status}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'timesheet_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">匯出工時報表 (Timesheet Report)</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search employee or project..."
            className="border border-slate-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 border border-slate-200 rounded">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="p-4 border-b font-semibold text-slate-600">Employee</th>
              <th className="p-4 border-b font-semibold text-slate-600">Project</th>
              <th className="p-4 border-b font-semibold text-slate-600">Date</th>
              <th className="p-4 border-b font-semibold text-slate-600">Hours</th>
              <th className="p-4 border-b font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors border-b last:border-b-0">
                <td className="p-4 text-slate-700">{entry.employeeName}</td>
                <td className="p-4 text-slate-700">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {entry.project}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{entry.date}</td>
                <td className="p-4 font-mono font-medium text-slate-700">{entry.hours.toFixed(1)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    entry.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    entry.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No entries found matching your filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};