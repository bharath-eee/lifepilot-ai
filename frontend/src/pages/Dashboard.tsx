import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  Mail, 
  Receipt, 
  TrendingUp, 
  AlertCircle, 
  Plus,
  TrendingDown,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Task {
  id: string;
  title: string;
  due: string;
  completed: boolean;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface Bill {
  id: string;
  vendor: string;
  amount: number;
  due: string;
  status: 'Unpaid' | 'Paid';
}

interface MailItem {
  id: string;
  sender: string;
  subject: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

export const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tasksRes = await fetch(`${API_BASE_URL}/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData);
        }

        const billsRes = await fetch(`${API_BASE_URL}/bills`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (billsRes.ok) {
          const billsData = await billsRes.json();
          setBills(billsData);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const emails: MailItem[] = [
    { id: '1', sender: 'Microsoft Careers', subject: 'Interview Confirmation - Summer Internship', category: 'Work', priority: 'Critical' },
    { id: '2', sender: 'State Bank of India', subject: 'Urgent: High-value Transaction Alert', category: 'Banking', priority: 'High' },
    { id: '3', sender: 'Prof. Sharma (HOD)', subject: 'Timetable updates for End-sem Exams', category: 'College', priority: 'Critical' }
  ];

  const handleToggleTask = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(t => t.id === id ? updatedTask : t));
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handlePayBill = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bills/${id}/pay`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const updatedBill = await response.json();
        setBills(bills.map(b => b.id === id ? updatedBill : b));
      }
    } catch (err) {
      console.error("Failed to pay bill:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* AI Planner Banner */}
      <div className="relative p-6 md:p-8 rounded-3xl glass-panel overflow-hidden border-neonBlue/20 shadow-neonBlue/5">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-gradient-to-br from-neonBlue/10 to-neonPurple/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
              Good Morning, <span className="gradient-text glow-text-blue">Bharath</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl">
              Here is your AI productivity blueprint for today. I've highlighted 3 critical tasks and 1 upcoming payment requiring immediate action.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/5 py-2.5 px-4 rounded-2xl border border-glassBorder self-start md:self-auto">
            <Clock className="w-5 h-5 text-neonBlue animate-pulse" />
            <div className="text-left font-mono">
              <p className="text-xs text-slate-500">SYSTEM TIME</p>
              <p className="text-sm font-semibold text-white">03-JULY-2026 23:20</p>
            </div>
          </div>
        </div>

        {/* Dynamic AI Suggestions Panel */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-glassBorder/60 pt-6">
          <div className="flex items-start space-x-3 bg-white/[0.02] p-4 rounded-xl border border-glassBorder/40">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-critical/10 flex items-center justify-center text-critical">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500 font-mono">CRITICAL ACTION</p>
              <p className="text-sm text-slate-200 mt-0.5">Electricity bill of <span className="font-semibold text-neonOrange">₹1,240</span> is due tomorrow.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 bg-white/[0.02] p-4 rounded-xl border border-glassBorder/40">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-neonBlue/10 flex items-center justify-center text-neonBlue">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500 font-mono">CALENDAR CHECK</p>
              <p className="text-sm text-slate-200 mt-0.5">Free slot detected between 2 PM - 4 PM today for interview prep.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 bg-white/[0.02] p-4 rounded-xl border border-glassBorder/40 sm:col-span-2 lg:col-span-1">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-neonPurple/10 flex items-center justify-center text-neonPurple">
              <Mail className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500 font-mono">EMAIL INSIGHTS</p>
              <p className="text-sm text-slate-200 mt-0.5">Microsoft sent interview invitation. Replying required.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tasks Card */}
        <div className="glass-panel rounded-2xl p-6 border-glassBorder flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-neonPurple" />
              <h2 className="text-lg font-bold text-white">Today's Tasks</h2>
            </div>
            <button className="p-1.5 rounded-lg bg-white/5 border border-glassBorder text-slate-400 hover:text-white hover:border-neonPurple/30 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                  task.completed 
                    ? 'bg-white/[0.01] border-glassBorder/30 opacity-55' 
                    : 'bg-white/[0.02] border-glassBorder hover:border-neonPurple/30'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input 
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    className="mt-1 w-4 h-4 rounded border-glassBorder bg-bgDarker text-neonPurple focus:ring-neonPurple/30"
                  />
                  <div>
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Due {task.due}</p>
                  </div>
                </div>
                
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  task.priority === 'Critical' ? 'bg-critical/10 text-critical border border-critical/20' :
                  task.priority === 'High' ? 'bg-high/10 text-high border border-high/20' :
                  task.priority === 'Medium' ? 'bg-medium/10 text-medium border border-medium/20' :
                  'bg-low/10 text-low border border-low/20'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Important Mail Widget */}
        <div className="glass-panel rounded-2xl p-6 border-glassBorder flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-neonBlue" />
              <h2 className="text-lg font-bold text-white">Important Mail</h2>
            </div>
            <span className="text-xs font-mono py-0.5 px-2 bg-neonBlue/15 text-neonBlue rounded-full border border-neonBlue/30">
              3 Urgent
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {emails.map(email => (
              <div 
                key={email.id} 
                className="bg-white/[0.02] border border-glassBorder hover:border-neonBlue/30 p-3.5 rounded-xl transition-all duration-300 flex justify-between items-start"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neonBlue font-semibold">{email.sender}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-glassBorder" />
                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{email.category}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{email.subject}</p>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  email.priority === 'Critical' ? 'bg-critical/15 text-critical' : 'bg-high/15 text-high'
                }`}>
                  {email.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bills Widget */}
        <div className="glass-panel rounded-2xl p-6 border-glassBorder flex flex-col h-[400px] md:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-neonGreen" />
              <h2 className="text-lg font-bold text-white">Upcoming Bills</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Unpaid: 2</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {bills.map(bill => (
              <div 
                key={bill.id} 
                className={`flex justify-between items-center p-3.5 rounded-xl border transition-all duration-300 ${
                  bill.status === 'Paid' 
                    ? 'bg-white/[0.01] border-glassBorder/30 opacity-55' 
                    : 'bg-white/[0.02] border-glassBorder hover:border-neonGreen/30'
                }`}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-200">{bill.vendor}</p>
                  <p className="text-xs text-slate-500">₹{bill.amount} &bull; Due {bill.due}</p>
                </div>
                
                {bill.status === 'Paid' ? (
                  <span className="text-xs text-neonGreen bg-neonGreen/10 px-3 py-1.5 rounded-xl border border-neonGreen/20 font-semibold font-mono">
                    PAID
                  </span>
                ) : (
                  <button 
                    onClick={() => handlePayBill(bill.id)}
                    className="text-xs text-white bg-neonGreen/25 hover:bg-neonGreen hover:text-black border border-neonGreen/45 px-3 py-1.5 rounded-xl font-semibold transition-all"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-panel p-6 rounded-2xl border-glassBorder flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-mono">TOTAL SPENDING (JULY)</p>
            <p className="text-2xl font-bold text-white">₹3,489</p>
            <p className="text-xs text-neonGreen flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
              -12.4% vs Last Month
            </p>
          </div>
          <div className="p-3 bg-neonGreen/10 text-neonGreen rounded-2xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-glassBorder flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-mono">EMAILS PROCESSED</p>
            <p className="text-2xl font-bold text-white">142</p>
            <p className="text-xs text-neonBlue flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              +18.5% automated
            </p>
          </div>
          <div className="p-3 bg-neonBlue/10 text-neonBlue rounded-2xl">
            <Mail className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-glassBorder flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-mono">PRODUCTIVITY SCORE</p>
            <p className="text-2xl font-bold text-white">92%</p>
            <p className="text-xs text-neonPurple flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Top 5% of users
            </p>
          </div>
          <div className="p-3 bg-neonPurple/10 text-neonPurple rounded-2xl">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
