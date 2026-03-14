import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Eye, 
  Package,
  PieChart, 
  Settings as SettingsIcon,
  TrendingUp,
  Briefcase,
  Sprout,
  AlertCircle,
  ChevronLeft,
  LogOut,
  Plus,
  Search,
  MoreVertical,
  Filter,
  Calendar,
  Clock,
  X,
  Trash2
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import { useTranslation } from '../hooks/useTranslation';
import DashboardLayout from '../components/DashboardLayout';
import { 
  traineesData as mockTrainees, 
  tasksData as mockTasks, 
  cropStatusData as mockCrops, 
  inventoryData as mockInventory
} from '../services/mockData';
import { getDashboardStats, getTrainees, addTrainee, deleteTrainee, getTasks, addTask, updateTask, deleteTask, getCrops, getInventory } from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

interface Props {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: Props) => {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, t, tk, c, inv] = await Promise.all([
          getDashboardStats().catch(() => ({ data: null })),
          getTrainees().catch(() => ({ data: [] })),
          getTasks().catch(() => ({ data: [] })),
          getCrops().catch(() => ({ data: [] })),
          getInventory().catch(() => ({ data: [] }))
        ]);
        
        setStats(s.data);
        setTrainees(t.data.length > 0 ? t.data : mockTrainees);
        setTasks(tk.data.length > 0 ? tk.data : mockTasks);
        setCrops(c.data.length > 0 ? c.data : mockCrops);
        setInventory(inv.data.length > 0 ? inv.data : mockInventory);
      } catch (err) {
        console.error("Failed to fetch admin data", err);
        setTrainees(mockTrainees);
        setTasks(mockTasks);
        setCrops(mockCrops);
        setInventory(mockInventory);
      }
    };
    fetchData();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'trainees', label: t.trainees, icon: Users },
    { id: 'farmTask', label: t.farmTask, icon: ClipboardList },
    { id: 'cropMonitoring', label: t.cropMonitoring, icon: Eye },
    { id: 'attendanceProduction', label: t.attendance, icon: Calendar },
    { id: 'inventory', label: t.inventory, icon: Package },
    { id: 'reports', label: t.reports, icon: PieChart },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
    { id: 'collapse', label: t.collapse, icon: ChevronLeft },
    { id: 'logout', label: t.logout, icon: LogOut },
  ];

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    // Optimistic update
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        await updateTask(taskId, { ...taskToUpdate, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update task status", err);
      // Revert on error
      const originalTasks = await getTasks();
      setTasks(originalTasks.data);
    }
  };

  const handleAddTask = async (task: any) => {
    try {
      const res = await addTask(task);
      setTasks([...tasks, res.data]);
    } catch (err) {
      console.error("Failed to add task", err);
      const id = Math.max(0, ...tasks.map(t => t.id)) + 1;
      setTasks([...tasks, { ...task, id }]);
    }
  };

  const handleAddTrainee = async (trainee: any) => {
    try {
      const res = await addTrainee(trainee);
      setTrainees([...trainees, res.data]);
    } catch (err) {
      console.error("Failed to add trainee", err);
      const id = Math.max(0, ...trainees.map(t => t.id || 0)) + 1;
      setTrainees([...trainees, { ...trainee, id, efficiency: '90%', status: 'Active' }]);
    }
  };

  const handleDeleteTrainee = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this trainee?')) return;
    try {
      await deleteTrainee(id);
      setTrainees(trainees.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete trainee", err);
      // Optimistic delete for demo
      setTrainees(trainees.filter(t => t.id !== id));
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete task", err);
      // Optimistic delete for demo
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const computedStats = {
    totalTrainees: trainees.length,
    activeTasks: tasks.filter(t => t.status !== 'Completed').length,
    cropsMonitored: crops.length,
    productionYield: stats?.productionYield || 0
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      activePage={activePage}
      setActivePage={setActivePage}
      onLogout={onLogout}
      userType="Admin"
    >
      {activePage === 'dashboard' && <AdminDashboardHome stats={computedStats} />}
      {activePage === 'trainees' && <TraineesSection data={trainees} onAddTrainee={handleAddTrainee} onDeleteTrainee={handleDeleteTrainee} />}
      {activePage === 'farmTask' && <FarmTaskSection data={tasks} trainees={trainees} onUpdateTask={handleUpdateTaskStatus} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} />}
      {activePage === 'cropMonitoring' && <CropMonitoringSection data={crops} />}
      {activePage === 'attendanceProduction' && <AttendanceProductionSection />}
      {activePage === 'inventory' && <InventorySection data={inventory} />}
      {activePage === 'reports' && <ReportsSection />}
      {activePage === 'settings' && <AdminSettingsSection />}
    </DashboardLayout>
  );
};

