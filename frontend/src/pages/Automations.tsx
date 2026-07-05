import React from 'react';
import { Zap, Cpu } from 'lucide-react';

export const Automations: React.FC = () => {
  const rules = [
    { trigger: "Receive Amazon Invoice", action: "Save PDF -> Extract Amount -> Add Expense", active: true },
    { trigger: "College Exam Timetable update", action: "Mark Important -> Create Calendar Sync -> Notify", active: true },
    { trigger: "Bank Account Alerts", action: "Extract Balance -> Flag Alert", active: false }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-neonBlue" />
          Automation Engine
        </h1>
        <p className="text-slate-600 text-xs mt-1">Configure natural language triggers that drive productivity rules.</p>
      </div>

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-slate-100 border border-glassBorder rounded-xl text-neonBlue">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trigger: {rule.trigger}</h3>
                <p className="text-xs text-slate-600 font-mono mt-1">&rarr; {rule.action}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`text-[10px] font-mono font-bold py-1 px-2.5 rounded-full ${
                rule.active ? 'bg-neonGreen/10 text-neonGreen border border-neonGreen/20' : 'bg-slate-100 text-slate-500 border border-glassBorder'
              }`}>
                {rule.active ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
