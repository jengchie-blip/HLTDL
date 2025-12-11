
import React, { useState, useMemo } from 'react';
import { 
  Plus, Flag, Layers, Calendar, Play, CheckCircle2, ScrollText, Pause, FileText, 
  Trash2, ArrowRightLeft, Undo2, Wrench, Cog, Timer, CarFront, Clock, 
  Battery, BatteryWarning, BatteryCharging, Tag, Activity, History, AlertTriangle, CopyPlus,
  Trophy, Target, Zap, RotateCcw, X, BarChart3,
  User as UserIcon, Copy, AlertCircle, Settings, Pencil, Lightbulb
} from 'lucide-react';
import { User, Task, Category, TaskPriority, ProjectPhase, DateChangeRequest } from '../types';
import { Button, Card, ConfirmModal, StatusBadge, UserAvatar } from './Shared';
import { NotificationBell } from './NotificationBell';
import { TaskModal, LogModal, TransferModal, ReportModal, VerificationCompletionModal, DesignChangeResultModal, DesignProposalResultModal, getCategoryIconComponent, DailyWorkloadModal, BatchTaskModal, StatisticsModal, UserModal } from './BusinessModals';
import { getPhaseLabel, getPriorityColor, getStatusLabel, toLocalISOString, evaluateUserPerformance, getPerformanceDetails } from '../utils';

interface EngineerDashboardProps {
  user: User;
  tasks: Task[];
  users: User[];
  categories: Category[];
  onAddTask: (task: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddLog: (taskId: string, log: any) => void;
  onDeleteTask: (taskId: string) => void;
  onTransferTask: (taskId: string, newUserId: string, fromUserId: string) => void;
  onDismissAlert: (taskId: string) => void;
  onRequestDateChange?: (taskId: string, request: DateChangeRequest) => void;
  onRequestDeleteTask: (taskId: string, requesterId: string) => void;
  onUpdateUser: (id: string, data: Partial<User>) => void;
}

const PartNumberBadge = ({ partNumber }: { partNumber: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(partNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span 
       onClick={handleCopy}
       className={`text-xs px-1.5 py-0.5 rounded font-mono border transition-all cursor-pointer flex items-center gap-1 select-none ${
          copied 
             ? 'bg-emerald-100 text-emerald-700 border-emerald-200 scale-105' 
             : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
       }`}
       title="點擊複製專案品號"
    >
       <Tag className="w-3 h-3" />
       {partNumber}
       {copied ? (
         <CheckCircle2 className="w-3 h-3 ml-1 animate-in zoom-in" /> 
       ) : (
         <Copy className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
       )}
    </span>
  );
};

const EngineerDashboard: React.FC<EngineerDashboardProps> = (EngineerDashboardProps) => {
  const {
    user,
    tasks,
    users,
    categories,
    onAddTask,
    onUpdateTask,
    onAddLog,
    onDeleteTask,
    onTransferTask,
    onDismissAlert,
    onRequestDateChange,
    onRequestDeleteTask,
    onUpdateUser
  } = EngineerDashboardProps;

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBatchTaskModalOpen, setIsBatchTaskModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Statistics State
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsType, setStatsType] = useState<'SCHEDULE' | 'DESIGN' | 'CHANGE' | 'DESIGN_CHANGE_SUCCESS'>('SCHEDULE');
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<ProjectPhase | 'ALL'>('ALL');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [taskToRestore, setTaskToRestore] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskToTransfer, setTaskToTransfer] = useState<Task | null>(null);
  
  const [verificationTask, setVerificationTask] = useState<Task | null>(null);
  const [designChangeTask, setDesignChangeTask] = useState<Task | null>(null);
  const [proposalReportTask, setProposalReportTask] = useState<Task | null>(null);
  const [selectedDateForWorkload, setSelectedDateForWorkload] = useState<string | null>(null);

  const myTasks = tasks.filter(t => t.userId === user.id);
  
