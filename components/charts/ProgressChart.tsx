"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ProgressPoint {
  date: string;
  wpm: number;
}

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-nova-muted">Not enough data to display chart.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
        <XAxis dataKey="date" stroke="#747a7e" tick={{ fill: '#747a7e', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis stroke="#747a7e" tick={{ fill: '#747a7e', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#15181a', border: '1px solid rgba(227,182,75,0.32)', borderRadius: '12px', color: '#f0eee7', boxShadow: '0 18px 48px rgba(0,0,0,0.35)' }}
          itemStyle={{ color: '#e3b64b', fontWeight: 'bold' }}
        />
        <Line 
          type="monotone" 
          dataKey="wpm" 
          stroke="#e3b64b" 
          strokeWidth={3}
          dot={{ r: 4, fill: '#15181a', stroke: '#e3b64b', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#e3b64b', stroke: '#f1d48c', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
