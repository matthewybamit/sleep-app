import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Circle, Plus, Trash2, Edit2, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'Hygiene', label: '🧼 Hygiene', icon: '🧼' },
  { value: 'Relaxation', label: '🧘 Relaxation', icon: '🧘' },
  { value: 'Preparation', label: '📝 Preparation', icon: '📝' },
  { value: 'General', label: '⭐ General', icon: '⭐' }
];

export default function Routine() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: taskData } = await supabase
      .from('routine_tasks')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });
    const { data: compData } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('completed_date', new Date().toISOString().split('T')[0]);
    
    if (taskData) setTasks(taskData);
    if (compData) setCompletions(compData.map(c => c.task_id));
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    const { error } = await supabase.from('routine_tasks').insert({
      user_id: user.id,
      title: newTask,
      category: newCategory
    });
    if (!error) {
      setNewTask('');
      setNewCategory('General');
      fetchData();
    }
  }

  async function toggleTask(taskId) {
    const isCompleted = completions.includes(taskId);
    const today = new Date().toISOString().split('T')[0];

    if (isCompleted) {
      await supabase.from('task_completions').delete().match({
        user_id: user.id,
        task_id: taskId,
        completed_date: today
      });
    } else {
      await supabase.from('task_completions').insert({
        user_id: user.id,
        task_id: taskId,
        completed_date: today
      });
    }
    fetchData();
  }

  async function deleteTask(taskId) {
    await supabase.from('routine_tasks').delete().eq('id', taskId);
    fetchData();
  }

  function openEditModal(task) {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category || 'General');
  }

  async function saveEdit() {
    if (!editTitle.trim()) return;
    const { error } = await supabase
      .from('routine_tasks')
      .update({ title: editTitle, category: editCategory })
      .eq('id', editingTask.id);
    
    if (!error) {
      setEditingTask(null);
      fetchData();
    }
  }

  const progress = tasks.length > 0 ? (completions.length / tasks.length) * 100 : 0;

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc, task) => {
    const cat = task.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Tonight's Routine</h2>
        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
          <span>{completions.length} / {tasks.length} Completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Grouped Task List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
        {Object.keys(groupedTasks).length > 0 ? (
          Object.entries(groupedTasks).map(([category, categoryTasks]) => {
            const categoryInfo = CATEGORIES.find(c => c.value === category) || CATEGORIES[3];
            return (
              <div key={category}>
                <div className="bg-slate-900/50 px-4 py-2 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-slate-300">
                    {categoryInfo.icon} {category}
                  </h3>
                </div>
                {categoryTasks.map(task => {
                  const isDone = completions.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`p-4 border-b border-white/5 flex items-center justify-between transition-all ${
                        isDone ? 'bg-green-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="flex items-center gap-4 cursor-pointer flex-1"
                        onClick={() => toggleTask(task.id)}
                      >
                        {isDone ? (
                          <CheckCircle2 className="text-green-400" size={24} />
                        ) : (
                          <Circle className="text-slate-500" size={24} />
                        )}
                        <span className={isDone ? 'line-through text-slate-500' : 'text-white'}>
                          {task.title}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-slate-600 hover:text-indigo-400 p-2 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500">
            <p>No tasks yet. Add your first habit below!</p>
          </div>
        )}
      </div>

      {/* Add New Task Form */}
      <form onSubmit={addTask} className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Add new habit..."
            className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            Add
          </button>
        </div>
      </form>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Task Name</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Category</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