  const activeTasks = useMemo(() => {
    let filtered = myTasks.filter(t => t.status !== 'DONE');
    
    if (selectedPhaseFilter !== 'ALL') {
      filtered = filtered.filter(t => t.phase === selectedPhaseFilter);
    }

    return filtered.sort((a, b) => {
        const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const scoreA = priorityWeight[a.priority] || 0;
        const scoreB = priorityWeight[b.priority] || 0;
        
        if (scoreA !== scoreB) {
            return scoreB - scoreA;
        }
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [myTasks, selectedPhaseFilter]);

  const historyTasks = myTasks.filter(t => t.status === 'DONE').sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());

  // --- Performance Statistics ---
  const performanceStats = useMemo(() => {
    const { level, score } = evaluateUserPerformance(historyTasks);
    const details = getPerformanceDetails(level);

    let onTimeCount = 0;
    let withinBudgetCount = 0;

    historyTasks.forEach(t => {
       const end = new Date(t.completedDate!);
       const due = new Date(t.deadline);
       // Reset time for fair comparison
       end.setHours(0,0,0,0);
       due.setHours(0,0,0,0);
       
       if (end <= due) onTimeCount++;
       if (t.actualHours <= t.estimatedHours) withinBudgetCount++;
    });

    const total = historyTasks.length;
    const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
    const efficiencyRate = total > 0 ? Math.round((withinBudgetCount / total) * 100) : 0;

    return { level, score, details, onTimeRate, efficiencyRate, total };
  }, [historyTasks]);

  const workloadStats = useMemo(() => {
    const DAILY_CAPACITY = 8;
    const LOOKAHEAD_DAYS = 14;
    const stats: Record<string, number> = {};
    const today = new Date();
    today.setHours(0,0,0,0);

    const nextDays = [];
    for(let i=0; i<LOOKAHEAD_DAYS; i++) {
       const d = new Date(today);
       d.setDate(d.getDate() + i);
       const dateStr = toLocalISOString(d); // Use local ISO to prevent timezone shift
       stats[dateStr] = 0;
       nextDays.push({ date: d, dateStr });
    }

    activeTasks.forEach(task => {
        const remaining = Math.max(0, task.estimatedHours - task.actualHours);
        if (remaining <= 0) return;

        let start = new Date(task.startDate ? task.startDate : today);
        if (start < today) start = new Date(today);
        start.setHours(0,0,0,0);

        let end = new Date(task.deadline);
        end.setHours(0,0,0,0);
        
        if (end < start) end = new Date(start);

        let businessDaysCount = 0;
        let tempDate = new Date(start);
        while (tempDate <= end) {
            const day = tempDate.getDay();
            if (day !== 0 && day !== 6) businessDaysCount++;
            tempDate.setDate(tempDate.getDate() + 1);
        }
        if (businessDaysCount === 0) businessDaysCount = 1;

        const dailyLoad = remaining / businessDaysCount;

        tempDate = new Date(start);
        while (tempDate <= end) {
            const dateStr = toLocalISOString(tempDate); // Use local ISO to prevent timezone shift
            const day = tempDate.getDay();
            if (day !== 0 && day !== 6) {
                if (stats[dateStr] !== undefined) {
                    stats[dateStr] += dailyLoad;
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
    });

    return nextDays.map(dayInfo => {
        const used = stats[dayInfo.dateStr] || 0;
        const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6;
        const available = isWeekend ? 0 : Math.max(0, DAILY_CAPACITY - used);
        
        let status: 'FREE' | 'BUSY' | 'FULL' | 'OFF' = 'FREE';
        if (isWeekend) status = 'OFF';
        else if (available <= 0) status = 'FULL';
        else if (available < DAILY_CAPACITY * 0.3) status = 'BUSY';

        return {
           ...dayInfo,
           used,
           available,
           status,
           dayName: dayInfo.date.toLocaleDateString('zh-TW', { weekday: 'short' }),
           displayDate: dayInfo.date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
        };
     });
  }, [activeTasks]);

  const handleCompleteClick = (task: Task) => {
    // Enforce log check
    if (!task.logs || task.logs.length === 0) {
        alert("尚未填寫日誌警告: 無法執行標記完成。請先填寫工作日誌。");
        return;
    }

    const cat = categories.find(c => c.id === task.categoryId);
    // Special check for Verification/Testing tasks
    if (cat && (cat.name.includes('試模') || cat.name.includes('驗證') || cat.name.includes('測試') || cat.name.includes('Test'))) {
        setVerificationTask(task);
        return;
    }
    // Note: Design Proposal tasks (設計提案) & Design Change (設計變更) are now handled in History after standard completion

    setTaskToComplete(task.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Section: Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Profile Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between group relative">
           <div className="flex items-center gap-4">
             <div className="relative cursor-pointer group/avatar" onClick={() => setIsUserModalOpen(true)}>
                <UserAvatar user={user} size="lg" />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-slate-200 shadow-sm opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                   <Pencil className="w-3 h-3 text-slate-500" />
                </div>
             </div>
             <div>
                <h2 className="font-bold text-slate-900">{user.name}</h2>
                <div className="text-xs text-slate-500">{user.employeeId}</div>
             </div>
           </div>
           
           <div className={`mt-4 pt-3 border-t border-slate-50 flex items-center justify-between px-3 py-2 rounded ${performanceStats.details.color}`}>
             <span className="flex items-center gap-2 text-sm font-bold opacity-90">
                <Trophy className={`w-4 h-4 ${performanceStats.details.iconColor}`} /> 綜合評價
             </span>
             <span className="text-xl font-black tracking-wide">{performanceStats.details.label}</span>
           </div>
        </div>

        {/* Stat Cards */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
           <div className="text-blue-100 text-sm font-medium mb-1 flex items-center gap-2">
             <Activity className="w-4 h-4" /> 進行中任務
           </div>
           <div className="text-3xl font-bold">{activeTasks.length}</div>
           <div className="text-xs text-blue-100 mt-2 opacity-80">
              點擊列表可查看詳情
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
           <div className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
             <Target className="w-4 h-4 text-emerald-500" /> 準時達成率
           </div>
           <div className="text-3xl font-bold text-slate-800">{performanceStats.onTimeRate}%</div>
           <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${performanceStats.onTimeRate}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
           <div className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
             <Zap className="w-4 h-4 text-amber-500" /> 工時效率
           </div>
           <div className="text-3xl font-bold text-slate-800">{performanceStats.efficiencyRate}%</div>
           <div className="text-xs text-slate-400 mt-2">
              (實際 &le; 預估工時)
           </div>
        </div>
      </div>

      {/* Workload Forecast Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Battery className="w-5 h-5 text-indigo-500" /> 未來兩週工時負荷 (Workload Forecast)
             </h3>
             <span className="text-xs text-slate-400">每日產能: 8h</span>
         </div>
         
         <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar snap-x">
             {workloadStats.map((day, idx) => {
                 const isToday = idx === 0;
                 let bgColor = 'bg-slate-50 border-slate-100';
                 let icon = <Battery className="w-4 h-4 text-emerald-500" />;
                 let statusText = "Free";
                 let textColor = "text-emerald-600";
                 
                 if (day.status === 'OFF') {
                     bgColor = 'bg-slate-50/50 border-slate-100 opacity-60';
                     icon = <Calendar className="w-4 h-4 text-slate-300" />;
                     statusText = '休假';
                     textColor = 'text-slate-400';
                 } else if (day.status === 'FULL') {
                     bgColor = 'bg-red-50 border-red-200';
                     icon = <BatteryWarning className="w-4 h-4 text-red-500" />;
                     statusText = '滿載';
                     textColor = 'text-red-600 font-bold';
                 } else if (day.status === 'BUSY') {
                     bgColor = 'bg-amber-50 border-amber-200';
                     icon = <BatteryCharging className="w-4 h-4 text-amber-500" />;
                     statusText = '忙碌';
                     textColor = 'text-amber-600 font-bold';
                 }

                 return (
                     <div 
                        key={day.dateStr}
                        onClick={() => day.status !== 'OFF' && setSelectedDateForWorkload(day.dateStr)}
                        className={`min-w-[100px] p-3 rounded-lg border flex flex-col items-center gap-2 snap-start cursor-pointer hover:shadow-md transition-all ${bgColor} ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                     >
                         <div className="text-xs font-bold text-slate-500 uppercase">{day.dayName}</div>
                         <div className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>{day.displayDate}</div>
                         
                         <div className="my-1">
                            {icon}
                         </div>

                         <div className={`text-xs ${textColor}`}>
                             {statusText}
                         </div>
                         
                         {day.status !== 'OFF' && (
                             <div className="w-full text-[10px] text-slate-400 text-center">
                                {Math.round(day.used)}h / 8h
                             </div>
                         )}

                         {/* Mini Bar */}
                         {day.status !== 'OFF' && (
                            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-100 mt-1">
                                <div 
                                  className={`h-full rounded-full ${day.status === 'FULL' ? 'bg-red-500' : day.status === 'BUSY' ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                                  style={{width: `${Math.min(100, (day.used / 8) * 100)}%`}}
                                ></div>
                            </div>
                         )}
                     </div>
                 );
             })}
         </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center justify-between">
         <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
               onClick={() => setActiveTab('ACTIVE')}
               className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'ACTIVE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               進行中任務 ({activeTasks.length})
            </button>
            <button 
               onClick={() => setActiveTab('HISTORY')}
               className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'HISTORY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               歷史紀錄 ({historyTasks.length})
            </button>
         </div>
         
         {activeTab === 'ACTIVE' && (
             <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsReportModalOpen(true)} className="hidden md:flex">
                   <BarChart3 className="w-4 h-4" /> 統計報表
                </Button>
                <Button variant="secondary" onClick={() => setIsBatchTaskModalOpen(true)} className="hidden md:flex">
                   <CopyPlus className="w-4 h-4" /> 批次建立
                </Button>
                <Button onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
                   <Plus className="w-4 h-4" /> 新增任務
                </Button>
             </div>
         )}
         {activeTab === 'HISTORY' && (
            <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}>
               <FileText className="w-4 h-4" /> 匯出報表
            </Button>
         )}
      </div>

      {/* Task List Content */}
      <div className="min-h-[300px]">
         {activeTab === 'ACTIVE' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Filters */}
               <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {(['ALL', 'P1', 'P2', 'P3', 'P4', 'P5', 'OTHER'] as const).map(phase => (
                     <button
                        key={phase}
                        onClick={() => setSelectedPhaseFilter(phase)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${selectedPhaseFilter === phase ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                     >
                        {phase === 'ALL' ? '全部階段' : getPhaseLabel(phase)}
                     </button>
                  ))}
               </div>

               {activeTasks.length > 0 ? (
                  activeTasks.map(task => {
                     const category = categories.find(c => c.id === task.categoryId);

                     // Urgency Calculation
                     const deadlineDate = new Date(task.deadline);
                     const today = new Date();
                     today.setHours(0,0,0,0);
                     deadlineDate.setHours(0,0,0,0);
                     
                     const diffTime = deadlineDate.getTime() - today.getTime();
                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                     // 修正定義：延遲或當天要完成 (<= 0) 呈現紅色
                     const isCritical = diffDays <= 0;
                     // 修正定義：近三天內要完成 (1, 2, 3) 呈現橘色
                     const isUrgent = diffDays > 0 && diffDays <= 3;
                     const isStarted = task.status === 'IN_PROGRESS';
                     
                     let cardClass = "hover:border-blue-300 border-slate-200 bg-white";
                     let clockClass = "text-slate-500";
                     let alertIcon = null;

                     if (isCritical) {
                        cardClass = "border-red-200 bg-red-50";
                        clockClass = "text-red-600 font-bold";
                        alertIcon = <AlertCircle className="w-4 h-4 text-red-500" />;
                     } else if (isUrgent) {
                        cardClass = "border-orange-200 bg-orange-50";
                        clockClass = "text-orange-600 font-bold";
                        alertIcon = <Clock className="w-4 h-4 text-orange-500" />;
                     }
                     
                     return (
                        <Card key={task.id} className={`p-4 group transition-colors duration-200 ${cardClass}`}>
                           <div className="flex flex-col md:flex-row gap-4 justify-between">
                              <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge status={task.status} />
                                    {alertIcon}
                                    <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                                       {task.priority === 'HIGH' ? 'High' : task.priority === 'MEDIUM' ? 'Medium' : 'Low'}
                                    </span>
                                    {category && (
                                       <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                          {getCategoryIconComponent(category.icon)} {category.name}
                                       </span>
                                    )}
                                    <span className="font-bold text-lg text-slate-800 ml-1">
                                       {task.title}
                                    </span>
                                    {task.partNumber && (
                                       <PartNumberBadge partNumber={task.partNumber} />
                                    )}
                                 </div>
                                 
                                 <p className="text-sm text-slate-600 leading-relaxed">
                                    {task.description || '無詳細描述...'}
                                 </p>
                                 
                                 <div className="flex items-center gap-4 text-xs mt-2 flex-wrap">
                                    <div className="flex items-center gap-4 text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserIcon size={14} />
                                            <span>{getPhaseLabel(task.phase)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Cog size={14} />
                                            <span>{task.phase}</span>
                                        </div>
                                    </div>
                                    <span className="hidden md:inline text-slate-300">|</span>
                                    <span className={`flex items-center gap-1 ${clockClass}`}>
                                       <Clock className="w-3.5 h-3.5" /> 預計完成: {task.deadline}
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-500">
                                       <Timer className="w-3.5 h-3.5" /> 預計工時: {task.estimatedHours}h
                                    </span>
                                    {task.startDate && (
                                        <span className="flex items-center gap-1 text-slate-500">
                                           <Play className="w-3.5 h-3.5" /> 開始: {task.startDate}
                                        </span>
                                    )}
                                 </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2 shrink-0">
                                 <Button 
                                    onClick={() => { 
                                       if (isStarted) {
                                          setSelectedTask(task); 
                                          setIsLogModalOpen(true); 
                                       } else {
                                          onUpdateTask(task.id, { 
                                             status: 'IN_PROGRESS', 
                                             startDate: task.startDate || new Date().toISOString().split('T')[0] 
                                          });
                                       }
                                    }}
                                    className="w-full text-xs justify-center"
                                    variant={isStarted ? "primary" : "secondary"}
                                 >
                                    {isStarted ? <ScrollText className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                                    {isStarted ? "新增日誌" : "開始任務"}
                                 </Button>

                                 {/* Pause Button */}
                                 {isStarted && (
                                     <Button 
                                        onClick={() => onUpdateTask(task.id, { status: 'PAUSED' })}
                                        className="w-full text-xs justify-center bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
                                     >
                                        <Pause className="w-4 h-4 mr-1" />
                                        暫停任務
                                     </Button>
                                 )}
                                 
                                 <Button 
                                    onClick={() => handleCompleteClick(task)}
                                    className="w-full text-xs justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                                 >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    標記完成
                                 </Button>
                                 
                                 <div className="flex gap-2">
                                    <Button 
                                       onClick={() => setTaskToTransfer(task)}
                                       className="flex-1 text-xs justify-center bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200"
                                       title="轉派任務"
                                    >
                                       <ArrowRightLeft className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                       onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }}
                                       className="flex-1 text-xs justify-center bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200"
                                       title="編輯"
                                    >
                                       <Wrench className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                       onClick={() => setTaskToDelete(task.id)}
                                       className="flex-1 text-xs justify-center bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200"
                                       title="刪除"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </Button>
                                 </div>
                              </div>
                           </div>

                           {/* Logs Preview (Last 1) */}
                           {task.logs && task.logs.length > 0 && (
                              <div className={`mt-3 pt-3 border-t ${isCritical ? 'border-red-200' : isUrgent ? 'border-orange-200' : 'border-slate-100'}`}>
                                 <div className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-2">
                                    <History className="w-3 h-3" /> 最新進度
                                 </div>
                                 <div className="text-xs text-slate-600 flex gap-2">
                                    <span className="font-mono text-slate-400">{task.logs[0].date}</span>
                                    <span className="truncate">{task.logs[0].content}</span>
                                    <span className="text-slate-400 ml-auto whitespace-nowrap">{task.logs[0].hoursSpent}h</span>
                                 </div>
                              </div>
                           )}
                        </Card>
                     );
                  })
               ) : (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                     <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>目前沒有符合的任務</p>
                  </div>
               )}
            </div>
         )}

         {/* History Tab Content */}
         {activeTab === 'HISTORY' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {historyTasks.length > 0 ? (
                  historyTasks.map(task => {
                     const category = categories.find(c => c.id === task.categoryId);
                     const isDesignProposal = category && category.name === '設計提案';
                     const isDesignChange = category && (category.name.includes('設計變更') || category.name.includes('Design Change'));

                     return (
                        <div key={task.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2 opacity-75 hover:opacity-100 transition-opacity">
                           <div className="flex justify-between items-center w-full">
                               <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                     <StatusBadge status="DONE" />
                                     <span className="font-bold text-slate-700 line-through decoration-slate-400">{task.title}</span>
                                     {category && <span className="text-xs text-slate-400">({category.name})</span>}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                     完成日: {task.completedDate} | 總工時: {task.actualHours}h (預估 {task.estimatedHours}h)
                                  </div>
                               </div>
                               <Button 
                                 onClick={() => setTaskToRestore(task.id)}
                                 variant="ghost" 
                                 className="text-slate-400 hover:text-blue-600 shrink-0 ml-2" 
                                 title="還原任務"
                               >
                                  <Undo2 className="w-4 h-4" />
                               </Button>
                           </div>

                           {/* Show last log if exists */}
                           {task.logs && task.logs.length > 0 && (
                              <div className="mt-1 pt-2 border-t border-slate-200 w-full">
                                 <div className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-2">
                                    <History className="w-3 h-3" /> 最後紀錄
                                 </div>
                                 <div className="text-xs text-slate-600 flex gap-2 items-center">
                                    <span className="font-mono text-slate-400 shrink-0">{task.logs[0].date}</span>
                                    <span className="truncate flex-1">{task.logs[0].content}</span>
                                    <span className="text-slate-400 shrink-0 whitespace-nowrap">{task.logs[0].hoursSpent}h</span>
                                 </div>
                              </div>
                           )}

                           {/* Report Proposal Result in History */}
                           {isDesignProposal && (
                                <div className="mt-2 flex items-center justify-between p-2 rounded bg-slate-100 border border-slate-200">
                                     <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                         <Lightbulb className="w-3 h-3" /> 提案結果
                                     </span>
                                     {task.designProposalResult ? (
                                         <button 
                                            onClick={() => setProposalReportTask(task)}
                                            className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${task.designProposalResult === 'WON' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}
                                         >
                                            {task.designProposalResult === 'WON' ? 'WON (轉開發)' : 'LOST (未採用)'}
                                         </button>
                                     ) : (
                                         <button 
                                            onClick={() => setProposalReportTask(task)}
                                            className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors animate-pulse"
                                         >
                                            回報結果
                                         </button>
                                     )}
                                </div>
                           )}

                           {/* Report Design Change Result in History */}
                           {isDesignChange && (
                                <div className="mt-2 flex items-center justify-between p-2 rounded bg-slate-100 border border-slate-200">
                                     <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                         <RotateCcw className="w-3 h-3" /> 變更判定
                                     </span>
                                     {task.designChangeResult ? (
                                         <button 
                                            onClick={() => setDesignChangeTask(task)}
                                            className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${task.designChangeResult === 'PASS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}
                                         >
                                            {task.designChangeResult}
                                         </button>
                                     ) : (
                                         <button 
                                            onClick={() => setDesignChangeTask(task)}
                                            className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors animate-pulse"
                                         >
                                            回報判定
                                         </button>
                                     )}
                                </div>
                           )}
                        </div>
                     )
                  })
               ) : (
                  <div className="text-center py-12 text-slate-400">
                     <p>尚無歷史紀錄</p>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* Modals */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
        onSubmit={(data: any) => {
          if (selectedTask) {
             onUpdateTask(selectedTask.id, data);
          } else {
             onAddTask(data);
          }
        }}
        editingTask={selectedTask}
        categories={categories}
        users={users}
        currentUser={user}
        onRequestDateChange={onRequestDateChange}
        tasks={tasks}
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={(data) => onUpdateUser(user.id, data)}
        editingUser={user}
        currentUser={user}
      />

      <LogModal 
        isOpen={isLogModalOpen}
        onClose={() => { setIsLogModalOpen(false); setSelectedTask(null); }}
        onSubmit={(log) => selectedTask && onAddLog(selectedTask.id, log)}
        taskTitle={selectedTask?.title || ''}
      />
      
      {taskToTransfer && (
        <TransferModal 
          isOpen={!!taskToTransfer} 
          onClose={() => setTaskToTransfer(null)} 
          onConfirm={(newUserId) => onTransferTask(taskToTransfer.id, newUserId, user.id)} 
          users={users.filter(u => u.role !== 'ADMIN' && u.id !== user.id)} // Exclude self and admins
          taskTitle={taskToTransfer.title}
        />
      )}

      {/* Report Modal - Uses the same shared component but restricted to current user data in container */}
      <ReportModal
         isOpen={isReportModalOpen}
         onClose={() => setIsReportModalOpen(false)}
         currentUser={user}
         users={users} 
         tasks={myTasks} // Force only my tasks
         categories={categories}
      />

      {/* Statistics Report Modal - NEW */}
      <StatisticsModal
         isOpen={isStatsModalOpen}
         onClose={() => setIsStatsModalOpen(false)}
         initialType={statsType}
         tasks={myTasks} // Force only my tasks
         users={users} // Needed for drill down mapping
         categories={categories}
      />

      <BatchTaskModal
         isOpen={isBatchTaskModalOpen}
         onClose={() => setIsBatchTaskModalOpen(false)}
         onSubmit={(newTasks: any[]) => newTasks.forEach(t => onAddTask(t))}
         users={users.filter(u => u.id === user.id)} // Only self
         categories={categories}
      />

      <VerificationCompletionModal 
         isOpen={!!verificationTask}
         onClose={() => setVerificationTask(null)}
         taskTitle={verificationTask?.title || ''}
         onConfirm={(count, achieved) => {
            if (verificationTask) {
               onUpdateTask(verificationTask.id, { 
                  status: 'DONE', 
                  completedDate: toLocalISOString(new Date()),
                  dvCount: count,
                  dvAchieved: achieved
               });
            }
         }}
      />
      
      <DesignChangeResultModal
         isOpen={!!designChangeTask}
         onClose={() => setDesignChangeTask(null)}
         taskTitle={designChangeTask?.title || ''}
         onConfirm={(result, note) => {
            if (designChangeTask) {
               const updates: Partial<Task> = {
                  designChangeResult: result,
               };
               if (note) {
                  updates.description = (designChangeTask.description || '') + `\n[判定備註]: ${note}`;
               }
               onUpdateTask(designChangeTask.id, updates);
            }
         }}
      />

      <DesignProposalResultModal
         isOpen={!!proposalReportTask}
         onClose={() => setProposalReportTask(null)}
         taskTitle={proposalReportTask?.title || ''}
         initialResult={proposalReportTask?.designProposalResult}
         initialReason={proposalReportTask?.proposalRejectReason}
         onConfirm={(result, reason) => {
             if (proposalReportTask) {
                 // For proposal, we update the result in place without modifying status/date
                 // assuming the task is already DONE (accessed from History)
                 onUpdateTask(proposalReportTask.id, {
                     designProposalResult: result,
                     proposalRejectReason: reason
                 });
             }
         }}
      />

      <DailyWorkloadModal
         isOpen={!!selectedDateForWorkload}
         onClose={() => setSelectedDateForWorkload(null)}
         dateStr={selectedDateForWorkload}
         tasks={myTasks}
         categories={categories}
      />

      <ConfirmModal
         isOpen={!!taskToComplete}
         onClose={() => setTaskToComplete(null)}
         onConfirm={() => {
            if (taskToComplete) {
               onUpdateTask(taskToComplete, { 
                  status: 'DONE', 
                  completedDate: toLocalISOString(new Date()) 
               });
            }
         }}
         title="確認完成任務"
         message="確定將此任務標記為完成？"
         confirmText="確認完成"
      />
      
      <ConfirmModal
         isOpen={!!taskToRestore}
         onClose={() => setTaskToRestore(null)}
         onConfirm={() => {
            if (taskToRestore) {
               onUpdateTask(taskToRestore, { 
                  status: 'IN_PROGRESS', 
                  completedDate: null 
               });
            }
         }}
         title="還原任務"
         message="確定將此任務還原為進行中狀態？"
         confirmText="確認還原"
      />

      <ConfirmModal
         isOpen={!!taskToDelete}
         onClose={() => setTaskToDelete(null)}
         onConfirm={() => {
            if (taskToDelete) {
               // Instead of immediate delete, request delete
               onRequestDeleteTask(taskToDelete, user.id);
               alert("已送出刪除申請，請等待主管核准。");
            }
         }}
         title="申請刪除任務"
         message={
            <div className="space-y-2">
               <div className="bg-amber-50 p-3 rounded text-amber-800 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>您沒有權限直接刪除任務。此操作將發送申請給主管進行簽核。</span>
               </div>
               <p>確定要申請刪除此任務嗎？</p>
            </div>
         }
         confirmText="送出申請"
         isDanger
      />
    </div>
  );
};

export default EngineerDashboard;