// --- Sections ---

const AdminDashboardHome = ({ stats }: any) => {
  const { t } = useTranslation();
  
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Production (kg)',
      data: [350, 480, 410, 590, 850, 720],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div>
      <div className="grid-stats">
        <StatCard label={t.totalTrainees} val={stats?.totalTrainees || "142"} icon={Users} color="#3b82f6" />
        <StatCard label={t.activeTasks} val={stats?.activeTasks || "28"} icon={Briefcase} color="#10b981" />
        <StatCard label="Crops Monitored" val={stats?.cropsMonitored || "12"} icon={Sprout} color="#f59e0b" />
        <StatCard label={t.productionYield} val={`${stats?.productionYield || 850} kg`} icon={TrendingUp} color="#6366f1" />
      </div>

      <div className="grid-charts">
        <div className="card">
          <h3 className="text-lg font-bold mb-6">{t.productionTrends}</h3>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="card">
          <h3 className="text-lg font-bold mb-6">{t.attendanceAnalytics}</h3>
          <Bar 
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
              datasets: [{ data: [95, 88, 92, 90, 85], backgroundColor: '#3b82f6', borderRadius: 8 }]
            }}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
      </div>
    </div>
  );
};

const TraineesSection = ({ data, onAddTrainee, onDeleteTrainee }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrainee, setNewTrainee] = useState({ name: '', group_name: 'Organic Farming', status: 'Active' });

  // Helper to get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Helper for skill level based on mock efficiency
  const getSkillInfo = (eff: string) => {
    const val = parseInt(eff) || 0;
    if (val >= 95) return { label: 'Expert', class: 'skill-expert' };
    if (val >= 85) return { label: 'Advanced', class: 'skill-advanced' };
    if (val >= 75) return { label: 'Intermediate', class: 'skill-intermediate' };
    return { label: 'Beginner', class: 'skill-beginner' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTrainee(newTrainee);
    setIsModalOpen(false);
    setNewTrainee({ name: '', group_name: 'Organic Farming', status: 'Active' });
  };

  return (
    <div className="fade-in">
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="search-bar-inline">
          <Search className="icon" size={20} />
          <input type="text" placeholder="Search trainees by name or program..." />
        </div>
        <button className="btn-add-trainee" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Add New Trainee
        </button>
      </div>

      {/* Add Trainee Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card shadow-lg fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 className="font-black text-xl">Add New Trainee</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="text-sm font-bold block mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newTrainee.name}
                  onChange={(e) => setNewTrainee({ ...newTrainee, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="text-sm font-bold block mb-2">Program / Group</label>
                <select 
                  value={newTrainee.group_name}
                  onChange={(e) => setNewTrainee({ ...newTrainee, group_name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                >
                  <option value="Organic Farming">Organic Farming</option>
                  <option value="Dairy Management">Dairy Management</option>
                  <option value="Poultry Farming">Poultry Farming</option>
                </select>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label className="text-sm font-bold block mb-2">Initial Status</label>
                <select 
                  value={newTrainee.status}
                  onChange={(e) => setNewTrainee({ ...newTrainee, status: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                >
                  <option value="Active">Active</option>
                  <option value="Training">Training</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <button className="btn btn-primary w-100" type="submit" style={{ padding: '1rem', background: '#10b981' }}>
                Add Trainee
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ background: 'white' }}>
          <thead>
            <tr>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>TRAINEE NAME</th>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>PROGRAM</th>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>TASKS</th>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>SKILL LEVEL</th>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>ATTENDANCE</th>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>STATUS</th>
              <th style={{ background: '#f8fafc', padding: '1.25rem' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => {
              const skill = getSkillInfo(row.efficiency);
              const attendance = parseInt(row.efficiency) + 5; // Derived mockup
              return (
                <tr key={row.id}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="avatar">{getInitials(row.name)}</div>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem', color: '#64748b' }}>{row.group_name || "Organic Farming"}</td>
                  <td style={{ padding: '1.25rem', color: '#64748b' }}>{Math.floor(Math.random() * 30) + 5}</td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={`skill-badge ${skill.class}`}>{skill.label}</span>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="attendance-bar">
                      <div className="bar-bg">
                        <div className="bar-fill" style={{ width: `${attendance}%` }}></div>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{attendance}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="status-dot">
                      <div className="dot" style={{ background: row.status === 'Active' ? '#10b981' : '#94a3b8' }}></div>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{row.status}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={{ background: 'none', color: '#94a3b8' }}>
                        <MoreVertical size={20} />
                      </button>
                      <button 
                        onClick={() => onDeleteTrainee(row.id)}
                        style={{ background: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Delete Trainee"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FarmTaskSection = ({ data, trainees, onUpdateTask, onAddTask, onDeleteTask }: any) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'schedule'>('kanban');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ priority: '', assignee: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // New Task State
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    zone: 'Zone A', 
    urgency: 'Medium', 
    status: 'Pending', 
    assignee: '', 
    scheduled_date: new Date().toISOString().split('T')[0] 
  });

  const columns = [
    { title: 'To Do', status: 'Pending' },
    { title: 'In Progress', status: 'In Progress' },
    { title: 'Completed', status: 'Completed' }
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  const onDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, newStatus: string) => {
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    onUpdateTask(taskId, newStatus);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask(newTask);
    setIsNewTaskOpen(false);
    setNewTask({ 
      title: '', 
      zone: 'Zone A', 
      urgency: 'Medium', 
      status: 'Pending', 
      assignee: '', 
      scheduled_date: new Date().toISOString().split('T')[0] 
    });
  };

  const filteredTasks = data.filter((task: any) => {
    const priorityMatch = !filters.priority || task.urgency === filters.priority;
    const assigneeMatch = !filters.assignee || task.assignee === filters.assignee;
    return priorityMatch && assigneeMatch;
  });

  const scheduledTasks = filteredTasks.filter((task: any) => {
    if (!task.scheduled_date) return false;
    const taskDate = task.scheduled_date.split('T')[0];
    return taskDate === selectedDate;
  });

  const assignees = Array.from(new Set(trainees.map((tr: any) => tr.name))) as string[];

  return (
    <div className="fade-in">
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn-outline ${filterOpen ? 'active' : ''}`}
            onClick={() => setFilterOpen(!filterOpen)}
            style={{ borderColor: filterOpen ? 'var(--primary)' : '#e2e8f0', background: filterOpen ? '#ecfdf5' : 'white' }}
          >
            <Filter size={18} />
            Filter
          </button>
          <button 
            className={`btn-outline ${viewMode === 'schedule' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'kanban' ? 'schedule' : 'kanban')}
            style={{ borderColor: viewMode === 'schedule' ? 'var(--primary)' : '#e2e8f0', background: viewMode === 'schedule' ? '#ecfdf5' : 'white' }}
          >
            <Calendar size={18} />
            {viewMode === 'kanban' ? 'Schedule' : 'Board View'}
          </button>
        </div>
        

        {filterOpen && (
          <div className="card shadow-lg" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: '0.5rem', width: '300px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 className="font-bold">Filters</h4>
              <button onClick={() => setFilterOpen(false)}><X size={18} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="text-sm font-bold block mb-2">Priority</label>
              <select 
                value={filters.priority} 
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              >
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="text-sm font-bold block mb-2">Assignee</label>
              <select 
                value={filters.assignee} 
                onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              >
                <option value="">All Assignees</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <button 
              className="btn btn-secondary text-sm w-100" 
              onClick={() => { setFilters({ priority: '', assignee: '' }); setFilterOpen(false); }}
              style={{ padding: '0.5rem' }}
            >
              Reset Filters
            </button>
          </div>
        )}

        <button className="btn-add-trainee" onClick={() => setIsNewTaskOpen(true)}>
          <Plus size={20} />
          New Task
        </button>
      </div>

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="card shadow-lg fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 className="font-black text-xl">Create New Task</h3>
              <button onClick={() => setIsNewTaskOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleAddTaskSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="text-sm font-bold block mb-2">Task Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Organic Spray Zone C"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="text-sm font-bold block mb-2">Assignee</label>
                  <select 
                    required
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                  >
                    <option value="">Select Trainee</option>
                    {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-2">Scheduled Date</label>
                  <input 
                    type="date" 
                    required
                    value={newTask.scheduled_date}
                    onChange={(e) => setNewTask({ ...newTask, scheduled_date: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label className="text-sm font-bold block mb-2">Priority</label>
                  <select 
                    value={newTask.urgency}
                    onChange={(e) => setNewTask({ ...newTask, urgency: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-2">Zone</label>
                  <select 
                    value={newTask.zone}
                    onChange={(e) => setNewTask({ ...newTask, zone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                  >
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <button className="btn btn-primary w-100" type="submit" style={{ padding: '1rem' }}>
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="kanban-board">
          {columns.map((col) => {
            const tasks = filteredTasks.filter((t: any) => t.status === col.status);
            return (
              <div 
                key={col.status} 
                className="kanban-column"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.status)}
              >
                <div className="kanban-header">
                  <div className="kanban-title">
                    {col.title}
                    <span className="count-badge">{tasks.length}</span>
                  </div>
                  <button style={{ background: 'none', color: '#94a3b8' }}>
                    <Plus size={20} />
                  </button>
                </div>

                <div className="column-content" style={{ minHeight: '500px' }}>
                  {tasks.map((task: any, i: number) => (
                    <div 
                      key={task.id || i} 
                      className="task-card"
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      style={{ cursor: 'grab' }}
                    >
                      <span className={`priority-badge priority-${task.urgency.toLowerCase()}`}>
                         {task.urgency}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 className="task-name" style={{ margin: 0 }}>{task.title}</h4>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                          title="Delete Task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="task-meta">
                        <Clock size={16} />
                        <span>{task.scheduled_date || (task.status === 'Completed' ? 'Yesterday' : 'Today')}</span>
                      </div>
                      <div className="task-footer">
                        <div className="avatar assignee-avatar" style={{ background: col.status === 'Completed' ? '#dcfce7' : '#f1f5f9', color: col.status === 'Completed' ? '#15a34a' : '#64748b' }}>
                          {getInitials(task.assignee || "Rohan Mehra")}
                        </div>
                        <span className="assignee-name">{task.assignee || "Rohan Mehra"}</span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#cbd5e1', border: '2px dashed #f1f5f9', borderRadius: '1.25rem' }}>
                      No tasks found
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card fade-in" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'center' }}>
            <h3 className="font-black text-xl">Schedule View</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 700 }}
              />
              <span className="text-slate-500 font-bold">
                {scheduledTasks.length} tasks planned for this day
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {scheduledTasks.length > 0 ? scheduledTasks.map((task: any, i: number) => (
              <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '1rem', minWidth: '100px', textAlign: 'center' }}>
                    <span className="text-xs font-bold text-slate-400 block mb-1">STATUS</span>
                    <span className={`badge ${task.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{task.status}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{task.title}</h4>
                    <span className="text-sm text-slate-500">{task.zone} • {task.urgency} Priority</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span className="block font-bold">{task.assignee}</span>
                    <span className="text-xs text-slate-500">Assignee</span>
                  </div>
                  <div className="avatar" style={{ background: 'white' }}>{getInitials(task.assignee)}</div>
                  <button 
                    onClick={() => onDeleteTask(task.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '1rem' }}
                    title="Delete Task"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#cbd5e1' }}>
                <Calendar size={48} className="mx-auto mb-4" />
                <p className="text-lg font-bold">No tasks scheduled for {selectedDate}</p>
                <p>Try selecting another date or check the Board View.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CropMonitoringSection = ({ data }: any) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {data.map((crop: any, i: number) => (
        <div key={i} className="card">
          <div style={{ height: '120px', background: '#f8fafc', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
             <Sprout size={48} />
          </div>
          <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>{crop.name}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: 'var(--text-muted)' }}>{t.growthStage}</span>
               <span style={{ fontWeight: 700 }}>{crop.stage}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: 'var(--text-muted)' }}>Health</span>
               <span className={`badge ${crop.health === 'Healthy' ? 'badge-success' : 'badge-danger'}`}>{crop.health}</span>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AttendanceProductionSection = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'scanner' | 'camera' | 'manual'>('scanner');
  const [log, setLog] = useState([
    { name: 'Arjun Das', time: '08:11 AM', method: 'QR Scan', status: 'Present' },
    { name: 'Priya Singh', time: '08:12 AM', method: 'QR Scan', status: 'Present' },
    { name: 'Rohan Mehra', time: '08:13 AM', method: 'QR Scan', status: 'Late' },
    { name: 'Sita Devi', time: '08:14 AM', method: 'QR Scan', status: 'Present' },
    { name: 'Vikram Patel', time: '08:15 AM', method: 'QR Scan', status: 'Present' },
    { name: 'Meera Kumari', time: '08:16 AM', method: 'QR Scan', status: 'Present' },
  ]);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock trainees for manual entry dropdown
  const mockTrainees = [
    { id: 1, name: 'Arjun Das' },
    { id: 2, name: 'Priya Singh' },
    { id: 3, name: 'Rohan Mehra' },
    { id: 4, name: 'Sita Devi' },
    { id: 5, name: 'Vikram Patel' },
    { id: 6, name: 'Meera Kumari' },
    { id: 7, name: 'Amit Sharma' },
    { id: 8, name: 'Neha Gupta' },
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainee) return;
    
    const newEntry = {
      name: selectedTrainee,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: 'Manual',
      status: 'Present'
    };
    
    setLog([newEntry, ...log]);
    setSuccessMsg(t.logSuccess);
    setMode('scanner');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const activateCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error", err);
      alert(t.cameraError);
      setMode('scanner');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setMode('scanner');
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 2fr', gap: '2rem' }}>
      {/* Left Column: Check-in & Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-lg font-bold mb-8">{t.traineeCheckIn}</h3>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {mode === 'scanner' && (
              <>
                <div className="qr-scanner-mockup">
                  <div className="qr-inner">
                    {[...Array(16)].map((_, i) => <div key={i} className="qr-block"></div>)}
                  </div>
                  <div className="qr-line"></div>
                </div>
                {successMsg && <div style={{ color: '#059669', fontWeight: 700, marginBottom: '1rem' }} className="fade-in">{successMsg}</div>}
                <p className="text-slate-500 text-sm mb-8 px-8">{t.qrInstruction}</p>
                <div className="btn-group-row">
                  <button onClick={() => setMode('manual')} className="btn btn-secondary">{t.manualEntry}</button>
                  <button onClick={activateCamera} className="btn btn-primary" style={{ background: '#059669' }}>{t.activateCamera}</button>
                </div>
              </>
            )}

            {mode === 'camera' && (
              <div className="fade-in">
                <div className="qr-scanner-mockup" style={{ padding: 0, overflow: 'hidden', background: '#000' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <button onClick={stopCamera} className="btn btn-secondary">{t.back}</button>
              </div>
            )}

            {mode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="fade-in" style={{ padding: '0 2rem' }}>
                <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t.selectTrainee}</label>
                  <select 
                    value={selectedTrainee} 
                    onChange={(e) => setSelectedTrainee(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                    required
                  >
                    <option value="">-- {t.selectTrainee} --</option>
                    {mockTrainees.map((tr: any) => (
                      <option key={tr.id} value={tr.name}>{tr.name}</option>
                    ))}
                  </select>
                </div>
                <div className="btn-group-row">
                  <button type="button" onClick={() => setMode('scanner')} className="btn btn-secondary">{t.back}</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#059669' }}>{t.submit}</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="attendance-summary-grid">
          <div className="summary-card">
            <span className="summary-val text-success">{128 + log.filter(l => l.method === 'Manual').length}</span>
            <span className="summary-label">{t.present}</span>
          </div>
          <div className="summary-card">
            <span className="summary-val text-danger">12</span>
            <span className="summary-label">{t.absent}</span>
          </div>
          <div className="summary-card">
            <span className="summary-val text-warning">4</span>
            <span className="summary-label">{t.late}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Daily Log */}
      <div className="card" style={{ padding: '2rem' }}>
        <div className="daily-log-header">
          <h3 className="text-lg font-black">{t.dailyLog} — 14/3/2026</h3>
          <a href="#" className="export-csv">
            <Plus size={16} style={{ transform: 'rotate(45deg)' }} /> {/* Simulated Export Icon */}
            {t.exportCsv}
          </a>
        </div>

        <table style={{ background: 'white' }}>
          <thead>
            <tr>
              <th style={{ background: 'transparent' }}>{t.trainee}</th>
              <th style={{ background: 'transparent' }}>{t.checkIn}</th>
              <th style={{ background: 'transparent' }}>{t.method}</th>
              <th style={{ background: 'transparent' }}>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {log.map((row: any, i: number) => (
              <tr key={i} className="fade-in">
                <td style={{ padding: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{row.name}</td>
                <td style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.875rem' }}>{row.time}</td>
                <td style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.875rem' }}>{row.method}</td>
                <td style={{ padding: '1.25rem' }}>
                  <span className={`badge ${row.status === 'Present' ? 'badge-success' : 'badge-warning'}`} style={{ padding: '0.35rem 0.85rem' }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InventorySection = ({ data }: any) => {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table>
        <thead>
          <tr>
            <th>{t.name}</th>
            <th>Category</th>
            <th>{t.quantity}</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: 700 }}>{row.item}</td>
              <td>{row.category}</td>
              <td style={{ fontWeight: 800 }}>{row.stock}</td>
              <td style={{ color: 'var(--text-muted)' }}>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ReportsSection = () => {
  const { t } = useTranslation();
  return (
    <div className="grid-charts">
      <div className="card">
        <h3 className="text-lg font-bold mb-6">{t.productionTrends}</h3>
        <Radar 
          data={{
            labels: ['Tomatoes', 'Potatoes', 'Chillies', 'Eggplant', 'Cabbage'],
            datasets: [{ label: 'Score', data: [80, 95, 70, 60, 85], backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6' }]
          }}
        />
      </div>
      <div className="card">
        <h3 className="text-lg font-bold mb-6">{t.taskCompletion}</h3>
        <Doughnut 
          data={{
            labels: ['Completed', 'Pending', 'Overdue'],
            datasets: [{ data: [65, 25, 10], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }]
          }}
          options={{ cutout: '70%' }}
        />
      </div>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3 className="text-lg font-bold mb-6">{t.attendanceAnalytics}</h3>
        <Line 
          data={{
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [{ label: 'Avg Attendance', data: [88, 92, 90, 85, 95], borderColor: '#10b981', tension: 0.3 }]
          }}
          options={{ responsive: true }}
        />
      </div>
    </div>
  );
};

const AdminSettingsSection = () => {
  const { t } = useTranslation();
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <AlertCircle size={48} className="text-slate-200 mx-auto mb-6" />
      <h3 className="text-xl font-bold mb-4">Admin {t.settings}</h3>
      <p className="text-slate-500 mb-8">System configuration and access control.</p>
      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button className="btn" style={{ background: '#f8fafc', width: '100%', textAlign: 'left' }}>Database Management</button>
        <button className="btn" style={{ background: '#f8fafc', width: '100%', textAlign: 'left' }}>API Configuration</button>
        <button className="btn" style={{ background: '#f8fafc', width: '100%', textAlign: 'left' }}>User Permissions</button>
      </div>
    </div>
  );
};

// --- Helpers ---

const StatCard = ({ label, val, icon: Icon, color }: any) => (
  <div className="card stat-card">
    <div className="stat-icon" style={{ backgroundColor: color }}>
      <Icon size={24} />
    </div>
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>{label}</p>
      <h4 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{val}</h4>
    </div>
  </div>
);

export default AdminDashboard;
