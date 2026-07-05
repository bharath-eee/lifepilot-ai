import React from 'react';
import { BarChart3, DollarSign, Calendar, Clock } from 'lucide-react';

export const Analytics: React.FC = () => {
  const categories = [
    { name: 'Tuition', amount: 45000, percentage: 88, color: 'bg-neonPurple' },
    { name: 'Electricity', amount: 1240, percentage: 3, color: 'bg-neonOrange' },
    { name: 'Internet', amount: 799, percentage: 2, color: 'bg-neonBlue' },
    { name: 'Shopping', amount: 1450, percentage: 4, color: 'bg-neonPink' },
    { name: 'Other', amount: 1500, percentage: 3, color: 'bg-slate-500' }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-neonBlue" />
          Analytics & Expense Reporting
        </h1>
        <p className="text-slate-600 text-xs mt-1">Productivity metrics and auto-extracted bill categories summaries.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Core Stats */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-mono">TOTAL INVOICED</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹49,989</p>
          </div>
          <div className="p-3 bg-neonBlue/15 text-neonBlue rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-mono">TASKS COMPLETED</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">42 / 48</p>
          </div>
          <div className="p-3 bg-neonPurple/15 text-neonPurple rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-mono">AVG EXTRACTION TIME</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">1.2s</p>
          </div>
          <div className="p-3 bg-neonGreen/15 text-neonGreen rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category chart */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h2 className="text-sm font-bold text-slate-900 font-mono">EXPENSES BY CATEGORY</h2>
        <div className="space-y-4">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">{cat.name}</span>
                <span className="text-slate-800">₹{cat.amount} ({cat.percentage}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-glassBorder">
                <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
