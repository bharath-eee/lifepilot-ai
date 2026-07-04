import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Task {
  id: string;
  title: string;
  due: string;
  completed: boolean;
  priority: string;
}

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTasks(data);
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchTasks();
    }
  }, [token]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const response = await fetch('http://localhost:8000/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          due: 'Today',
          completed: false,
          priority: 'Medium'
        })
      });
      if (response.ok) {
        const newTask = await response.json();
        setTasks(prev => [...prev, newTask]);
        setNewTitle('');
      }
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/tasks/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(t => t.id === id ? updatedTask : t));
      }
    } catch (err) {
      console.error("Failed to toggle task", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center">
          <CheckSquare className="w-6 h-6 mr-2 text-neonPurple" />
          AI Task Manager
        </h1>
        <p className="text-slate-400 text-xs mt-1">Manage daily objectives compiled from emails, bills, and conversational notes.</p>
      </div>

      <form onSubmit={handleAddTask} className="flex gap-3">
        <input 
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new objective..."
          className="flex-1 glass-input py-3 px-4 text-sm"
        />
        <button type="submit" className="px-5 bg-gradient-to-r from-neonBlue to-neonPurple text-white rounded-xl font-bold flex items-center">
          <Plus className="w-4 h-4 mr-1.5" />
          Add
        </button>
      </form>

      <div className="glass-panel p-6 rounded-2xl border-glassBorder space-y-4">
        {loading ? (
          <div className="text-center py-6 text-slate-500 font-mono text-xs">Loading Tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-slate-500 font-mono text-xs">No active tasks. Get started!</div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-glassBorder rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={() => handleToggle(task.id)}
                  className="w-4 h-4 text-neonPurple bg-bgDarker border-glassBorder rounded focus:ring-neonPurple/30"
                />
                <span className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {task.title}
                </span>
              </div>
              <button onClick={() => handleDelete(task.id)} className="text-slate-500 hover:text-critical p-1 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
