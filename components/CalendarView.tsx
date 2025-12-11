
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, 
  Plus, Clock, AlertCircle, CheckCircle2, User as UserIcon, GripVertical,
  ArrowRight
} from 'lucide-react';
import { Task, User, Category, DateChangeRequest } from '../types';
import { Button, Modal, UserAvatar } from './Shared';
import { TaskModal } from './BusinessModals';
import { getStatusColor, getPriorityColor } from '../utils';

interface CalendarViewProps {
  tasks: Task[];
  users: User[];
  categories: Category[];
  currentUser: User;
  onAddTask: (task: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onRequestDateChange: (taskId: string, request: DateChangeRequest) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  users,
  categories,
  currentUser,
  onAddTask,
  onUpdateTask,
  onRequestDateChange
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(
    currentUser.role === 'ADMIN' ? 'ALL' : currentUser.id
  );
  
  // Drag & Drop State
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | null>(null);

  // Date Change Request State
  const [pendingDragRequest, setPendingDragRequest] = useState<{task: Task, newDate: string} | null>(null);
  const [changeReason, setChangeReason] = useState('');

  // --- Date Logic ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return days;
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 = Sunday
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const formatDateStr = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    // Format YYYY-MM-DD manually to avoid timezone shifts
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDateStr(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDateForNewTask(dateStr);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: Make drag image nicer if needed
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (dragOverDate !== dateStr) {
       setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
     // Only clear if we actually left the container, simpler to just rely on Over/Drop for now
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
       const newDeadline = formatDateStr(currentDate.getFullYear(), currentDate.getMonth(), day);
       
       // Same date check
       if (task.deadline === newDeadline) return;

       if (currentUser.role === 'ADMIN') {
          // Admin: Update Directly
          onUpdateTask(taskId, { deadline: newDeadline });
       } else {
          // User: Open Request Modal
          setPendingDragRequest({ task, newDate: newDeadline });
          setChangeReason('');
       }
    }
  };

  const handleSubmitRequest = () => {
    if (!pendingDragRequest) return;
    if (!changeReason.trim()) {
        alert("請輸入變更原因");
        return;
    }

    const request: DateChangeRequest = {
        newReceiveDate: pendingDragRequest.task.receiveDate, // Keep original start date
        newDeadline: pendingDragRequest.newDate,
        reason: changeReason,
        requesterId: currentUser.id,
        requestedAt: new Date().toISOString()
    };

    onRequestDateChange(pendingDragRequest.task.id, request);
    setPendingDragRequest(null);
    setChangeReason('');
  };

  // --- Filtering & Data Prep ---
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (selectedUserFilter !== 'ALL') {
      filtered = filtered.filter(t => t.userId === selectedUserFilter);
    }
    return filtered;
  }, [tasks, selectedUserFilter]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      // Use deadline as the primary display date for the calendar
      const dateStr = task.deadline; 
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(task);
    });
    return map;
  }, [filteredTasks]);

  // --- Render Helpers ---
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyStartDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthLabel = currentDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

  const getPriorityStyle = (p: string) => {
     if (p === 'HIGH') return 'border-l-4 border-l-red-500';
     if (p === 'MEDIUM') return 'border-l-4 border-l-amber-400';
     return 'border-l-4 border-l-slate-300';
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-white border-b border-slate-200 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
             <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
             <h1 className="text-2xl font-bold text-slate-900">{monthLabel}</h1>
             <p className="text-slate-500 text-sm">全域排程與截止日檢視 (可拖曳變更日期)</p>
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-1 ml-4">
             <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded shadow-sm transition-all">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
             </button>
             <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600">
                今天
             </button>
             <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded shadow-sm transition-all">
                <ChevronRight className="w-5 h-5 text-slate-600" />
             </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           {currentUser.role === 'ADMIN' && (
             <div className="relative flex-1 md:flex-none">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                   <Filter className="w-4 h-4" />
                </div>
                <select 
                  className="w-full md:w-48 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedUserFilter}
                  onChange={e => setSelectedUserFilter(e.target.value)}
                >
                   <option value="ALL">顯示所有成員</option>
                   {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                   ))}
                </select>
             </div>
           )}
           <Button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}>
              <Plus className="w-4 h-4" /> 新增排程
           </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
           {/* Weekday Headers */}
           <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
              {['週日', '週一', '週二', '週三', '週四', '週五', '週六'].map((day, i) => (
                 <div key={day} className={`py-3 text-center text-sm font-bold ${i===0 || i===6 ? 'text-red-400' : 'text-slate-600'}`}>
                    {day}
                 </div>
              ))}
           </div>

           {/* Days Grid */}
           <div className="grid grid-cols-7 grid-rows-5 bg-slate-200 gap-px flex-1 overflow-y-auto">
              {/* Empty Days Previous Month */}
              {emptyStartDays.map(i => (
                 <div key={`empty-${i}`} className="bg-slate-50/50"></div>
              ))}

              {/* Active Days */}
              {days.map(day => {
                 const dateStr = formatDateStr(currentDate.getFullYear(), currentDate.getMonth(), day);
                 const isToday = new Date().toISOString().split('T')[0] === dateStr;
                 const dayTasks = tasksByDate[dateStr] || [];
                 const sortedTasks = dayTasks.sort((a,b) => {
                    if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
                    if (a.status === 'DONE' && b.status !== 'DONE') return 1;
                    return 0;
                 });
                 const isDragOver = dragOverDate === dateStr;

                 return (
                    <div 
                      key={day} 
                      onClick={() => handleDayClick(day)}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDrop={(e) => handleDrop(e, day)}
                      className={`bg-white min-h-[100px] p-2 transition-all hover:bg-slate-50 cursor-pointer group relative flex flex-col gap-1 ${isToday ? 'bg-indigo-50/30' : ''} ${isDragOver ? 'bg-indigo-100/50 ring-2 ring-inset ring-indigo-400' : ''}`}
                    >
                       <div className="flex justify-between items-center mb-1 shrink-0">
                          <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                             {day}
                          </span>
                          {dayTasks.length > 0 && (
                             <span className="text-[10px] text-slate-400 font-medium">
                                {dayTasks.length}
                             </span>
                          )}
                       </div>

                       {/* Task Chips */}
                       <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-slate-200">
                          {sortedTasks.map(task => {
                             const isDone = task.status === 'DONE';
                             const isOverdue = !isDone && new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0));
                             
                             return (
                                <div 
                                  key={task.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, task.id)}
                                  onClick={(e) => handleTaskClick(e, task)}
                                  className={`text-[10px] px-1.5 py-1 rounded border shadow-sm select-none cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform ${getPriorityStyle(task.priority)} ${isDone ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' : 'bg-white text-slate-700'} ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : ''}`}
                                  title={task.title}
                                >
                                   {isOverdue && <AlertCircle className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
                                   <span className="truncate">{task.title}</span>
                                </div>
                             );
                          })}
                       </div>
                       
                       {/* Hover Add Button */}
                       <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="bg-white rounded-full p-2 shadow-sm pointer-events-auto hover:scale-110 transition-transform">
                             <Plus className="w-4 h-4 text-indigo-600" />
                          </div>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* Date Change Request Modal */}
      {pendingDragRequest && (
        <Modal 
          isOpen={!!pendingDragRequest} 
          onClose={() => setPendingDragRequest(null)} 
          title="申請變更日期 (Request Change)" 
          zIndex="z-[60]"
        >
           <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 flex items-start gap-3">
                 <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                 <div className="text-sm text-orange-800">
                    <p className="font-bold mb-1">權限提示</p>
                    <p>您不是管理員，無法直接變更日期。系統將發送申請給主管進行簽核。</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 py-2">
                 <div className="flex-1 p-3 bg-slate-50 rounded border border-slate-200 text-center">
                    <div className="text-xs text-slate-400 mb-1">原定日期</div>
                    <div className="font-bold text-slate-700">{pendingDragRequest.task.deadline}</div>
                 </div>
                 <ArrowRight className="w-5 h-5 text-slate-400" />
                 <div className="flex-1 p-3 bg-blue-50 rounded border border-blue-200 text-center">
                    <div className="text-xs text-blue-400 mb-1">新日期</div>
                    <div className="font-bold text-blue-700">{pendingDragRequest.newDate}</div>
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">變更原因说明 (必填)</label>
                 <textarea 
                    autoFocus
                    className="w-full p-3 border rounded-lg h-24 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="請輸入延後或提前的原因..."
                    value={changeReason}
                    onChange={e => setChangeReason(e.target.value)}
                 />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                 <Button variant="secondary" onClick={() => setPendingDragRequest(null)}>取消</Button>
                 <Button onClick={handleSubmitRequest}>送出申請</Button>
              </div>
           </div>
        </Modal>
      )}

      {/* Reused Task Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setSelectedDateForNewTask(null); }}
          onSubmit={(data: any) => {
            if (editingTask) {
               onUpdateTask(editingTask.id, data);
            } else {
               onAddTask(data);
            }
          }}
          editingTask={editingTask ? editingTask : (selectedDateForNewTask ? { 
            deadline: selectedDateForNewTask, 
            receiveDate: selectedDateForNewTask 
          } : null)}
          categories={categories}
          users={users}
          currentUser={currentUser}
          tasks={tasks}
          onRequestDateChange={onRequestDateChange}
        />
      )}
    </div>
  );
};
