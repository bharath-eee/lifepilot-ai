import React from 'react';
import { Settings as SettingsIcon, Sliders } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <SettingsIcon className="w-6 h-6 mr-2 text-neonBlue" />
          System Settings
        </h1>
        <p className="text-slate-600 text-xs mt-1">Configure credentials, email polling frequencies, and orchestrator priorities.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border-glassBorder space-y-6">
        <h2 className="text-sm font-bold text-slate-900 font-mono flex items-center">
          <Sliders className="w-4 h-4 mr-2 text-neonBlue" />
          GENERAL CONFIGURATION
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-glassBorder">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email Sync Interval</p>
              <p className="text-xs text-slate-500">How frequently LifePilot polls Gmail for changes</p>
            </div>
            <select className="bg-slate-50 text-slate-700 text-xs border border-glassBorder rounded-xl p-2.5 outline-none focus:border-neonBlue">
              <option>Every 5 Minutes</option>
              <option>Every 15 Minutes</option>
              <option>Every Hour</option>
              <option>Manual Only</option>
            </select>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-glassBorder">
            <div>
              <p className="text-sm font-semibold text-slate-800">Active LLM Model</p>
              <p className="text-xs text-slate-500">Fallback routing for cognitive orchestration tasks</p>
            </div>
            <select className="bg-slate-50 text-slate-700 text-xs border border-glassBorder rounded-xl p-2.5 outline-none focus:border-neonBlue">
              <option>DeepSeek V3 (Default)</option>
              <option>Claude 3.5 Sonnet</option>
              <option>GPT-4o</option>
              <option>Gemini 1.5 Pro</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
