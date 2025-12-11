
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, ArrowRightLeft, CheckCircle2, Trash2, Plus, 
  Info, Search, X, Pencil, Save, ScrollText, 
  Settings, Microscope, Tag, PenTool, Calendar, Clock, RotateCcw,
  User as UserIcon, BarChart3, Battery, BatteryWarning, BatteryCharging,
  Briefcase, Zap, PieChart, TrendingUp, Target, Activity, Check, Ban, Copy, FileSpreadsheet, CheckSquare,
  Lightbulb, HelpCircle, GripVertical, ChevronLeft, ChevronRight, Trophy
} from 'lucide-react';
import { User, Task, Role, TaskPriority, ProjectPhase, Category, TaskLog, DateChangeRequest } from '../types';
import { Button, Modal, ConfirmModal, StatusBadge, getIconComponent, UserAvatar, CATEGORY_ICONS, USER_AVATAR_ICONS } from './Shared';
import { getPhaseLabel, getStatusLabel, generateId, toLocalISOString } from '../utils';
import { AVATAR_COLORS } from '../constants';

// Constants for Dropdowns
const CHANGE_CATEGORY_OPTIONS = [
  "設計預留",
  "設計錯誤",
  "圖面誤記",
  "尺寸設計調整",
  "客戶需求變更"
];

const CHANGE_ANALYSIS_OPTIONS = [
  "測繪錯誤",
  "未落實設計點檢",
  "新設計結構，未做好預留",
  "結構點檢缺漏",
  "非設計錯誤"
];

const CUSTOM_REPORT_COLUMNS = [
  { key: 'partNumber', label: '專案品號' },
  { key: 'title', label: '任務標題' },
  { key: 'description', label: '任務描述' },
  { key: 'status', label: '狀態' },
  { key: 'userId', label: '負責人' },
  { key: 'categoryId', label: '任務類別' },
  { key: 'phase', label: '階段' },
  { key: 'priority', label: '優先級' },
  { key: 'receiveDate', label: '接收日期' },
  { key: 'deadline', label: '截止日期' },
  { key: 'startDate', label: '開始日期' },
  { key: 'completedDate', label: '完成日期' },
  { key: 'estimatedHours', label: '預估工時' },
  { key: 'actualHours', label: '實際工時' },
  { key: 'dvStats', label: 'DV(總/成)' },
  { key: 'changeOrderNumber', label: '變更單號' },
  { key: 'designChangeResult', label: '變更判定' }
];

// Helper to parse YYYY-MM-DD as Local Midnight Date
const parseDateLocal = (dateStr: string) => {
  if (!dateStr) return new Date(0); // Invalid fallback
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getCategoryIconComponent = (iconName?: string) => {
  return getIconComponent(iconName, "w-4 h-4");
};

// --- Shared Components ---

interface TaskItemProps { 
  task: Task; 
  categories: Category[]; 
  showOwner?: boolean; 
  users?: User[]; 
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTransfer?: () => void; // Added onTransfer prop
  showLogsToggle?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  categories, 
  showOwner, 
  users, 
  onClick,
  onEdit,
  onDelete,
  onTransfer,
  showLogsToggle = false
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const cat = categories.find(c => c.id === task.categoryId);
  const owner = users?.find(u => u.id === task.userId);

  return (
    <div 
      className={`p-3 border rounded-lg mb-2 transition-colors bg-white ${onClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
      onClick={onClick}
    >
       <div className="flex justify-between items-start">
         <div className="flex items-center gap-2 flex-1">
            <StatusBadge status={task.status} />
            <span className="font-bold text-slate-800 line-clamp-1">{task.title}</span>
            {task.designChangeResult && (
               <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${task.designChangeResult === 'PASS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                 {task.designChangeResult}
               </span>
            )}
            {task.designProposalResult && (
               <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${task.designProposalResult === 'WON' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                 {task.designProposalResult === 'WON' ? '轉開發' : '未採用'}
               </span>
            )}
         </div>
         <div className="flex items-center gap-2 shrink-0">
            {task.deadline && (
                <span className={`text-xs whitespace-nowrap ${new Date(task.deadline) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                    {task.deadline}
                </span>
            )}
            
            {(onEdit || onDelete || showLogsToggle || onTransfer) && (
              <div className="flex items-center gap-1 border-l pl-2 ml-1" onClick={e => e.stopPropagation()}>
                {showLogsToggle && task.logs.length > 0 && (
                   <button 
                     onClick={() => setShowLogs(!showLogs)} 
                     className={`p-1.5 rounded hover:bg-slate-100 ${showLogs ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`} 
                     title="查看日誌"
                   >
                     <ScrollText className="w-3.5 h-3.5" />
                   </button>
                )}
                {onTransfer && (
                  <button onClick={onTransfer} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded" title="轉派任務">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {onEdit && (
                  <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded" title="編輯">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="刪除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
         </div>
       </div>
       
       <div className="flex gap-3 mt-2 text-xs text-slate-500 items-center flex-wrap">
           <span className="flex items-center gap-1" title={cat?.note || ''}>
             {getCategoryIconComponent(cat?.icon)} 
             {cat?.name || '未分類'}
             {cat?.note && <Info className="w-3 h-3 text-blue-400" />}
           </span>
           <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {task.priority}</span>
           <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {task.partNumber || 'N/A'}</span>
           {showOwner && owner && (
             <span className="flex items-center gap-1 pl-2 border-l border-slate-200">
               <UserAvatar user={owner} size="sm" /> 
               {owner.name}
             </span>
           )}
           {/* Display DV stats if available */}
           {task.dvCount !== undefined && task.dvCount > 0 && (
             <span className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-1.5 rounded">
               <Microscope className="w-3 h-3" />
               設計成功率: {Math.round((task.dvAchieved || 0) / task.dvCount * 100)}% ({task.dvAchieved}/{task.dvCount})
             </span>
           )}
           {/* Display Change Order info if available */}
           {task.changeOrderNumber && (
              <span className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-1.5 rounded">
                <RotateCcw className="w-3 h-3" />
                {task.changeOrderNumber} (#{task.changeCount})
              </span>
           )}
           {/* Design Proposal Info */}
           {task.isCoDev !== undefined && (
             <span className="flex items-center gap-1 px-1.5 rounded bg-blue-50 text-blue-600 font-medium">
               {task.isCoDev ? '協同開發:是' : ''}
               {task.hasCompetitor ? (task.isCoDev ? '/競爭:是' : '競爭:是') : ''}
             </span>
           )}
       </div>

       {showLogs && task.logs.length > 0 && (
         <div className="mt-3 bg-slate-50 rounded border border-slate-100 p-2 space-y-2 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-bold text-slate-400 uppercase">工作日誌 ({task.logs.length})</div>
            {task.logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
              <div key={log.id} className="text-xs border-l-2 border-slate-300 pl-2">
                <div className="flex justify-between text-slate-500 mb-0.5">
                  <span>{log.date}</span>
                  <span>{log.hoursSpent}h</span>
                </div>
                <div className="text-slate-700">{log.content}</div>
              </div>
            ))}
         </div>
       )}
    </div>
  )
};

export const DesignChangeResultModal = ({ isOpen, onClose, onConfirm, taskTitle }: { isOpen: boolean; onClose: () => void; onConfirm: (result: 'PASS' | 'NG', note: string) => void; taskTitle: string }) => {
  const [result, setResult] = useState<'PASS' | 'NG' | null>(null);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (result) {
      onConfirm(result, note);
      onClose();
      setResult(null);
      setNote('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="設計變更結果判定" maxWidth="max-w-md" zIndex="z-[70]">
       <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="text-xs text-slate-500 mb-1">任務</div>
             <div className="font-bold text-slate-800">{taskTitle}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={() => setResult('PASS')}
                className={`p-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${result === 'PASS' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-300 text-slate-500'}`}
             >
                <Check className="w-8 h-8" />
                <span className="font-bold text-lg">PASS</span>
             </button>
             <button 
                onClick={() => setResult('NG')}
                className={`p-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${result === 'NG' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-red-300 text-slate-500'}`}
             >
                <Ban className="w-8 h-8" />
                <span className="font-bold text-lg">NG</span>
             </button>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">判定說明 / 備註 (選填)</label>
             <textarea 
                className="w-full p-2 border rounded-lg h-24 text-sm" 
                placeholder="請輸入判定原因或後續建議..."
                value={note}
                onChange={e => setNote(e.target.value)}
             />
          </div>

          <div className="flex justify-end gap-2 pt-2">
             <Button variant="secondary" onClick={onClose}>取消</Button>
             <Button onClick={handleSubmit} disabled={!result} className={result === 'NG' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
                確認判定
             </Button>
          </div>
       </div>
    </Modal>
  );
};

export const DesignProposalResultModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  taskTitle, 
  initialResult, 
  initialReason 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (result: 'WON' | 'LOST', reason?: string) => void; 
  taskTitle: string;
  initialResult?: 'WON' | 'LOST';
  initialReason?: string;
}) => {
  const [result, setResult] = useState<'WON' | 'LOST' | null>(initialResult || null);
  const [reason, setReason] = useState(initialReason || '');

  useEffect(() => {
     if (isOpen) {
        setResult(initialResult || null);
        setReason(initialReason || '');
     }
  }, [isOpen, initialResult, initialReason]);

  const handleSubmit = () => {
    if (result) {
      if (result === 'LOST' && !reason.trim()) {
        alert('請填寫未採用原因');
        return;
      }
      onConfirm(result, result === 'WON' ? '' : reason);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="提案結果回報" maxWidth="max-w-md" zIndex="z-[70]">
       <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="text-xs text-slate-500 mb-1">任務</div>
             <div className="font-bold text-slate-800">{taskTitle}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={() => setResult('WON')}
                className={`p-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${result === 'WON' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-300 text-slate-500'}`}
             >
                <Trophy className="w-8 h-8" />
                <span className="font-bold text-lg">轉開發 (Yes)</span>
             </button>
             <button 
                onClick={() => setResult('LOST')}
                className={`p-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${result === 'LOST' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-red-300 text-slate-500'}`}
             >
                <X className="w-8 h-8" />
                <span className="font-bold text-lg">未採用 (No)</span>
             </button>
          </div>

          {result === 'LOST' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">未採用原因 (必填)</label>
                 <textarea 
                    className="w-full p-2 border rounded-lg h-24 text-sm focus:ring-2 focus:ring-red-500" 
                    placeholder="請說明原因，例如：價格過高、規格不符..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                 />
              </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
             <Button variant="secondary" onClick={onClose}>取消</Button>
             <Button onClick={handleSubmit} disabled={!result} className={result === 'LOST' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
                確認回報
             </Button>
          </div>
       </div>
    </Modal>
  );
};

export const UserModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingUser,
  currentUser 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void; 
  editingUser: User | null;
  currentUser?: User;
}) => {
  const [formData, setFormData] = useState<Partial<User>>({ 
    name: '', employeeId: '', role: 'ENGINEER', avatarColor: 'bg-blue-500', avatarIcon: '', password: '' 
  });

  const CHARACTER_ICONS = ['👨', '👱‍♂️', '🧔', '👩', '👱‍♀️', '👧', '🤓', '😎', '🧐'];

  useEffect(() => {
    if (editingUser) {
      setFormData({ 
        name: editingUser.name, 
        employeeId: editingUser.employeeId, 
        role: editingUser.role, 
        avatarColor: editingUser.avatarColor,
        avatarIcon: editingUser.avatarIcon || '',
        password: editingUser.password || '' 
      });
    } else {
      setFormData({ name: '', employeeId: '', role: 'ENGINEER', avatarColor: 'bg-blue-500', avatarIcon: '', password: '' });
    }
  }, [editingUser, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isSelf = currentUser && editingUser && currentUser.id === editingUser.id;
  
  const disableSensitive = editingUser && !isAdmin;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingUser ? '編輯成員資料' : '新增成員'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
            <input required type="text" className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">工號</label>
            <input 
              required 
              type="text" 
              className={`w-full p-2 border rounded-lg ${disableSensitive ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
              value={formData.employeeId} 
              onChange={e => setFormData({...formData, employeeId: e.target.value})} 
              disabled={!!disableSensitive}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
          <select 
             className={`w-full p-2 border rounded-lg ${disableSensitive ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
             value={formData.role} 
             onChange={e => setFormData({...formData, role: e.target.value as Role})}
             disabled={!!disableSensitive}
          >
            <option value="ENGINEER">工程師 (Engineer)</option>
            <option value="ASSISTANT">助理 (Assistant)</option>
            <option value="ADMIN">主管 (Admin)</option>
          </select>
          {disableSensitive && <p className="text-xs text-slate-400 mt-1">僅主管可修改工號與角色權限</p>}
        </div>

        {/* Avatar Selection */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
           <label className="block text-sm font-medium text-slate-700 mb-3">設定頭像 (Icon & Color)</label>
           
           <div className="flex flex-col md:flex-row gap-6">
              {/* Preview */}
              <div className="flex flex-col items-center justify-center gap-2">
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold shadow-md ${formData.avatarColor}`}>
                     {/* Show preview, handling both Lucide icons and Emojis via Shared.tsx UserAvatar logic manually here for preview or use UserAvatar component */}
                     <UserAvatar user={{...formData as User, id: 'preview'}} size="lg" />
                 </div>
                 <span className="text-xs text-slate-500">預覽</span>
              </div>
              
              <div className="flex-1 space-y-4">
                 {/* Color Picker */}
                 <div>
                    <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">選擇背景色</span>
                    <div className="flex flex-wrap gap-2">
                       {AVATAR_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full ${color} ${formData.avatarColor === color ? 'ring-2 ring-slate-600 ring-offset-2' : 'hover:opacity-80'}`}
                            onClick={() => setFormData({...formData, avatarColor: color})}
                          />
                       ))}
                    </div>
                 </div>

                 {/* Icon Picker */}
                 <div>
                    <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">選擇圖示 (Select Icon)</span>
                    <div className="flex flex-wrap gap-2">
                       <button
                          type="button"
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center text-slate-600 font-bold bg-white transition-all ${!formData.avatarIcon ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
                          onClick={() => setFormData({...formData, avatarIcon: ''})}
                          title="使用姓名首字"
                       >
                          A
                       </button>
                       {USER_AVATAR_ICONS.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center text-slate-600 bg-white transition-all ${formData.avatarIcon === icon ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 text-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}
                            onClick={() => setFormData({...formData, avatarIcon: icon})}
                          >
                             {getIconComponent(icon)}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {(isAdmin || isSelf) && formData.role === 'ADMIN' && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Settings className="w-3 h-3" /> 登入密碼 {isAdmin && !isSelf && '(管理員修改)'}
            </label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-lg font-mono text-sm" 
              placeholder="未設定 (預設無密碼)"
              value={formData.password || ''} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              disabled={!isAdmin && !isSelf}
            />
            {isAdmin && <p className="text-xs text-slate-500 mt-1">若啟用「主管登入需密碼」，此為必填。</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">儲存變更</Button>
        </div>
      </form>
    </Modal>
  );
};

export const QuickDispatchModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  users, 
  tasks, 
  categories 
}: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [partNumber, setPartNumber] = useState(''); // Added Part Number state
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [phase, setPhase] = useState<ProjectPhase>('P2');
  const [estimatedHours, setEstimatedHours] = useState(categories[0]?.suggestedHours || 4);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
       setTitle('');
       setDescription('');
       setPartNumber(''); // Reset Part Number
       if (categories.length > 0) {
          setCategoryId(categories[0].id);
          setEstimatedHours(categories[0].suggestedHours);
       }
       setPhase('P2');
       const d = new Date();
       d.setDate(d.getDate() + 3);
       setDeadline(toLocalISOString(d));
       setPriority('MEDIUM');
    }
  }, [isOpen, categories]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const cid = e.target.value;
     setCategoryId(cid);
     const cat = categories.find((c:Category) => c.id === cid);
     if (cat) setEstimatedHours(cat.suggestedHours);
  }

  const handleAssign = (userId: string) => {
     if (!title.trim()) {
        alert('請輸入任務標題');
        return;
     }
     
     const taskData = {
        title,
        categoryId,
        estimatedHours,
        deadline,
        priority,
        userId,
        phase: phase,
        status: 'TODO',
        receiveDate: toLocalISOString(new Date()),
        description: description || '快速派工建立',
        partNumber: partNumber || '', // Added Part Number
        logs: [],
        actualHours: 0
     };
     onSubmit(taskData);
     onClose();
  };

  const engineers = users.filter((u: User) => u.role === 'ENGINEER' || u.role === 'ASSISTANT');

  const getWorkloadStats = (userId: string) => {
     const userTasks = tasks.filter((t: Task) => t.userId === userId && t.status !== 'DONE');
     const count = userTasks.length;
     const hours = userTasks.reduce((acc:number, t:Task) => acc + Math.max(0, t.estimatedHours - t.actualHours), 0);
     return { count, hours };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ 單鍵快速派工 (Quick Dispatch)" maxWidth="max-w-4xl">
       <div className="flex flex-col md:flex-row gap-6">
          {/* Task Details Form */}
          <div className="w-full md:w-1/3 space-y-4 border-r border-slate-100 pr-0 md:pr-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">任務標題</label>
                <input autoFocus type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="輸入工作項目..." value={title} onChange={e => setTitle(e.target.value)} />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">專案品號</label>
                <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" placeholder="e.g. 805-0023-01" value={partNumber} onChange={e => setPartNumber(e.target.value)} />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">專案階段</label>
                <select className="w-full p-2 border rounded-lg" value={phase} onChange={e => setPhase(e.target.value as ProjectPhase)}>
                   <option value="P1">P1 (ML0~2)</option>
                   <option value="P2">P2 (ML3)</option>
                   <option value="P3">P3 (ML4)</option>
                   <option value="P4">P4 (ML5~6)</option>
                   <option value="P5">P5 (ML7)</option>
                   <option value="OTHER">其他 (Other)</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">任務描述 (Optional)</label>
                <textarea 
                   className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24 text-sm" 
                   placeholder="補充詳細說明..." 
                   value={description} 
                   onChange={e => setDescription(e.target.value)} 
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">任務類別</label>
                <select className="w-full p-2 border rounded-lg" value={categoryId} onChange={handleCategoryChange}>
                   {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">預估工時</label>
                   <input type="number" className="w-full p-2 border rounded-lg" value={estimatedHours} onChange={e => setEstimatedHours(Number(e.target.value))} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">優先級</label>
                   <select className="w-full p-2 border rounded-lg" value={priority} onChange={e => setPriority(e.target.value as any)}>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                   </select>
                </div>
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">預計結束日期 (Deadline)</label>
                <input type="date" className="w-full p-2 border rounded-lg" value={deadline} onChange={e => setDeadline(e.target.value)} />
             </div>
             
             <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed">
                <Info className="w-4 h-4 inline-block mr-1 mb-0.5" />
                設定任務資訊後，直接點擊右側人員卡片上的「立即派送」按鈕即可完成分派。
             </div>
          </div>

          {/* Engineer List */}
          <div className="flex-1">
             <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                人員能量即時看板 (Live Capacity)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                {engineers.map((user: User) => {
                   const stats = getWorkloadStats(user.id);
                   
                   // Capacity Logic
                   let status = 'Free';
                   let color = 'bg-emerald-500';
                   let bgColor = 'bg-white hover:border-emerald-300';
                   let textColor = 'text-emerald-600';
                   
                   if (stats.count > 8) {
                      status = 'Overloaded';
                      color = 'bg-red-500';
                      bgColor = 'bg-red-50 hover:border-red-300';
                      textColor = 'text-red-600';
                   } else if (stats.count > 4) {
                      status = 'Busy';
                      color = 'bg-amber-400';
                      bgColor = 'bg-amber-50 hover:border-amber-300';
                      textColor = 'text-amber-600';
                   }

                   return (
                      <div key={user.id} className={`p-3 rounded-xl border border-slate-200 transition-all ${bgColor} group relative`}>
                         <div className="flex items-center gap-3 mb-3">
                            <UserAvatar user={user} size="md" />
                            <div>
                               <div className="font-bold text-slate-900">{user.name}</div>
                               <div className={`text-xs font-bold ${textColor}`}>{status} ({stats.count} tasks)</div>
                            </div>
                         </div>
                         
                         <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-xs text-slate-400">
                               <span>待辦時數</span>
                               <span>{stats.hours}h</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                               <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (stats.count / 10) * 100)}%` }}></div>
                            </div>
                         </div>
                         
                         <Button 
                           onClick={() => handleAssign(user.id)}
                           className="w-full justify-center bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors shadow-sm"
                         >
                            <Zap className="w-4 h-4 mr-1" /> 立即派送
                         </Button>
                      </div>
                   );
                })}
             </div>
          </div>
       </div>
    </Modal>
  );
};

export const StatisticsModal = ({ 
  isOpen, 
  onClose, 
  initialType = 'SCHEDULE', 
  tasks, 
  users, 
  categories 
}: {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'SCHEDULE' | 'DESIGN' | 'CHANGE' | 'DESIGN_CHANGE_SUCCESS' | 'PROPOSAL';
  tasks: Task[];
  users: User[];
  categories: Category[];
}) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'DESIGN' | 'CHANGE' | 'DESIGN_CHANGE_SUCCESS' | 'PROPOSAL'>(initialType);
  const [timeRange, setTimeRange] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
  const [drillDown, setDrillDown] = useState<{ type: string; categoryId?: string; tasks: Task[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setDrillDown(null); // Reset drilldown on open
    }
  }, [isOpen, initialType]);

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (timeRange === 'MONTH') {
      start.setDate(1);
      start.setHours(0,0,0,0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23,59,59,999);
    } else if (timeRange === 'QUARTER') {
      const q = Math.floor(now.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0,0,0,0);
      end.setMonth(start.getMonth() + 3, 0);
      end.setHours(23,59,59,999);
    } else {
      start.setMonth(0, 1);
      start.setHours(0,0,0,0);
      end.setMonth(11, 31);
      end.setHours(23,59,59,999);
    }
    return { start, end };
  };

  const { start, end } = getDateRange();

  // Helper to check date range overlap
  const isTaskInRange = (t: Task) => {
    // Primarily check Deadline for Achievement
    const d = parseDateLocal(t.deadline);
    // Or Completed Date if done
    const c = t.completedDate ? parseDateLocal(t.completedDate) : null;
    
    // Logic: If completed, use completed date. If not, use deadline.
    const refDate = c || d;
    return refDate >= start && refDate <= end;
  };

  const rangeLabel = timeRange === 'MONTH' ? '本月' : timeRange === 'QUARTER' ? '本季' : '本年度';

  // --- Statistics Logic ---
  
  // 1. Schedule Achievement
  const scheduleStats = useMemo(() => {
    const relevantTasks = tasks.filter(t => isTaskInRange(t));
    const total = relevantTasks.length;
    let onTime = 0;
    
    // Breakdown by Category
    const catStats: Record<string, { total: number, onTime: number }> = {};
    // Store filtered tasks for Drill Down
    const catTasks: Record<string, Task[]> = {};
    const onTimeTasksList: Task[] = [];
    
    relevantTasks.forEach(t => {
      const isDone = t.status === 'DONE';
      const deadline = parseDateLocal(t.deadline);
      const completed = t.completedDate ? parseDateLocal(t.completedDate) : null;
      
      let success = false;
      if (isDone && completed && completed <= deadline) success = true;
      
      if (success) {
        onTime++;
        onTimeTasksList.push(t);
      }

      // Category Grouping
      const cId = t.categoryId;
      if (!catStats[cId]) catStats[cId] = { total: 0, onTime: 0 };
      if (!catTasks[cId]) catTasks[cId] = [];
      
      catStats[cId].total++;
      if (success) catStats[cId].onTime++;
      catTasks[cId].push(t);
    });

    return { total, onTime, rate: total > 0 ? Math.round((onTime/total)*100) : 0, catStats, relevantTasks, onTimeTasksList, catTasks };
  }, [tasks, timeRange, start, end]);

  // 2. Design Success (DV)
  const designStats = useMemo(() => {
    // Filter tasks that are related to Verification/Testing and have DV counts
    const relevantTasks = tasks.filter(t => {
       // Must be in range
       if (!isTaskInRange(t)) return false;
       // Must have DV data
       return (t.dvCount || 0) > 0;
    });

    const totalItems = relevantTasks.reduce((acc, t) => acc + (t.dvCount || 0), 0);
    const passedItems = relevantTasks.reduce((acc, t) => acc + (t.dvAchieved || 0), 0);
    
    // Filter out only tasks that have a high pass rate for "Passed Items" drill down context (simplified logic: tasks with >0 passed items)
    const passedTasks = relevantTasks.filter(t => (t.dvAchieved || 0) > 0);

    return { totalItems, passedItems, rate: totalItems > 0 ? Math.round((passedItems/totalItems)*100) : 0, taskCount: relevantTasks.length, relevantTasks, passedTasks };
  }, [tasks, timeRange, start, end]);

  // 3. Change Stats
  const changeStats = useMemo(() => {
    const relevantTasks = tasks.filter(t => {
       if (!isTaskInRange(t)) return false;
       
       // Filter: Only include tasks categorized as "Design Change"
       const cat = categories.find(c => c.id === t.categoryId);
       const isDesignChange = cat && (cat.name.includes('設計變更') || cat.name.includes('Design Change'));
       
       if (!isDesignChange) return false;

       // Must contain change info
       return (t.changeCount || 0) > 0 || !!(t.changeOrderNumber);
    });

    const totalChanges = relevantTasks.reduce((acc, t) => acc + (t.changeCount ?? 0), 0);
    
    // Group by Change Category (Reason)
    const reasonStats: Record<string, number> = {};
    const reasonTasks: Record<string, Task[]> = {}; // For drill down

    relevantTasks.forEach(t => {
       const r = t.changeCategory || '未分類';
       const currentCount = reasonStats[r] ?? 0;
       const addCount = t.changeCount ?? 1;
       reasonStats[r] = currentCount + addCount;
       
       if (!reasonTasks[r]) reasonTasks[r] = [];
       reasonTasks[r].push(t);
    });

    return { totalChanges, reasonStats, taskCount: relevantTasks.length, relevantTasks, reasonTasks };
  }, [tasks, timeRange, start, end, categories]);

  // 4. Design Change Success Stats
  const designChangeSuccessStats = useMemo(() => {
      const allDesignChangeTasks = tasks.filter(t => {
          if (!isTaskInRange(t)) return false;
          
          // Check if it's a design change task
          const cat = categories.find(c => c.id === t.categoryId);
          // Changed logic: ONLY check if category name includes '設計變更'
          const isDesignChange = cat && cat.name.includes('設計變更');
          
          return isDesignChange;
      });

      const passTasks = allDesignChangeTasks.filter(t => t.designChangeResult === 'PASS');
      const ngTasks = allDesignChangeTasks.filter(t => t.designChangeResult === 'NG');
      
      // Changed logic based on user request: Total - (Pass + NG)
      // Previously it might have filtered only DONE tasks without result. 
      // Now it effectively captures everything else including pending tasks.
      const unjudgedTasks = allDesignChangeTasks.filter(t => t.designChangeResult !== 'PASS' && t.designChangeResult !== 'NG');

      const passCount = passTasks.length;
      const ngCount = ngTasks.length;
      
      // Explicit calculation as requested: Total - (PASS + NG)
      const unjudgedCount = allDesignChangeTasks.length - (passCount + ngCount);

      const judgedTotal = passCount + ngCount;
      const rate = judgedTotal > 0 ? Math.round((passCount / judgedTotal) * 100) : 0;

      return { 
          total: allDesignChangeTasks.length, 
          passCount, 
          ngCount, 
          unjudgedCount, 
          rate, 
          relevantTasks: allDesignChangeTasks, 
          passTasks, 
          ngTasks,
          unjudgedTasks
      };
  }, [tasks, timeRange, start, end, categories]);

  // 5. Design Proposal Success Stats (NEW)
  const proposalStats = useMemo(() => {
      const allProposalTasks = tasks.filter(t => {
          if (!isTaskInRange(t)) return false;
          const cat = categories.find(c => c.id === t.categoryId);
          // Check if category name contains "設計提案"
          const isProposal = cat && cat.name.includes('設計提案');
          return isProposal;
      });

      const wonTasks = allProposalTasks.filter(t => t.designProposalResult === 'WON');
      const lostTasks = allProposalTasks.filter(t => t.designProposalResult === 'LOST');
      const unjudgedTasks = allProposalTasks.filter(t => !t.designProposalResult);

      const wonCount = wonTasks.length;
      const lostCount = lostTasks.length;
      const unjudgedCount = unjudgedTasks.length;

      const judgedTotal = wonCount + lostCount;
      const rate = judgedTotal > 0 ? Math.round((wonCount / judgedTotal) * 100) : 0;

      return {
          total: allProposalTasks.length,
          wonCount,
          lostCount,
          unjudgedCount,
          rate,
          relevantTasks: allProposalTasks,
          wonTasks,
          lostTasks,
          unjudgedTasks
      };
  }, [tasks, timeRange, start, end, categories]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="圖形化統計監控中心 (Visual Analytics)" maxWidth="max-w-5xl">
       {/* Header Controls */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
             {(['SCHEDULE', 'DESIGN', 'DESIGN_CHANGE_SUCCESS', 'CHANGE', 'PROPOSAL'] as const).map(type => (
               <button
                 key={type}
                 onClick={() => setActiveTab(type)}
                 className={`px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 {type === 'SCHEDULE' && <Calendar className="w-4 h-4" />}
                 {type === 'DESIGN' && <Target className="w-4 h-4" />}
                 {type === 'DESIGN_CHANGE_SUCCESS' && <CheckCircle2 className="w-4 h-4" />}
                 {type === 'CHANGE' && <RotateCcw className="w-4 h-4" />}
                 {type === 'PROPOSAL' && <Lightbulb className="w-4 h-4" />}
                 
                 {type === 'SCHEDULE' && '日程達成率'}
                 {type === 'DESIGN' && '設計成功率'}
                 {type === 'DESIGN_CHANGE_SUCCESS' && '變更成功率'}
                 {type === 'CHANGE' && '變更原因'}
                 {type === 'PROPOSAL' && '提案成功率'}
               </button>
             ))}
          </div>

          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-slate-400 uppercase">時間維度:</span>
             <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['MONTH', 'QUARTER', 'YEAR'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${timeRange === range ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {range === 'MONTH' ? '月' : range === 'QUARTER' ? '季' : '年'}
                  </button>
                ))}
             </div>
          </div>
       </div>

       {/* Content Area */}
       <div className="min-h-[400px]">
          {/* 1. Schedule View */}
          {activeTab === 'SCHEDULE' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                   {/* Big Number Card */}
                   <div 
                     className="w-full md:w-1/3 bg-blue-50 rounded-2xl p-6 border border-blue-100 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => setDrillDown({ type: '日程達成率 (總數)', tasks: scheduleStats.relevantTasks })}
                     title="點擊查看所有相關任務"
                   >
                      <div className="text-sm font-bold text-blue-500 uppercase tracking-wide mb-2">{rangeLabel}達成率</div>
                      <div className="text-6xl font-black text-blue-600 mb-2">{scheduleStats.rate}<span className="text-2xl">%</span></div>
                      <div 
                         className="text-sm text-blue-400 font-medium hover:text-blue-600"
                         onClick={(e) => {
                            e.stopPropagation();
                            setDrillDown({ type: '準時完成任務', tasks: scheduleStats.onTimeTasksList });
                         }}
                      >
                         準時: {scheduleStats.onTime} / 總數: {scheduleStats.total}
                      </div>
                      {/* Visual Bar */}
                      <div className="w-full h-3 bg-blue-200 rounded-full mt-4 overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${scheduleStats.rate}%` }}></div>
                      </div>
                   </div>

                   {/* Category Breakdown Bar Chart */}
                   <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <BarChart3 className="w-5 h-5 text-slate-500" /> 各類別達成狀況
                      </h3>
                      <div className="space-y-4">
                         {categories.map(cat => {
                            const stat = scheduleStats.catStats[cat.id] || { total: 0, onTime: 0 };
                            if (stat.total === 0) return null;
                            const rate = Math.round((stat.onTime / stat.total) * 100);
                            let color = 'bg-emerald-500';
                            if (rate < 60) color = 'bg-red-500';
                            else if (rate < 80) color = 'bg-amber-400';

                            return (
                               <div 
                                 key={cat.id} 
                                 className="cursor-pointer group"
                                 onClick={() => setDrillDown({ type: `${cat.name} 相關任務`, categoryId: cat.id, tasks: scheduleStats.catTasks[cat.id] })}
                                 title="點擊查看該類別任務"
                               >
                                  <div className="flex justify-between text-sm mb-1 group-hover:text-blue-600 transition-colors">
                                     <span className="font-bold text-slate-700 flex items-center gap-2 group-hover:text-blue-600">
                                        {getCategoryIconComponent(cat.icon)} {cat.name}
                                     </span>
                                     <span className="text-slate-500 group-hover:text-blue-500">{rate}% ({stat.onTime}/{stat.total})</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                     <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${rate}%` }}></div>
                                  </div>
                               </div>
                            );
                         })}
                         {Object.keys(scheduleStats.catStats).length === 0 && (
                            <div className="text-center text-slate-400 py-8">無相關數據</div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* 2. Design Success View */}
          {activeTab === 'DESIGN' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Radial Chart Area */}
                   <div 
                     className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex flex-col items-center justify-center relative min-h-[300px] cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => setDrillDown({ type: 'DV 驗證相關任務', tasks: designStats.relevantTasks })}
                     title="點擊查看所有驗證任務"
                   >
                      <h3 className="absolute top-6 left-6 font-bold text-indigo-800 flex items-center gap-2">
                         <Microscope className="w-5 h-5" /> DV 驗證通過率
                      </h3>
                      
                      {/* SVG Circle Chart */}
                      <div className="relative w-48 h-48">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-indigo-200" />
                            <circle 
                              cx="96" cy="96" r="88" 
                              stroke="currentColor" strokeWidth="12" 
                              fill="transparent" 
                              className="text-indigo-600 transition-all duration-1000 ease-out"
                              strokeDasharray={2 * Math.PI * 88}
                              strokeDashoffset={2 * Math.PI * 88 * (1 - designStats.rate / 100)}
                              strokeLinecap={designStats.rate > 0 ? "round" : "butt"}
                            />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-indigo-700">{designStats.rate}%</span>
                            <span className="text-xs text-indigo-400 font-bold uppercase">{rangeLabel}累積</span>
                         </div>
                      </div>
                   </div>

                   {/* Stats Details */}
                   <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-center space-y-6">
                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: 'DV 驗證相關任務 (總項)', tasks: designStats.relevantTasks })}
                      >
                         <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Target className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">總驗證項目 (Total Items)</div>
                            <div className="text-2xl font-bold text-slate-800">{designStats.totalItems} <span className="text-sm font-normal text-slate-400">項</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: 'DV 通過相關任務', tasks: designStats.passedTasks })}
                      >
                         <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                            <CheckCircle2 className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">已通過項目 (Passed)</div>
                            <div className="text-2xl font-bold text-slate-800">{designStats.passedItems} <span className="text-sm font-normal text-slate-400">項</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: 'DV 相關任務列表', tasks: designStats.relevantTasks })}
                      >
                         <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                            <Briefcase className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">相關任務數 (Tasks)</div>
                            <div className="text-2xl font-bold text-slate-800">{designStats.taskCount} <span className="text-sm font-normal text-slate-400">筆</span></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* 3. Design Change Success View (NEW) */}
          {activeTab === 'DESIGN_CHANGE_SUCCESS' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Radial Chart Area */}
                   <div 
                     className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col items-center justify-center relative min-h-[300px] cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => setDrillDown({ type: '設計變更相關任務', tasks: designChangeSuccessStats.relevantTasks })}
                     title="點擊查看所有設計變更任務"
                   >
                      <h3 className="absolute top-6 left-6 font-bold text-emerald-800 flex items-center gap-2">
                         <CheckCircle2 className="w-5 h-5" /> 設計變更成功率
                      </h3>
                      
                      {/* SVG Circle Chart */}
                      <div className="relative w-48 h-48">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-emerald-200" />
                            <circle 
                              cx="96" cy="96" r="88" 
                              stroke="currentColor" strokeWidth="12" 
                              fill="transparent" 
                              className="text-emerald-600 transition-all duration-1000 ease-out"
                              strokeDasharray={2 * Math.PI * 88}
                              strokeDashoffset={2 * Math.PI * 88 * (1 - designChangeSuccessStats.rate / 100)}
                              strokeLinecap={designChangeSuccessStats.rate > 0 ? "round" : "butt"}
                            />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-emerald-700">{designChangeSuccessStats.rate}%</span>
                            <span className="text-xs text-emerald-500 font-bold uppercase">{rangeLabel}變更</span>
                         </div>
                      </div>
                   </div>

                   {/* Stats Details */}
                   <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-center space-y-6">
                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '設計變更任務 (總件數)', tasks: designChangeSuccessStats.relevantTasks })}
                      >
                         <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                            <RotateCcw className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">總變更件數 (Total Cases)</div>
                            <div className="text-2xl font-bold text-slate-800">{designChangeSuccessStats.total} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '設計變更 (PASS)', tasks: designChangeSuccessStats.passTasks })}
                      >
                         <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                            <Check className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">PASS 件數 (Approved)</div>
                            <div className="text-2xl font-bold text-slate-800">{designChangeSuccessStats.passCount} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '設計變更 (NG)', tasks: designChangeSuccessStats.ngTasks })}
                      >
                         <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <Ban className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">NG 件數 (Rejected)</div>
                            <div className="text-2xl font-bold text-slate-800">{designChangeSuccessStats.ngCount} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '設計變更 (未判定)', tasks: designChangeSuccessStats.unjudgedTasks })}
                      >
                         <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <HelpCircle className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">未判定件數 (Unjudged)</div>
                            <div className="text-2xl font-bold text-slate-800">{designChangeSuccessStats.unjudgedCount} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* 4. Change Stats View */}
          {activeTab === 'CHANGE' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-6">
                   {/* Summary Row */}
                   <div className="flex gap-4 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setDrillDown({ type: '設計變更任務清單', tasks: changeStats.relevantTasks })}>
                      <div className="flex-1 bg-orange-50 p-6 rounded-2xl border border-orange-100 flex items-center justify-between">
                         <div>
                            <div className="text-orange-800 font-bold text-lg mb-1">設計變更總次數</div>
                            <div className="text-orange-600/70 text-sm">統計區間: {rangeLabel}</div>
                         </div>
                         <div className="text-5xl font-black text-orange-600">{changeStats.totalChanges}</div>
                      </div>
                      <div className="w-48 bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-center items-center">
                          <div className="text-slate-400 text-xs font-bold uppercase mb-1">影響任務</div>
                          <div className="text-3xl font-bold text-slate-800">{changeStats.taskCount}</div>
                      </div>
                   </div>

                   {/* Bar Chart for Change Reasons */}
                   <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[300px]">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Activity className="w-5 h-5 text-orange-500" /> 變更原因分析 (Change Analysis)
                      </h3>
                      
                      {Object.keys(changeStats.reasonStats).length > 0 ? (
                         <div className="space-y-4">
                            {Object.entries(changeStats.reasonStats)
                               .sort(([,a], [,b]) => (b as number) - (a as number))
                               .map(([reason, count]) => {
                                  const percentage = Math.round(((count as number) / changeStats.totalChanges) * 100);
                                  return (
                                     <div 
                                        key={reason} 
                                        className="relative cursor-pointer group"
                                        onClick={() => setDrillDown({ type: `變更原因: ${reason}`, tasks: changeStats.reasonTasks[reason] })}
                                        title={`點擊查看 ${reason} 相關任務`}
                                     >
                                        <div className="flex justify-between text-sm mb-1 z-10 relative group-hover:text-orange-700 transition-colors">
                                           <span className="font-bold text-slate-700">{reason}</span>
                                           <span className="text-slate-500 group-hover:text-orange-600">{count}次 ({percentage}%)</span>
                                        </div>
                                        <div className="w-full h-8 bg-slate-50 rounded-lg overflow-hidden relative border border-slate-100">
                                            <div 
                                              className="h-full bg-gradient-to-r from-orange-400 to-red-400 opacity-80 rounded-lg transition-all duration-1000" 
                                              style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                     </div>
                                  );
                               })}
                         </div>
                      ) : (
                         <div className="h-48 flex items-center justify-center text-slate-400">
                            無變更紀錄
                         </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* 5. Design Proposal Success View (NEW) */}
          {activeTab === 'PROPOSAL' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Radial Chart Area */}
                   <div 
                     className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex flex-col items-center justify-center relative min-h-[300px] cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => setDrillDown({ type: '設計提案相關任務', tasks: proposalStats.relevantTasks })}
                     title="點擊查看所有設計提案任務"
                   >
                      <h3 className="absolute top-6 left-6 font-bold text-amber-800 flex items-center gap-2">
                         <Lightbulb className="w-5 h-5" /> 提案成功率 (Success Rate)
                      </h3>
                      
                      {/* SVG Circle Chart */}
                      <div className="relative w-48 h-48">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-amber-200" />
                            <circle 
                              cx="96" cy="96" r="88" 
                              stroke="currentColor" strokeWidth="12" 
                              fill="transparent" 
                              className="text-amber-500 transition-all duration-1000 ease-out"
                              strokeDasharray={2 * Math.PI * 88}
                              strokeDashoffset={2 * Math.PI * 88 * (1 - proposalStats.rate / 100)}
                              strokeLinecap={proposalStats.rate > 0 ? "round" : "butt"}
                            />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-amber-700">{proposalStats.rate}%</span>
                            <span className="text-xs text-amber-600 font-bold uppercase">{rangeLabel}提案</span>
                         </div>
                      </div>
                   </div>

                   {/* Stats Details */}
                   <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-center space-y-6">
                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '設計提案任務 (總件數)', tasks: proposalStats.relevantTasks })}
                      >
                         <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                            <Lightbulb className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">總提案件數 (Total Proposals)</div>
                            <div className="text-2xl font-bold text-slate-800">{proposalStats.total} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '提案成功 (WON)', tasks: proposalStats.wonTasks })}
                      >
                         <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                            <Trophy className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">成功/轉開發 (WON)</div>
                            <div className="text-2xl font-bold text-slate-800">{proposalStats.wonCount} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '提案失敗 (LOST)', tasks: proposalStats.lostTasks })}
                      >
                         <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <X className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">未採用 (LOST)</div>
                            <div className="text-2xl font-bold text-slate-800">{proposalStats.lostCount} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>

                      <div 
                        className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => setDrillDown({ type: '未回報結果 (Pending)', tasks: proposalStats.unjudgedTasks })}
                      >
                         <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <HelpCircle className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-sm text-slate-500">未回報結果 (Unreported)</div>
                            <div className="text-2xl font-bold text-slate-800">{proposalStats.unjudgedCount} <span className="text-sm font-normal text-slate-400">件</span></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}
       </div>

       {/* Drill Down Modal */}
       <GeneralTaskListModal
          isOpen={!!drillDown}
          onClose={() => setDrillDown(null)}
          title={drillDown?.type || '任務清單'}
          tasks={drillDown?.tasks || []}
          users={users}
          categories={categories}
          zIndex="z-[80]" // Higher z-index to sit on top of stats modal
       />
    </Modal>
  );
};

export const TransferModal = ({ isOpen, onClose, onConfirm, users, taskTitle }: { isOpen: boolean; onClose: () => void; onConfirm: (uid: string) => void; users: User[]; taskTitle: string }) => {
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="轉派任務" zIndex="z-[60]">
      <div className="space-y-4">
        <p className="text-slate-600">您正在轉派任務：<span className="font-bold text-slate-900">{taskTitle}</span></p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">選擇接手人員</label>
          <select className="w-full p-2 border rounded-lg" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => { onConfirm(selectedUser); onClose(); }}>確認轉派</Button>
        </div>
      </div>
    </Modal>
  );
};

export const UserDetailModal = ({ isOpen, onClose, user, tasks, onTransferTask, categories }: { isOpen: boolean; onClose: () => void; user: User | null; tasks: Task[]; onTransferTask?: (t: Task) => void; categories: Category[] }) => {
  if (!user) return null;
  const userTasks = tasks.filter(t => t.userId === user.id);
  const activeTasks = userTasks.filter(t => t.status !== 'DONE');
  const completedTasks = userTasks.filter(t => t.status === 'DONE');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="成員詳情" maxWidth="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <UserAvatar user={user} size="xl" showShadow />
        <div>
          <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
          <p className="text-slate-500">{user.employeeId} • {user.role}</p>
        </div>
      </div>
      
      <h3 className="font-bold text-slate-800 mb-2">進行中任務 ({activeTasks.length})</h3>
      <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
        {activeTasks.length > 0 ? activeTasks.map(task => (
           <TaskItem 
             key={task.id} 
             task={task} 
             categories={categories} 
             showLogsToggle={true} 
             onTransfer={onTransferTask ? () => onTransferTask(task) : undefined} 
           />
        )) : <p className="text-slate-400 text-center text-sm">無進行中任務</p>}
      </div>

      <h3 className="font-bold text-slate-800 mb-2">已完成任務 (近5筆)</h3>
      <div className="space-y-2">
         {completedTasks.slice(0, 5).map(task => (
           <TaskItem key={task.id} task={task} categories={categories} showLogsToggle={true} />
         ))}
         {completedTasks.length === 0 && <p className="text-slate-400 text-center text-sm">尚無完成紀錄</p>}
      </div>
    </Modal>
  );
};

export const DailyWorkloadModal = ({ 
  isOpen, 
  onClose, 
  dateStr, 
  tasks, 
  categories 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  dateStr: string | null; 
  tasks: Task[]; 
  categories: Category[];
}) => {
  if (!dateStr) return null;
  
  const displayDate = parseDateLocal(dateStr).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  const targetDateObj = parseDateLocal(dateStr);
  targetDateObj.setHours(0,0,0,0);

  // Filter Logic based on user requirement:
  // 1. Log on day
  // 2. Scheduled for day
  // 3. EXCLUDE completed BEFORE this day
  const dailyTasks = tasks.filter(task => {
    // 1. Log updated on this day
    const hasLogOnDay = task.logs && task.logs.some(log => log.date === dateStr);
    if (hasLogOnDay) return true;

    // 2. Schedule Check
    let start = parseDateLocal(task.startDate || task.receiveDate);
    start.setHours(0,0,0,0);
    
    // If the task is DONE, check completion date
    if (task.status === 'DONE' && task.completedDate) {
        const completed = parseDateLocal(task.completedDate);
        completed.setHours(0,0,0,0);
        // If completed BEFORE target date, exclude it (unless it has a log on target date, covered above)
        if (completed.getTime() < targetDateObj.getTime()) {
            return false;
        }
    }

    let end = parseDateLocal(task.deadline);
    end.setHours(0,0,0,0);

    // Range Check
    if (targetDateObj.getTime() >= start.getTime() && targetDateObj.getTime() <= end.getTime()) {
        return true;
    }

    return false;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`工作清單 - ${displayDate}`} maxWidth="max-w-3xl">
       <div className="space-y-2 max-h-[60vh] overflow-y-auto">
         {dailyTasks.length > 0 ? dailyTasks.map((task: Task) => (
            <TaskItem 
              key={task.id}
              task={task} 
              categories={categories} 
              showOwner 
              showLogsToggle={true}
            />
         )) : (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>本日無排定主要工作</p>
            </div>
         )}
       </div>
    </Modal>
  );
};

export const TeamDailyWorkloadModal = ({
  isOpen,
  onClose,
  dateStr,
  users,
  tasks,
  categories // Added prop
}: {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string | null;
  users: User[];
  tasks: Task[];
  categories: Category[]; // Added type
}) => {
  if (!dateStr) return null;

  const targetDate = parseDateLocal(dateStr);
  targetDate.setHours(0,0,0,0);

  const displayDate = targetDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  
  // Include both Engineers and Assistants
  const engineers = users.filter(u => u.role === 'ENGINEER' || u.role === 'ASSISTANT');

  // Calculate load per engineer for this specific day
  const engineerLoads = engineers.map(eng => {
      // Filter by User Only first (include DONE tasks to check completion date)
      const engTasks = tasks.filter(t => t.userId === eng.id);
      
      let dailyLoad = 0;
      const relevantTasks: Task[] = [];

      engTasks.forEach(task => {
          // --- Inclusion Logic Same as DailyWorkloadModal ---
          // 1. Log Check
          const hasLog = task.logs && task.logs.some(l => l.date === dateStr);
          
          // 2. Schedule Check
          let start = parseDateLocal(task.startDate || task.receiveDate);
          start.setHours(0,0,0,0);
          
          let end = parseDateLocal(task.deadline);
          end.setHours(0,0,0,0);
          if (end < start) end = new Date(start);

          // Determine if "Scheduled" for today
          let isScheduled = (targetDate.getTime() >= start.getTime() && targetDate.getTime() <= end.getTime());
          
          // 3. Exclude if completed BEFORE today
          if (task.status === 'DONE' && task.completedDate) {
              const doneDate = parseDateLocal(task.completedDate);
              doneDate.setHours(0,0,0,0);
              if (doneDate.getTime() < targetDate.getTime()) {
                 isScheduled = false; // It's done in the past
              }
          }

          if (hasLog || isScheduled) {
              relevantTasks.push(task);

              // Calculate Load only if active/scheduled logic holds (Logs usually mean work done, so count that too if we had precise hours per log)
              // For simplicity, stick to remaining hours distribution for capacity calculation
              if (task.status !== 'DONE') {
                  const remaining = Math.max(0, task.estimatedHours - task.actualHours);
                  if (remaining > 0) {
                      // Calculate business days
                      let businessDays = 0;
                      let temp = new Date(start);
                      while (temp <= end) {
                          const d = temp.getDay();
                          if (d !== 0 && d !== 6) businessDays++;
                          temp.setDate(temp.getDate() + 1);
                      }
                      if (businessDays === 0) businessDays = 1;
                      
                      const load = remaining / businessDays;
                      
                      // Only add load if it's strictly within schedule
                      if (targetDate.getTime() >= start.getTime() && targetDate.getTime() <= end.getTime()) {
                         dailyLoad += load;
                      }
                  }
              }
          }
      });
      
      return { user: eng, load: dailyLoad, tasks: relevantTasks };
  }).sort((a,b) => b.load - a.load);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`團隊產能詳情 - ${displayDate}`} maxWidth="max-w-4xl">
       <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {engineerLoads.map(({ user, load, tasks }) => {
             const percentage = Math.min(100, (load / 8) * 100);
             let colorClass = "bg-emerald-500";
             let statusText = "餘裕";
             let statusColor = "text-emerald-600";
             
             if (load > 8) {
                 colorClass = "bg-red-500";
                 statusText = "超載";
                 statusColor = "text-red-600 font-bold";
             } else if (load > 6) {
                 colorClass = "bg-orange-500";
                 statusText = "滿載";
                 statusColor = "text-orange-600 font-bold";
             } else if (load > 4) {
                 colorClass = "bg-amber-400";
                 statusText = "忙碌";
                 statusColor = "text-amber-600";
             }

             return (
               <div key={user.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-4 mb-2">
                      <UserAvatar user={user} size="md" />
                      <div className="w-32 shrink-0">
                         <div className="font-bold text-slate-800 flex items-center gap-2">
                            {user.name}
                            {user.role === 'ASSISTANT' && <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">Asst</span>}
                         </div>
                         <div className={`text-xs ${statusColor}`}>{statusText} ({load.toFixed(1)}h)</div>
                      </div>
                      
                      <div className="flex-1">
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Task List (Using TaskItem) */}
                  <div className="mt-3 ml-14 space-y-2">
                      {tasks.length > 0 ? tasks.map(t => (
                          <TaskItem 
                            key={t.id} 
                            task={t} 
                            categories={categories} 
                            showOwner={false} 
                            showLogsToggle={true}
                          />
                      )) : (
                          <span className="text-xs text-slate-400 italic">本日無主要排程</span>
                      )}
                  </div>
               </div>
             );
          })}
       </div>
    </Modal>
  );
};

export const TaskModal = ({ isOpen, onClose, onSubmit, editingTask, categories, users, currentUser, onRequestDateChange, tasks }: any) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', categoryId: categories[0]?.id || '', priority: 'MEDIUM', phase: 'P2',
    estimatedHours: 4, receiveDate: toLocalISOString(new Date()), deadline: toLocalISOString(new Date()),
    partNumber: '', userId: currentUser?.id,
    dvCount: 0, dvAchieved: 0,
    changeOrderNumber: '', changeCount: 1, changeCategory: CHANGE_CATEGORY_OPTIONS[0], changeAnalysis: CHANGE_ANALYSIS_OPTIONS[0],
    isCoDev: false, hasCompetitor: false
  });
  const [changeReason, setChangeReason] = useState('');
  
  useEffect(() => {
    if (editingTask && editingTask.id) {
      setFormData(editingTask);
    } else {
      const defaultCat = categories[0];
      const defaults = {
        title: '', description: '', categoryId: defaultCat?.id || '', priority: 'MEDIUM', phase: 'P2',
        estimatedHours: defaultCat?.suggestedHours || 4, 
        receiveDate: toLocalISOString(new Date()), deadline: toLocalISOString(new Date()),
        partNumber: '', userId: currentUser?.id,
        dvCount: 0, dvAchieved: 0,
        changeOrderNumber: '', changeCount: 1, changeCategory: CHANGE_CATEGORY_OPTIONS[0], changeAnalysis: CHANGE_ANALYSIS_OPTIONS[0],
        isCoDev: false, hasCompetitor: false
      };
      
      // If editingTask is provided but has no ID, treat it as partial template override
      setFormData({ ...defaults, ...(editingTask || {}) });
    }
    setChangeReason('');
  }, [editingTask, isOpen, currentUser, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if task exists and has ID (editing mode) vs creating new (might have prefilled data but no ID)
    const isEditingExistingTask = editingTask && editingTask.id;
    
    if (isEditingExistingTask && currentUser.role !== 'ADMIN' && onRequestDateChange) {
       const isDateChanged = formData.receiveDate !== editingTask.receiveDate || formData.deadline !== editingTask.deadline;
       if (isDateChanged) {
         if (!changeReason.trim()) {
           alert('請填寫日期變更原因');
           return;
         }
         const request: DateChangeRequest = {
           newReceiveDate: formData.receiveDate!,
           newDeadline: formData.deadline!,
           reason: changeReason,
           requesterId: currentUser.id,
           requestedAt: new Date().toISOString()
         };
         onRequestDateChange(editingTask.id, request);
         onClose();
         return;
       }
    }
    
    onSubmit(formData);
    onClose();
  };
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    const cat = categories.find((c: Category) => c.id === newCatId);
    
    setFormData(prev => ({
        ...prev,
        categoryId: newCatId,
        estimatedHours: cat ? cat.suggestedHours : prev.estimatedHours 
    }));
  };

  const isEditingExistingTask = editingTask && editingTask.id;
  const isDateChanged = isEditingExistingTask && (formData.receiveDate !== editingTask.receiveDate || formData.deadline !== editingTask.deadline);
  const needsApproval = isDateChanged && currentUser.role !== 'ADMIN';

  const selectedCategory = categories.find((c: Category) => c.id === formData.categoryId);
  
  const isVerificationTask = selectedCategory?.name.includes('測試') || selectedCategory?.name.includes('驗證') || selectedCategory?.name.includes('試模') || selectedCategory?.name.includes('Test');
  
  const isDesignChangeTask = selectedCategory?.name.includes('設計變更');

  const isDesignProposal = selectedCategory?.name === '設計提案';

  const designSuccessRate = (formData.dvCount && formData.dvCount > 0) 
    ? Math.round(((formData.dvAchieved || 0) / formData.dvCount) * 100) 
    : 0;

  // Workload Calculation Helper for Admin View
  const getUserWorkload = (uid: string) => {
      if (!tasks) return { count: 0, hours: 0 };
      const activeUserTasks = tasks.filter((t: Task) => t.userId === uid && t.status !== 'DONE');
      const count = activeUserTasks.length;
      const hours = activeUserTasks.reduce((acc: number, t: Task) => acc + Math.max(0, t.estimatedHours - t.actualHours), 0);
      
      // Calculate earliest deadline
      const sorted = activeUserTasks.sort((a: Task, b: Task) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      const nextDeadline = sorted.length > 0 ? sorted[0].deadline : null;

      return { count, hours, nextDeadline };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTask && editingTask.id ? '編輯任務' : '建立任務'} maxWidth="max-w-2xl" zIndex="z-[60]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="md:col-span-2">
             <label className="block text-sm font-medium text-slate-700 mb-1">任務標題</label>
             <input required type="text" className="w-full p-2 border rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
           </div>
           
           <div className="md:col-span-2">
             <label className="block text-sm font-medium text-slate-700 mb-1">任務描述</label>
             <textarea className="w-full p-2 border rounded-lg h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">專案品號 (Part Number)</label>
             <input type="text" className="w-full p-2 border rounded-lg font-mono" value={formData.partNumber || ''} onChange={e => setFormData({...formData, partNumber: e.target.value})} placeholder="e.g. 805-0023-01" />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">任務類別</label>
             <select 
                className="w-full p-2 border rounded-lg" 
                value={formData.categoryId} 
                onChange={handleCategoryChange}
             >
               {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           </div>
           
           {isDesignChangeTask && (
             <div className="md:col-span-2 bg-orange-50 p-4 rounded-lg border border-orange-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                 <div className="md:col-span-2 text-sm font-bold text-orange-700 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> 設計變更資訊
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">變更單號</label>
                    <input 
                       type="text" 
                       className="w-full p-2 border border-orange-300 rounded-lg text-sm"
                       placeholder="例如: ECN-2023001"
                       value={formData.changeOrderNumber || ''}
                       onChange={e => setFormData({...formData, changeOrderNumber: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">變更次數</label>
                    <input 
                       type="number" 
                       min="1"
                       className="w-full p-2 border border-orange-300 rounded-lg text-sm"
                       value={formData.changeCount || 1}
                       onChange={e => setFormData({...formData, changeCount: Number(e.target.value)})}
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">變更分類</label>
                    <select 
                       className="w-full p-2 border border-orange-300 rounded-lg text-sm"
                       value={formData.changeCategory || CHANGE_CATEGORY_OPTIONS[0]}
                       onChange={e => setFormData({...formData, changeCategory: e.target.value})}
                    >
                       {CHANGE_CATEGORY_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                       ))}
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">變更分析</label>
                    <select 
                       className="w-full p-2 border border-orange-300 rounded-lg text-sm"
                       value={formData.changeAnalysis || CHANGE_ANALYSIS_OPTIONS[0]}
                       onChange={e => setFormData({...formData, changeAnalysis: e.target.value})}
                    >
                       {CHANGE_ANALYSIS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                       ))}
                    </select>
                 </div>
             </div>
           )}

           {isDesignProposal && (
             <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                 <div className="md:col-span-2 text-sm font-bold text-blue-700 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> 提案詳細資訊
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-blue-800 mb-1">是否為協同設計開發</label>
                    <select 
                       className="w-full p-2 border border-blue-300 rounded-lg text-sm"
                       value={formData.isCoDev ? 'true' : 'false'}
                       onChange={e => setFormData({...formData, isCoDev: e.target.value === 'true'})}
                    >
                       <option value="false">否</option>
                       <option value="true">是</option>
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-blue-800 mb-1">是否有競爭對手</label>
                    <select 
                       className="w-full p-2 border border-blue-300 rounded-lg text-sm"
                       value={formData.hasCompetitor ? 'true' : 'false'}
                       onChange={e => setFormData({...formData, hasCompetitor: e.target.value === 'true'})}
                    >
                       <option value="false">否</option>
                       <option value="true">是</option>
                    </select>
                 </div>
             </div>
           )}
           
           {selectedCategory?.note && (
             <div className="md:col-span-2 animate-in fade-in duration-300">
               <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                 <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                 <div>
                   <h4 className="text-sm font-bold text-amber-700">類別注意事項 (Precautions)</h4>
                   <p className="text-sm text-amber-800 leading-relaxed mt-1">
                     {selectedCategory.note}
                   </p>
                 </div>
               </div>
             </div>
           )}

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">專案階段</label>
             <select className="w-full p-2 border rounded-lg" value={formData.phase} onChange={e => setFormData({...formData, phase: e.target.value as ProjectPhase})}>
               <option value="P1">P1 (ML0~2)</option>
               <option value="P2">P2 (ML3)</option>
               <option value="P3">P3 (ML4)</option>
               <option value="P4">P4 (ML5~6)</option>
               <option value="P5">P5 (ML7)</option>
               <option value="OTHER">其他 (Other)</option>
             </select>
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">優先級</label>
             <select className="w-full p-2 border rounded-lg" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as TaskPriority})}>
               <option value="HIGH">High (緊急)</option>
               <option value="MEDIUM">Medium (一般)</option>
               <option value="LOW">Low (低)</option>
             </select>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">預計開始日期</label>
             <input required type="date" className="w-full p-2 border rounded-lg" value={formData.receiveDate} onChange={e => setFormData({...formData, receiveDate: e.target.value})} />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">預計結束日期 (Deadline)</label>
             <input required type="date" className="w-full p-2 border rounded-lg" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">預估工時 (小時)</label>
             <input required type="number" min="0.5" step="0.5" className="w-full p-2 border rounded-lg" value={formData.estimatedHours} onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})} />
           </div>
           
           {currentUser.role === 'ADMIN' && users && (
             <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
               <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-500" /> 指派人員 (Workload Check)
               </label>
               <select 
                 className="w-full p-2 border rounded-lg mb-2" 
                 value={formData.userId} 
                 onChange={e => setFormData({...formData, userId: e.target.value})}
               >
                 {users.map((u: User) => {
                    const stats = getUserWorkload(u.id);
                    return (
                        <option key={u.id} value={u.id}>
                           {u.name} (進行中: {stats.count})
                        </option>
                    );
                 })}
               </select>

               {/* Selected User Workload Visual */}
               {formData.userId && (
                 (() => {
                    const selectedUser = users.find((u:User) => u.id === formData.userId);
                    const stats = getUserWorkload(formData.userId);
                    
                    let loadColor = "bg-emerald-500";
                    let loadText = "餘裕 (Low Load)";
                    let textColor = "text-emerald-700";
                    let bgColor = "bg-emerald-50 border-emerald-200";

                    if (stats.count > 6) {
                        loadColor = "bg-red-500";
                        loadText = "繁忙 (Heavy Load)";
                        textColor = "text-red-700";
                        bgColor = "bg-red-50 border-red-200";
                    } else if (stats.count > 3) {
                        loadColor = "bg-amber-400";
                        loadText = "適中 (Medium Load)";
                        textColor = "text-amber-700";
                        bgColor = "bg-amber-50 border-amber-200";
                    }

                    return (
                      <div className={`mt-2 p-3 rounded-lg border ${bgColor} flex items-center gap-4 animate-in fade-in`}>
                         <div className="shrink-0">
                            <UserAvatar user={selectedUser} size="md" />
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <span className={`text-sm font-bold ${textColor}`}>{loadText}</span>
                               <span className="text-xs text-slate-500 font-medium">累積待辦: {stats.hours}h</span>
                            </div>
                            <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                               <div 
                                 className={`h-full rounded-full ${loadColor} transition-all duration-500`} 
                                 style={{ width: `${Math.min(100, (stats.count / 10) * 100)}%` }}
                               ></div>
                            </div>
                            <div className="flex justify-between mt-1">
                               <span className="text-xs text-slate-500">進行中任務: {stats.count}</span>
                               {stats.nextDeadline && <span className="text-xs text-slate-500">最近截止: {stats.nextDeadline}</span>}
                            </div>
                         </div>
                      </div>
                    );
                 })()
               )}
             </div>
           )}

           {isVerificationTask && isEditingExistingTask && (
             <div className="md:col-span-2 bg-indigo-50 p-4 rounded-lg border border-indigo-200 mt-2">
                <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                   <Microscope className="w-4 h-4"/> 試模/驗證結果回報 (Result Reporting)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-indigo-900 mb-1">DV 項目總數 (Total Items)</label>
                       <input 
                          type="number" 
                          min="0"
                          className="w-full p-2 border border-indigo-300 rounded-lg text-center font-bold text-indigo-700"
                          value={formData.dvCount || 0}
                          onChange={e => setFormData({...formData, dvCount: Number(e.target.value)})}
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-indigo-900 mb-1">DV 達成項目數 (Achieved)</label>
                       <input 
                          type="number" 
                          min="0"
                          max={formData.dvCount}
                          className="w-full p-2 border border-indigo-300 rounded-lg text-center font-bold text-indigo-700"
                          value={formData.dvAchieved || 0}
                          onChange={e => setFormData({...formData, dvAchieved: Number(e.target.value)})}
                       />
                    </div>
                </div>
                <div className="flex justify-end items-center mt-2 gap-2">
                   <span className="text-sm text-indigo-600">自動計算設計成功率:</span>
                   <span className="text-xl font-bold text-indigo-700">{designSuccessRate}%</span>
                </div>
             </div>
           )}
        </div>
        
        {needsApproval && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 animate-in fade-in">
             <div className="flex items-center gap-2 text-orange-700 font-bold mb-2">
                <AlertTriangle className="w-4 h-4" /> 需要簽核
             </div>
             <p className="text-xs text-orange-600 mb-2">您修改了任務日期，這需要主管簽核才能生效。</p>
             <label className="block text-sm font-medium text-slate-700 mb-1">變更原因 *</label>
             <input required type="text" className="w-full p-2 border border-orange-300 rounded-lg bg-white" placeholder="請輸入延期/變更原因..." value={changeReason} onChange={e => setChangeReason(e.target.value)} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">{needsApproval ? '送出變更申請' : '儲存任務'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const LogModal = ({ isOpen, onClose, onSubmit, taskTitle }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; taskTitle: string }) => {
  const [content, setContent] = useState('');
  const [hoursSpent, setHoursSpent] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ content, hoursSpent });
    setContent('');
    setHoursSpent(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="填寫工作日誌" zIndex="z-[60]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-2">
          任務：<span className="font-bold">{taskTitle}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">工作內容說明</label>
          <textarea required className="w-full p-2 border rounded-lg h-32" placeholder="請簡述今日進度..." value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">投入工時 (小時)</label>
          <input required type="number" min="0.5" step="0.5" className="w-full p-2 border rounded-lg" value={hoursSpent} onChange={e => setHoursSpent(Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">新增日誌</Button>
        </div>
      </form>
    </Modal>
  );
};

export const CategoryModal = ({ isOpen, onClose, categories, onAddCategory, onUpdateCategory, onDeleteCategory, onReorderCategories }: any) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatHours, setNewCatHours] = useState(1);
  const [newCatNote, setNewCatNote] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('layers');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Category>>({});
  
  // Icon Picker toggle for editing row (mobile friendly)
  const [showIconMenu, setShowIconMenu] = useState(false);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName) {
      onAddCategory(newCatName, newCatHours, newCatNote, newCatIcon);
      setNewCatName('');
      setNewCatNote('');
      setNewCatIcon('layers');
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setShowIconMenu(false); 
    setEditFormData({
      name: cat.name,
      suggestedHours: cat.suggestedHours,
      note: cat.note || '',
      icon: cat.icon || 'layers'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setShowIconMenu(false);
  };

  const saveEdit = (id: string) => {
    if (onUpdateCategory && editFormData.name) {
       onUpdateCategory(id, editFormData);
    }
    setEditingId(null);
    setEditFormData({});
    setShowIconMenu(false);
  };
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex === dropIndex) return;
    
    if (onReorderCategories) {
        const newCats = [...categories];
        const [draggedItem] = newCats.splice(draggedIndex, 1);
        newCats.splice(dropIndex, 0, draggedItem);
        onReorderCategories(newCats);
    }
    setDraggedIndex(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="管理任務類別 & 排序" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">提示：您可以拖曳左側把手調整類別顯示順序，或點擊鉛筆圖示編輯。</p>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pb-10">
          {categories.map((cat: Category, index: number) => {
            const isEditing = editingId === cat.id;

            if (isEditing) {
              return (
                 <div key={cat.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200 gap-2 flex flex-col animate-in fade-in">
                    <div className="flex gap-2 relative">
                       {/* Icon Picker (Click to Toggle) */}
                       <div className="relative">
                          <button
                             type="button"
                             onClick={() => setShowIconMenu(!showIconMenu)}
                             className="w-9 h-9 border rounded bg-white flex items-center justify-center text-slate-700 hover:border-blue-400"
                          >
                             {getIconComponent(editFormData.icon)}
                          </button>
                          
                          {showIconMenu && (
                             <div className="absolute top-10 left-0 bg-white border shadow-xl p-2 rounded-lg w-72 z-20 flex flex-wrap gap-1 animate-in fade-in zoom-in-95">
                                 {CATEGORY_ICONS.map(ic => (
                                    <button
                                      key={ic}
                                      type="button"
                                      onClick={() => {
                                        setEditFormData({...editFormData, icon: ic});
                                        setShowIconMenu(false);
                                      }}
                                      className={`p-2 rounded hover:bg-slate-100 ${editFormData.icon === ic ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-slate-500'}`}
                                    >
                                       {getIconComponent(ic)}
                                    </button>
                                 ))}
                             </div>
                          )}
                       </div>

                       <input 
                         type="text" 
                         className="flex-1 p-1.5 text-sm border rounded" 
                         value={editFormData.name} 
                         onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                         placeholder="類別名稱"
                       />
                       <input 
                         type="number" 
                         min="0.5"
                         step="0.5"
                         className="w-20 p-1.5 text-sm border rounded" 
                         value={editFormData.suggestedHours} 
                         onChange={e => setEditFormData({...editFormData, suggestedHours: Number(e.target.value)})}
                         placeholder="工時"
                       />
                    </div>
                    <input 
                       type="text" 
                       className="w-full p-1.5 text-sm border rounded" 
                       value={editFormData.note} 
                       onChange={e => setEditFormData({...editFormData, note: e.target.value})}
                       placeholder="注意事項 (選填)"
                    />
                    <div className="flex justify-end gap-2 mt-1">
                       <Button variant="secondary" className="px-2 py-1 h-8 text-xs" onClick={cancelEdit}>
                          取消
                       </Button>
                       <Button className="px-2 py-1 h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => saveEdit(cat.id)}>
                          <Save className="w-3 h-3" /> 儲存變更
                       </Button>
                    </div>
                 </div>
              );
            }

            return (
              <div 
                 key={cat.id} 
                 draggable={onReorderCategories && !editingId}
                 onDragStart={(e) => handleDragStart(e, index)}
                 onDragOver={(e) => handleDragOver(e, index)}
                 onDrop={(e) => handleDrop(e, index)}
                 className={`flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 gap-2 transition-all ${draggedIndex === index ? 'opacity-40 border-dashed border-blue-400 bg-blue-50' : ''}`}
              >
                 <div className="flex-1 flex items-center gap-3">
                   {onReorderCategories && (
                      <div className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                         <GripVertical className="w-5 h-5" />
                      </div>
                   )}
                   <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                          {getCategoryIconComponent(cat.icon)}
                          <span className="font-medium text-slate-700">{cat.name}</span>
                          <span className="text-xs bg-white border px-1 rounded text-slate-500">{cat.suggestedHours}h</span>
                       </div>
                       {cat.note && (
                         <div className="text-xs text-slate-500 flex items-center gap-1">
                           <Info className="w-3 h-3" /> {cat.note}
                         </div>
                       )}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-1 self-end md:self-auto ml-8 md:ml-0">
                   {onUpdateCategory && (
                     <button onClick={() => startEdit(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded" title="編輯類別">
                       <Pencil className="w-4 h-4" />
                     </button>
                   )}
                   <button onClick={() => onDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded" title="刪除類別">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
              </div>
            );
          })}
        </div>
        
        <form onSubmit={handleAdd} className="border-t pt-4 space-y-3">
           <label className="text-xs font-bold text-slate-400 uppercase">新增類別</label>
           
           <div className="flex gap-2 items-start">
             <div className="w-full">
                <div className="flex gap-2 mb-2">
                   <div className="flex-1">
                      <input required type="text" placeholder="類別名稱 (如: 機構設計)" className="w-full p-2 border rounded-lg text-sm" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                   </div>
                   <div className="w-24">
                      <input required type="number" min="0.5" step="0.5" placeholder="預設工時" className="w-full p-2 border rounded-lg text-sm" value={newCatHours} onChange={e => setNewCatHours(Number(e.target.value))} />
                   </div>
                </div>
                
                <input 
                  type="text" 
                  placeholder="注意事項 (選填，如: 需確認干涉檢查...)" 
                  className="w-full p-2 border rounded-lg text-sm mb-2" 
                  value={newCatNote} 
                  onChange={e => setNewCatNote(e.target.value)} 
                />

                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">選擇圖示:</div>
                    <div className="flex flex-wrap gap-1">
                        {CATEGORY_ICONS.map(ic => (
                            <button
                                key={ic}
                                type="button"
                                onClick={() => setNewCatIcon(ic)}
                                className={`p-1.5 rounded hover:bg-white border transition-all ${newCatIcon === ic ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'border-transparent text-slate-400'}`}
                            >
                                {getIconComponent(ic)}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
           </div>
           
           <div className="flex justify-end">
              <Button type="submit" variant="secondary"><Plus className="w-4 h-4" /> 新增</Button>
           </div>
        </form>
      </div>
    </Modal>
  );
};

export const OverdueListModal = ({ isOpen, onClose, tasks, users, categories, onTransferTask }: any) => {
  const overdueTasks = tasks.filter((t: Task) => t.status !== 'DONE' && new Date(t.deadline) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`逾期任務清單 (${overdueTasks.length})`} maxWidth="max-w-3xl">
       <div className="space-y-2 max-h-[60vh] overflow-y-auto">
         {overdueTasks.length > 0 ? overdueTasks.map((task: Task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              categories={categories} 
              showOwner 
              users={users} 
              onTransfer={onTransferTask ? () => onTransferTask(task) : undefined} 
            />
         )) : <p className="text-slate-400 text-center py-8">目前沒有逾期任務</p>}
       </div>
    </Modal>
  );
};

export const GeneralTaskListModal = ({ isOpen, onClose, title, tasks, users, categories, onTransferTask, onEditTask, onDeleteTask }: any) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${title} (${tasks.length})`} maxWidth="max-w-3xl">
       <div className="space-y-2 max-h-[60vh] overflow-y-auto">
         {tasks.length > 0 ? tasks.map((task: Task) => (
            <TaskItem 
              key={task.id}
              task={task} 
              categories={categories} 
              showOwner 
              users={users} 
              onEdit={onEditTask ? () => onEditTask(task) : undefined}
              onDelete={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
              onTransfer={onTransferTask ? () => onTransferTask(task) : undefined}
              showLogsToggle={true}
            />
         )) : <p className="text-slate-400 text-center py-8">無相關任務</p>}
       </div>
    </Modal>
  );
};

export const TaskSearchModal = ({ isOpen, onClose, tasks, users, categories }: any) => {
  const [term, setTerm] = useState('');
  
  const filtered = term.trim() ? tasks.filter((t: Task) => 
    t.title.toLowerCase().includes(term.toLowerCase()) || 
    t.partNumber?.toLowerCase().includes(term.toLowerCase()) ||
    users.find((u:User) => u.id === t.userId)?.name.includes(term)
  ) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="搜尋任務" maxWidth="max-w-2xl">
       <div className="mb-4 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
         <input 
           autoFocus
           type="text" 
           className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
           placeholder="輸入標題、品號或負責人搜尋..." 
           value={term} 
           onChange={e => setTerm(e.target.value)} 
         />
       </div>
       <div className="space-y-2 max-h-[50vh] overflow-y-auto">
         {filtered.map((task: Task) => (
           <TaskItem key={task.id} task={task} categories={categories} showOwner users={users} showLogsToggle={true} />
         ))}
         {term && filtered.length === 0 && <p className="text-slate-400 text-center">找不到符合的結果</p>}
       </div>
    </Modal>
  );
};

export const BatchTaskModal = ({ isOpen, onClose, onSubmit, users, categories }: any) => {
  const [globalPartNumber, setGlobalPartNumber] = useState('');
  const [globalProjectOwner, setGlobalProjectOwner] = useState(users[0]?.id || '');
  
  const [rows, setRows] = useState([
    { categoryId: categories[0]?.id || '', phase: 'P2', deadline: '', estimatedHours: categories[0]?.suggestedHours || 4, userId: users[0]?.id }
  ]);

  useEffect(() => {
    if (isOpen) {
       // Reset logic if needed
    }
  }, [isOpen, users]);

  const addRow = () => setRows([...rows, { categoryId: categories[0]?.id || '', phase: 'P2', deadline: '', estimatedHours: categories[0]?.suggestedHours || 4, userId: users[0]?.id }]);
  
  const updateRow = (idx: number, field: string, val: any) => {
    const newRows = [...rows];
    const row: any = newRows[idx];
    row[field] = val;
    
    if (field === 'categoryId') {
        const cat = categories.find((c: Category) => c.id === val);
        if (cat) {
            row.estimatedHours = cat.suggestedHours;
        }
    }
    
    setRows(newRows);
  };

  const removeRow = (idx: number) => {
     if (rows.length > 1) {
        setRows(rows.filter((_, i) => i !== idx));
     }
  };

  const handleSubmit = () => {
    if (!globalPartNumber.trim()) {
        alert('請輸入專案品號 (Part Number)');
        return;
    }

    const tasks = rows.map(r => {
       const cat = categories.find((c: Category) => c.id === r.categoryId);
       const catName = cat ? cat.name : '未分類';
       
       const title = `${catName} - ${r.phase}`;

       return {
            title: title,
            deadline: r.deadline || toLocalISOString(new Date()),
            estimatedHours: r.estimatedHours,
            userId: r.userId, 
            categoryId: r.categoryId,
            priority: 'MEDIUM',
            phase: r.phase,
            receiveDate: toLocalISOString(new Date()),
            status: 'TODO',
            logs: [],
            actualHours: 0,
            partNumber: globalPartNumber, 
            description: `批次建立：${title}`
       };
    });
    
    onSubmit(tasks, globalPartNumber, globalProjectOwner);
    
    setGlobalPartNumber('');
    setRows([{ categoryId: categories[0]?.id || '', phase: 'P2', deadline: '', estimatedHours: categories[0]?.suggestedHours || 4, userId: users[0]?.id }]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="批次建立任務" maxWidth="max-w-5xl">
       <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                   專案品號 (Part Number) - 全局設定
                </label>
                <div className="relative">
                   <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     autoFocus
                     type="text" 
                     className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" 
                     placeholder="e.g. 805-0023-01" 
                     value={globalPartNumber} 
                     onChange={e => setGlobalPartNumber(e.target.value)} 
                   />
                </div>
             </div>
             
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                   專案負責人 (Project Owner) - 全局設定
                </label>
                <div className="relative">
                   <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <select 
                      className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={globalProjectOwner}
                      onChange={e => setGlobalProjectOwner(e.target.value)}
                   >
                      <option value="">-- 未指派 --</option>
                      {users.map(u => (
                         <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
                      ))}
                   </select>
                </div>
             </div>
          </div>
       </div>

       <div className="overflow-x-auto min-h-[200px]">
         <table className="w-full text-sm text-left">
           <thead>
             <tr className="border-b bg-slate-50">
               <th className="pb-2 pt-2 px-2 w-48">任務類別</th>
               <th className="pb-2 pt-2 px-2 w-32">專案階段</th>
               <th className="pb-2 pt-2 px-2 w-32">期限</th>
               <th className="pb-2 pt-2 px-2 w-20">工時</th>
               <th className="pb-2 pt-2 px-2 w-32">執行負責人</th>
               <th className="pb-2 pt-2 px-2 w-10"></th>
             </tr>
           </thead>
           <tbody>
             {rows.map((row, idx) => (
               <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                 <td className="p-2">
                    <select className="w-full p-1.5 border rounded" value={row.categoryId} onChange={e => updateRow(idx, 'categoryId', e.target.value)}>
                        {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </td>
                 <td className="p-2">
                    <select className="w-full p-1.5 border rounded" value={row.phase} onChange={e => updateRow(idx, 'phase', e.target.value)}>
                        <option value="P1">P1 (ML0~2)</option>
                        <option value="P2">P2 (ML3)</option>
                        <option value="P3">P3 (ML4)</option>
                        <option value="P4">P4 (ML5~6)</option>
                        <option value="P5">P5 (ML7)</option>
                        <option value="OTHER">其他 (Other)</option>
                    </select>
                 </td>
                 <td className="p-2">
                    <input type="date" className="w-full p-1.5 border rounded" value={row.deadline} onChange={e => updateRow(idx, 'deadline', e.target.value)} />
                 </td>
                 <td className="p-2">
                    <input type="number" step="0.5" className="w-full p-1.5 border rounded" value={row.estimatedHours} onChange={e => updateRow(idx, 'estimatedHours', Number(e.target.value))} />
                 </td>
                 <td className="p-2">
                   <select className="w-full p-1.5 border rounded" value={row.userId} onChange={e => updateRow(idx, 'userId', e.target.value)}>
                     {users.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                 </td>
                 <td className="p-2 text-center">
                    {rows.length > 1 && (
                        <button onClick={() => removeRow(idx)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
       <div className="mt-4 flex gap-2">
         <Button variant="secondary" onClick={addRow}><Plus className="w-4 h-4" /> 新增任務列</Button>
         <div className="flex-1"></div>
         <Button variant="secondary" onClick={onClose}>取消</Button>
         <Button onClick={handleSubmit}>建立任務 ({rows.length})</Button>
       </div>
    </Modal>
  );
};

export const ApprovalListModal = ({ isOpen, onClose, tasks, users, onApproveDateChange, onRejectDateChange, onApproveDelete, onRejectDelete }: any) => {
  const pendingChangeTasks = tasks.filter((t: Task) => t.pendingChange);
  const pendingDeleteTasks = tasks.filter((t: Task) => t.pendingDelete);

  const hasItems = pendingChangeTasks.length > 0 || pendingDeleteTasks.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="待簽核項目" maxWidth="max-w-3xl">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
         {hasItems ? (
           <>
             {/* Date Change Requests */}
             {pendingChangeTasks.map((task: Task) => {
               const req = task.pendingChange!;
               const requester = users.find((u: User) => u.id === req.requesterId)?.name || 'Unknown';
               
               return (
                 <div key={`change-${task.id}`} className="p-4 border border-orange-200 bg-orange-50 rounded-lg animate-in fade-in">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-slate-800">{task.title}</h4>
                       <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 日期變更
                       </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-3 space-y-1">
                       <p>申請人: <span className="font-medium text-slate-800">{requester}</span></p>
                       <p>原因: <span className="font-medium">{req.reason}</span></p>
                       <div className="flex gap-4 mt-2 bg-white p-2 rounded border border-orange-100">
                          <div>
                            <div className="text-xs text-slate-400">原定日期</div>
                            <div className="text-slate-500 line-through">{task.deadline}</div>
                          </div>
                          <ArrowRightLeft className="w-4 h-4 text-slate-300 self-center" />
                          <div>
                            <div className="text-xs text-orange-400 font-bold">新日期</div>
                            <div className="text-orange-600 font-bold">{req.newDeadline}</div>
                          </div>
                       </div>
                    </div>
                    <div className="flex justify-end gap-2">
                       <Button variant="secondary" onClick={() => onRejectDateChange(task.id)} className="text-red-600 hover:bg-red-50"><X className="w-4 h-4" /> 駁回</Button>
                       <Button onClick={() => onApproveDateChange(task.id)} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4" /> 核准變更</Button>
                    </div>
                 </div>
               );
             })}

             {/* Delete Requests */}
             {pendingDeleteTasks.map((task: Task) => {
               const req = task.pendingDelete!;
               const requester = users.find((u: User) => u.id === req.requesterId)?.name || 'Unknown';
               
               return (
                 <div key={`delete-${task.id}`} className="p-4 border border-red-200 bg-red-50 rounded-lg animate-in fade-in">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-slate-800">{task.title}</h4>
                       <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> 刪除申請
                       </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-3 space-y-1">
                       <p>申請人: <span className="font-medium text-slate-800">{requester}</span></p>
                       <p className="text-xs text-slate-500">申請時間: {new Date(req.requestedAt).toLocaleString()}</p>
                       <div className="mt-2 p-2 bg-white rounded border border-red-100 text-slate-500 italic">
                          "{task.description || '無任務描述'}"
                       </div>
                    </div>
                    <div className="flex justify-end gap-2">
                       <Button variant="secondary" onClick={() => onRejectDelete(task.id)} className="text-slate-600 hover:bg-slate-200">
                          <X className="w-4 h-4" /> 駁回 (保留任務)
                       </Button>
                       <Button onClick={() => onApproveDelete(task.id)} className="bg-red-600 hover:bg-red-700 text-white shadow-red-200">
                          <Trash2 className="w-4 h-4" /> 核准刪除
                       </Button>
                    </div>
                 </div>
               );
             })}
           </>
         ) : (
           <div className="text-center py-12 text-slate-400">
             <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
             <p>目前沒有待簽核的項目</p>
           </div>
         )}
      </div>
    </Modal>
  );
};

export const VerificationCompletionModal = ({ isOpen, onClose, onConfirm, taskTitle }: { isOpen: boolean; onClose: () => void; onConfirm: (count: number, achieved: number) => void; taskTitle: string }) => {
  const [count, setCount] = useState(0);
  const [achieved, setAchieved] = useState(0);

  useEffect(() => {
    if (isOpen) {
        setCount(0);
        setAchieved(0);
    }
  }, [isOpen]);

  const rate = count > 0 ? Math.round((achieved / count) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(count, achieved);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="試模/驗證結果回報" zIndex="z-[70]">
       <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="text-xs text-slate-500 mb-1">正在結案任務</div>
             <div className="font-bold text-slate-800">{taskTitle}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">DV 項目總數</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  className="w-full p-2 border rounded-lg text-center font-mono text-lg"
                  value={count || ''}
                  onChange={e => setCount(Number(e.target.value))}
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">DV 達成項目數</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  max={count}
                  className="w-full p-2 border rounded-lg text-center font-mono text-lg"
                  value={achieved || ''}
                  onChange={e => setAchieved(Number(e.target.value))}
                />
             </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl flex items-center justify-between border border-indigo-100">
             <div className="flex items-center gap-2 text-indigo-800">
                <Microscope className="w-5 h-5" />
                <span className="font-bold">設計成功率</span>
             </div>
             <div className="text-3xl font-black text-indigo-600">
                {rate}<span className="text-lg">%</span>
             </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
             <Button variant="secondary" onClick={onClose}>暫不結案</Button>
             <Button type="submit" disabled={count <= 0 || achieved > count}>確認結案並儲存</Button>
          </div>
       </form>
    </Modal>
  );
};

export const ReportModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  users, 
  tasks,
  categories = [] 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentUser: User; 
  users: User[]; 
  tasks: Task[]; 
  categories?: Category[];
}) => {
  const [reportType, setReportType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SCHEDULE_ACHIEVEMENT' | 'DESIGN_ACHIEVEMENT' | 'DESIGN_CHANGE_ACHIEVEMENT' | 'CUSTOM_REPORT'>('DAILY');
  const [targetUserId, setTargetUserId] = useState(currentUser.id); 
  const [targetCategoryId, setTargetCategoryId] = useState('ALL'); 
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Custom Report State
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['partNumber', 'title', 'status', 'userId', 'deadline', 'actualHours']);

  useEffect(() => {
    if (isOpen) {
      setTargetUserId(currentUser.id);
      setSelectedDate(new Date());
      setTargetCategoryId('ALL');
      // Reset Custom Date Range to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setCustomStartDate(toLocalISOString(firstDay));
      setCustomEndDate(toLocalISOString(lastDay));
    }
  }, [isOpen, currentUser.id]);

  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    if (reportType === 'CUSTOM_REPORT') {
        const cs = parseDateLocal(customStartDate);
        const ce = parseDateLocal(customEndDate);
        cs.setHours(0,0,0,0);
        ce.setHours(23,59,59,999);
        return { start: cs, end: ce };
    } else if (reportType === 'DAILY') {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (reportType === 'WEEKLY') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      start.setHours(0,0,0,0);
      
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
    } else if (reportType === 'MONTHLY' || reportType === 'SCHEDULE_ACHIEVEMENT' || reportType === 'DESIGN_ACHIEVEMENT' || reportType === 'DESIGN_CHANGE_ACHIEVEMENT') {
      start.setDate(1);
      start.setHours(0,0,0,0);
      
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23,59,59,999);
    }
    return { start, end };
  }, [reportType, selectedDate, customStartDate, customEndDate]);

  const reportData = useMemo(() => {
    let usersToProcess: User[] = [];
    if (targetUserId === 'ALL') {
       if (reportType === 'DESIGN_ACHIEVEMENT' || reportType === 'SCHEDULE_ACHIEVEMENT' || reportType === 'DESIGN_CHANGE_ACHIEVEMENT' || reportType === 'CUSTOM_REPORT') {
          usersToProcess = users;
       } else {
          usersToProcess = users.filter(u => u.role !== 'ADMIN');
       }
    } else {
      const u = users.find(u => u.id === targetUserId);
      if (u) usersToProcess = [u];
    }

    const results = usersToProcess.map(targetUser => {
        const groupedData = new Map<string, { 
          task: Task, 
          logs: TaskLog[], 
          totalHours: number,
          completedInPeriod: boolean 
        }>();
        
        let userTotalHours = 0;

        tasks.forEach(task => {
          if (task.userId === targetUser.id) {
            
            if (reportType === 'CUSTOM_REPORT') {
                 if (targetCategoryId !== 'ALL' && task.categoryId !== targetCategoryId) return;

                 const deadline = parseDateLocal(task.deadline);
                 const received = parseDateLocal(task.receiveDate);
                 const completed = task.completedDate ? parseDateLocal(task.completedDate) : null;
                 
                 const inRange = (d: Date) => d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime();
                 
                 let include = false;
                 if (inRange(deadline)) include = true;
                 if (inRange(received)) include = true;
                 if (completed && inRange(completed)) include = true;

                 if (include) {
                    if (!groupedData.has(task.id)) {
                        groupedData.set(task.id, { task, logs: [], totalHours: 0, completedInPeriod: false });
                    }
                 }
                 return;
            }

            if (reportType === 'DESIGN_CHANGE_ACHIEVEMENT') {
              const taskCat = categories.find(c => c.id === task.categoryId);
              if (taskCat && taskCat.name.includes('設計變更')) {
                  const dateToCheckStr = task.completedDate || task.deadline;
                  const dateToCheck = parseDateLocal(dateToCheckStr);
                  
                  if (dateToCheck.getTime() >= dateRange.start.getTime() && 
                      dateToCheck.getTime() <= dateRange.end.getTime()) {
                      
                      if (!groupedData.has(task.id)) {
                          groupedData.set(task.id, { task, logs: [], totalHours: 0, completedInPeriod: false });
                      }
                  }
              }
              return;
            }

            if (reportType === 'DESIGN_ACHIEVEMENT') {
               const taskCat = categories.find(c => c.id === task.categoryId);
               if (taskCat) {
                   const name = taskCat.name.toLowerCase();
                   const isTestReport = name.includes('試模') || name.includes('測試') || name.includes('驗證') || name.includes('test');
                   
                   if (isTestReport) {
                      const dateToCheckStr = task.completedDate || task.deadline;
                      const dateToCheck = parseDateLocal(dateToCheckStr);
                      
                      if (dateToCheck.getTime() >= dateRange.start.getTime() && 
                          dateToCheck.getTime() <= dateRange.end.getTime()) {
                          
                          if (!groupedData.has(task.id)) {
                              groupedData.set(task.id, { task, logs: [], totalHours: 0, completedInPeriod: false });
                          }
                      }
                   }
               }
               return;
            }

            if (reportType === 'SCHEDULE_ACHIEVEMENT') {
                 if (targetCategoryId !== 'ALL' && task.categoryId !== targetCategoryId) {
                     return;
                 }

                 const deadlineDate = parseDateLocal(task.deadline);
                 if (deadlineDate.getTime() >= dateRange.start.getTime() && 
                     deadlineDate.getTime() <= dateRange.end.getTime()) {
                     
                     if (!groupedData.has(task.id)) {
                        groupedData.set(task.id, { task, logs: [], totalHours: 0, completedInPeriod: false });
                     }
                 }
                 return;
            }

            const relevantLogs = task.logs.filter(log => {
              const logDate = parseDateLocal(log.date);
              return logDate.getTime() >= dateRange.start.getTime() && 
                     logDate.getTime() <= dateRange.end.getTime();
            });

            let completedInPeriod = false;
            if (task.status === 'DONE' && task.completedDate) {
              const compDate = parseDateLocal(task.completedDate);
              if (compDate.getTime() >= dateRange.start.getTime() && 
                  compDate.getTime() <= dateRange.end.getTime()) {
                completedInPeriod = true;
              }
            }

            if (relevantLogs.length > 0 || completedInPeriod) {
               if (!groupedData.has(task.id)) {
                 groupedData.set(task.id, { 
                   task, 
                   logs: [], 
                   totalHours: 0,
                   completedInPeriod: false
                 });
               }
               const entry = groupedData.get(task.id)!;
               
               entry.logs.push(...relevantLogs);
               entry.totalHours += relevantLogs.reduce((acc, l) => acc + l.hoursSpent, 0);
               if (completedInPeriod) entry.completedInPeriod = true;

               userTotalHours += relevantLogs.reduce((acc, l) => acc + l.hoursSpent, 0);
            }
          }
        });

        return {
          user: targetUser,
          entries: Array.from(groupedData.values()),
          userTotalHours
        };
    }); 

    const grandTotalTeamHours = results.reduce((acc, curr) => acc + curr.userTotalHours, 0);

    return {
      results,
      grandTotalTeamHours,
      range: dateRange,
      isTeamReport: targetUserId === 'ALL'
    };
  }, [tasks, targetUserId, dateRange, users, reportType, targetCategoryId, categories]);

  const getTaskPerformance = (task: Task) => {
      const deadline = parseDateLocal(task.deadline);
      
      if (task.status === 'DONE' && task.completedDate) {
        const completed = parseDateLocal(task.completedDate);
        if (completed.getTime() < deadline.getTime()) return '提早完成';
        if (completed.getTime() === deadline.getTime()) return '準時完成';
        return '逾期結案';
      } else {
         const today = new Date();
         today.setHours(0,0,0,0);
         if (today.getTime() > deadline.getTime()) return '逾期未完';
         return '進行中';
      }
  };

  // Helper to unify data formatting (Fixes architecture fragility)
  const getTaskFieldDisplay = (t: any, key: string) => {
      if (key === 'categoryId') return categories.find(c => c.id === t.categoryId)?.name || '未分類';
      if (key === 'userId') return users.find(u => u.id === t.userId)?.name || 'Unknown';
      if (key === 'status') return getStatusLabel(t.status);
      if (key === 'phase') return getPhaseLabel(t.phase);
      if (key === 'dvStats') return (t.dvCount !== undefined) ? `${t.dvCount}/${t.dvAchieved||0}` : '-';
      
      const val = t[key];
      // Special handling for numbers to avoid 0 becoming '-'
      if (key === 'estimatedHours' || key === 'actualHours') {
         return (val !== undefined && val !== null) ? String(val) : '0';
      }
      if (val === 0) return '0';
      return val ? String(val) : '-';
  };

  const reportText = useMemo(() => {
    if (!reportData) return '';
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const rangeStr = `${formatDate(reportData.range.start)} ~ ${formatDate(reportData.range.end)}`;

    if (reportType === 'CUSTOM_REPORT') {
      let text = `📅 【自訂報表清單】\n`;
      text += `🕒 統計區間：${rangeStr}\n`;
      const catName = targetCategoryId === 'ALL' ? '全部類別' : categories.find(c => c.id === targetCategoryId)?.name;
      text += `📂 篩選類別：${catName}\n`;
      
      const activeColumns = CUSTOM_REPORT_COLUMNS.filter(col => selectedColumns.includes(col.key));
      const headerRow = activeColumns.map(c => c.label.padEnd(12)).join(" | ");
      const divider = activeColumns.map(() => "------------").join("-+-");

      text += `${divider}\n`;
      text += `${headerRow}\n`;
      text += `${divider}\n`;

      let hasData = false;
      reportData.results.forEach(userData => {
        userData.entries.forEach(entry => {
            const t: any = entry.task; 
            const rowData = activeColumns.map(col => {
                let val = getTaskFieldDisplay(t, col.key);
                
                // Format for Preview (Compact)
                if (col.key === 'phase') val = val.split(' ')[0];
                
                return String(val).replace(/\n/g, ' ').substring(0, 15).padEnd(12);
            });
            text += `${rowData.join(" | ")}\n`;
            hasData = true;
        });
      });
      if (!hasData) text += `(此區間無任務資料)\n`;
      return text;
    }
    
    if (reportType === 'DESIGN_CHANGE_ACHIEVEMENT') {
      let text = `📅 【設計變更成功率報表】\n`;
      text += `🕒 統計區間：${rangeStr}\n`;
      text += `------------------------------------------------------------------------------------------------------------------------------------------------\n`;
      text += `品號          | 任務類別       | 負責人   | 變更單號    | 變更分類        | 變更分析        | 任務描述          | 變更次數 | 預計完成 | 實際完成 | 修改判定\n`;
      text += `------------------------------------------------------------------------------------------------------------------------------------------------\n`;

      let hasData = false;
      reportData.results.forEach(userData => {
        userData.entries.forEach(entry => {
          const t = entry.task;
          const categoryName = categories.find(c => c.id === t.categoryId)?.name || '未分類';
          const ownerName = users.find(u => u.id === t.userId)?.name || 'Unknown';
          const pn = t.partNumber || '-';
          const orderNo = t.changeOrderNumber || '-';
          const changeCat = t.changeCategory || '-';
          const changeAnl = t.changeAnalysis || '-';
          const desc = t.description ? t.description.replace(/\n/g, ' ') : '-';
          const count = t.changeCount || 0;
          const estDate = t.deadline || '-';
          const actDate = t.completedDate || '-';

          text += `${pn.padEnd(13)} | ${categoryName.substring(0,8).padEnd(10)} | ${ownerName.padEnd(8)} | ${orderNo.padEnd(10)} | ${changeCat.padEnd(12)} | ${changeAnl.padEnd(12)} | ${desc.substring(0, 15).padEnd(17)} | ${count.toString().padEnd(8)} | ${estDate} | ${actDate} | ${(t.designChangeResult || '-').padEnd(6)}\n`;
          hasData = true;
        });
      });

      if (!hasData) text += `(此區間無相關設計變更任務)\n`;
      return text;
    }

    if (reportType === 'DESIGN_ACHIEVEMENT') {
      let text = `📅 【設計成功率報表】\n`;
      text += `🕒 統計區間：${rangeStr}\n`;
      text += `--------------------------------------------------------------------------------------------------------\n`;
      text += `品號          | 任務標題             | 任務類別       | 負責人   | DV項目數 | DV達成項目數 | 設計成功率\n`;
      text += `--------------------------------------------------------------------------------------------------------\n`;
      
      let hasData = false;
      reportData.results.forEach(userData => {
          userData.entries.forEach(entry => {
             const t = entry.task;
             const categoryName = categories.find(c => c.id === t.categoryId)?.name || '未分類';
             const ownerName = users.find(u => u.id === t.userId)?.name || 'Unknown';
             const dvTotal = t.dvCount || 0;
             const dvDone = t.dvAchieved || 0;
             const rate = dvTotal > 0 ? Math.round((dvDone / dvTotal) * 100) : 0;
             const pn = t.partNumber || 'N/A';
             const title = t.title.substring(0, 15);
             
             text += `${pn.padEnd(13)} | ${title.padEnd(20)} | ${categoryName.substring(0,8).padEnd(10)}... | ${ownerName.padEnd(8)} | ${dvTotal.toString().padEnd(6)} | ${dvDone.toString().padEnd(6)} | ${rate}%\n`;
             hasData = true;
          });
      });
      
      if (!hasData) text += `(此區間無相關試模檢驗任務)\n`;
      return text;
    }

    if (reportType === 'SCHEDULE_ACHIEVEMENT') {
        let text = `📅 【日程達成率報表】\n`;
        text += `🕒 統計區間：${rangeStr}\n`;
        
        const catName = targetCategoryId === 'ALL' ? '全部類別' : categories.find(c => c.id === targetCategoryId)?.name;
        text += `📂 篩選類別：${catName}\n`;
        
        let totalTasks = 0;
        let onTimeTasks = 0;
        let lines: string[] = [];

        reportData.results.forEach(userData => {
            userData.entries.forEach(entry => {
                const t = entry.task;
                const categoryName = categories.find(c => c.id === t.categoryId)?.name || '未分類';
                const ownerName = users.find(u => u.id === t.userId)?.name || 'Unknown';
                const actualDate = t.completedDate || '(未完成)';
                
                totalTasks++;
                const perf = getTaskPerformance(t);
                if (perf === '提早完成' || perf === '準時完成') {
                    onTimeTasks++;
                }

                const pn = t.partNumber || 'N/A';
                lines.push(`• ${pn.padEnd(12)} | ${categoryName.substring(0,8)}... | ${ownerName} | 預: ${t.deadline} | 實: ${actualDate} | 預時: ${t.estimatedHours} | 實時: ${t.actualHours} (${perf})`);
            });
        });

        const rate = totalTasks > 0 ? Math.round((onTimeTasks / totalTasks) * 100) : 0;
        
        text += `📊 總計任務: ${totalTasks} | 準時達成: ${onTimeTasks} | 達成率: ${rate}%\n`;
        text += `--------------------------------------------------\n`;
        text += `格式: 品號 | 任務類別 | 負責人 | 預計完成 | 實際完成 | 預計工時 | 實際工時\n`;
        text += `--------------------------------------------------\n`;
        
        if (lines.length > 0) {
            text += lines.join('\n');
        } else {
            text += `(此區間無應完成之任務)\n`;
        }
        return text;
    }

    let title = '';
    if (reportType === 'DAILY') title = '工作日報';
    if (reportType === 'WEEKLY') title = '工作週報';
    if (reportType === 'MONTHLY') title = '工作月報';

    let text = `📅 【${title}】\n`;
    
    if (reportData.isTeamReport) {
      text += `👥 團隊彙整 (All Members)\n`;
      text += `🕒 區間：${rangeStr}\n`;
      text += `📊 團隊總工時：${reportData.grandTotalTeamHours}h\n`;
      text += `--------------------------------------------------\n`;
      
      reportData.results.forEach(res => {
         const userName = res.user.name;
         text += `👤 ${userName} (工時: ${res.userTotalHours}h)\n`;
         res.entries.forEach(entry => {
             const t = entry.task;
             const logHours = entry.logs.reduce((acc, l) => acc + l.hoursSpent, 0);
             text += `   • ${t.title} [${logHours}h] - ${t.status === 'DONE' ? '已完成' : '進行中'}\n`;
             entry.logs.forEach(l => {
                text += `     - ${l.content} (${l.hoursSpent}h)\n`;
             });
         });
         text += `\n`;
      });
    } else {
      const userData = reportData.results[0];
      if (userData) {
         text += `👤 ${userData.user.name} (${userData.user.employeeId})\n`;
         text += `🕒 區間：${rangeStr}\n`;
         text += `📊 總工時：${userData.userTotalHours}h\n`;
         text += `--------------------------------------------------\n`;
         
         if (userData.entries.length === 0) {
            text += `(此區間無工時紀錄)\n`;
         }

         userData.entries.forEach(entry => {
             const t = entry.task;
             const logHours = entry.logs.reduce((acc, l) => acc + l.hoursSpent, 0);
             text += `📌 ${t.title} (投入: ${logHours}h)\n`;
             if (t.partNumber) text += `   品號: ${t.partNumber}\n`;
             text += `   狀態: ${getStatusLabel(t.status)}\n`;
             
             entry.logs.forEach(l => {
                text += `   - ${l.date}: ${l.content} (${l.hoursSpent}h)\n`;
             });
             text += `\n`;
         });
      }
    }
    return text;
  }, [reportData, reportType, targetCategoryId, categories, users, selectedColumns]);

  const handleCopy = () => {
     navigator.clipboard.writeText(reportText);
     alert('報表內容已複製到剪貼簿');
  };

  const downloadExcel = () => {
    try {
        let csvRows = [];
        
        // Add BOM for UTF-8 support in Excel
        const BOM = "\uFEFF"; 
        
        // Helper to escape CSV fields
        const escapeCsv = (str: string | undefined | null) => {
            if (!str) return "";
            let result = String(str).replace(/"/g, '""'); // Escape quotes
            result = result.replace(/\n/g, ' '); // Replace newlines with space to keep row integrity
            if (result.includes(",") || result.includes('"')) {
                result = `"${result}"`;
            }
            return result;
        };

        if (reportType === 'CUSTOM_REPORT') {
            // Headers based on user selection
            const activeColumns = CUSTOM_REPORT_COLUMNS.filter(col => selectedColumns.includes(col.key));
            const headers = activeColumns.map(c => c.label);
            csvRows.push(headers.join(","));

            // Rows
            reportData.results.forEach(userData => {
                userData.entries.forEach(entry => {
                    const t: any = entry.task;
                    const row = activeColumns.map(col => {
                        const val = getTaskFieldDisplay(t, col.key);
                        return escapeCsv(val);
                    });
                    csvRows.push(row.join(","));
                });
            });

        } else if (reportType === 'SCHEDULE_ACHIEVEMENT') {
            const headers = ["品號", "任務標題", "狀態", "負責人", "任務類別", "階段", "接收日", "截止日", "完成日", "預估工時", "實際工時", "優先級", "DV(總/成)", "變更單號"];
            csvRows.push(headers.join(","));

            reportData.results.forEach(userData => {
                userData.entries.forEach(entry => {
                    const t = entry.task;
                    const cat = categories.find(c => c.id === t.categoryId)?.name || '未分類';
                    const owner = users.find(u => u.id === t.userId)?.name || 'Unknown';
                    const dv = (t.dvCount !== undefined) ? `${t.dvCount}/${t.dvAchieved||0}` : '-';
                    
                    csvRows.push([
                        escapeCsv(t.partNumber || '-'),
                        escapeCsv(t.title),
                        escapeCsv(getStatusLabel(t.status)),
                        escapeCsv(owner),
                        escapeCsv(cat),
                        escapeCsv(getPhaseLabel(t.phase)),
                        escapeCsv(t.receiveDate),
                        escapeCsv(t.deadline),
                        escapeCsv(t.completedDate || '-'),
                        t.estimatedHours,
                        t.actualHours,
                        t.priority,
                        escapeCsv(dv),
                        escapeCsv(t.changeOrderNumber || '-')
                    ].join(","));
                });
            });
        } else if (reportType === 'DESIGN_CHANGE_ACHIEVEMENT') {
            const headers = ["品號", "任務類別", "負責人", "變更單號", "變更分類", "變更分析", "任務描述", "變更次數", "預計完成", "實際完成", "修改判定"];
            csvRows.push(headers.join(","));

            reportData.results.forEach(userData => {
                userData.entries.forEach(entry => {
                    const t = entry.task;
                    const cat = categories.find(c => c.id === t.categoryId)?.name || '未分類';
                    const owner = users.find(u => u.id === t.userId)?.name || 'Unknown';
                    
                    csvRows.push([
                        escapeCsv(t.partNumber || '-'),
                        escapeCsv(cat),
                        escapeCsv(owner),
                        escapeCsv(t.changeOrderNumber || '-'),
                        escapeCsv(t.changeCategory || '-'),
                        escapeCsv(t.changeAnalysis || '-'),
                        escapeCsv(t.description || '-'),
                        t.changeCount || 0,
                        escapeCsv(t.deadline),
                        escapeCsv(t.completedDate || '-'),
                        escapeCsv(t.designChangeResult || '-')
                    ].join(","));
                });
            });
        } else if (reportType === 'DESIGN_ACHIEVEMENT') {
            const headers = ["品號", "任務標題", "任務類別", "負責人", "DV項目數", "DV達成項目數", "設計成功率"];
            csvRows.push(headers.join(","));

            reportData.results.forEach(userData => {
                userData.entries.forEach(entry => {
                    const t = entry.task;
                    const cat = categories.find(c => c.id === t.categoryId)?.name || '未分類';
                    const owner = users.find(u => u.id === t.userId)?.name || 'Unknown';
                    const dvTotal = t.dvCount || 0;
                    const dvDone = t.dvAchieved || 0;
                    const rate = dvTotal > 0 ? Math.round((dvDone / dvTotal) * 100) : 0;
                    
                    csvRows.push([
                        escapeCsv(t.partNumber || '-'),
                        escapeCsv(t.title),
                        escapeCsv(cat),
                        escapeCsv(owner),
                        dvTotal,
                        dvDone,
                        `${rate}%`
                    ].join(","));
                });
            });
        } else if (['DAILY', 'WEEKLY', 'MONTHLY'].includes(reportType)) {
            const headers = ["日期", "姓名", "任務標題", "專案品號", "狀態", "工作內容", "投入工時"];
            csvRows.push(headers.join(","));

            reportData.results.forEach(userData => {
                userData.entries.forEach(entry => {
                    const t = entry.task;
                    // Log entries
                    entry.logs.forEach(log => {
                         csvRows.push([
                             escapeCsv(log.date),
                             escapeCsv(userData.user.name),
                             escapeCsv(t.title),
                             escapeCsv(t.partNumber || '-'),
                             escapeCsv(getStatusLabel(t.status)),
                             escapeCsv(log.content),
                             log.hoursSpent
                         ].join(","));
                    });
                    
                    // Also include tasks completed in this period even if no logs
                    if (entry.completedInPeriod && entry.logs.length === 0) {
                         csvRows.push([
                             escapeCsv(t.completedDate || '-'),
                             escapeCsv(userData.user.name),
                             escapeCsv(t.title),
                             escapeCsv(t.partNumber || '-'),
                             escapeCsv(getStatusLabel(t.status)),
                             escapeCsv("本區間結案 (無詳細工時日誌)"),
                             0
                         ].join(","));
                    }
                });
            });
        }
        
        // Add BOM for UTF-8 support in Excel
        const csvContent = BOM + csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `report_${reportType}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error(err);
        alert("匯出 CSV 失敗");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="工時與績效報表匯出" maxWidth="max-w-4xl">
       <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
             {/* Report Type Buttons */}
             <button onClick={() => setReportType('DAILY')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'DAILY' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200'}`}>工作日報</button>
             <button onClick={() => setReportType('WEEKLY')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'WEEKLY' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200'}`}>工作週報</button>
             <button onClick={() => setReportType('MONTHLY')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'MONTHLY' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200'}`}>工作月報</button>
             <div className="w-px h-6 bg-slate-300 mx-1"></div>
             <button onClick={() => setReportType('SCHEDULE_ACHIEVEMENT')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'SCHEDULE_ACHIEVEMENT' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200'}`}>日程達成率</button>
             <button onClick={() => setReportType('DESIGN_ACHIEVEMENT')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'DESIGN_ACHIEVEMENT' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200'}`}>設計成功率</button>
             <button onClick={() => setReportType('DESIGN_CHANGE_ACHIEVEMENT')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'DESIGN_CHANGE_ACHIEVEMENT' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200'}`}>設計變更</button>
             <button onClick={() => setReportType('CUSTOM_REPORT')} className={`px-3 py-1.5 rounded-lg text-sm border ${reportType === 'CUSTOM_REPORT' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'border-slate-200'}`}>自訂清單</button>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-wrap gap-4 items-end">
             <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">人員篩選</label>
                <select className="p-2 border rounded-lg text-sm min-w-[150px]" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}>
                   <option value="ALL">全體人員</option>
                   {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
             </div>

             {reportType === 'CUSTOM_REPORT' ? (
                <>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">起始日期</label>
                      <input type="date" className="p-2 border rounded-lg text-sm" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">結束日期</label>
                      <input type="date" className="p-2 border rounded-lg text-sm" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                   </div>
                </>
             ) : (
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">基準日期</label>
                   <input type="date" className="p-2 border rounded-lg text-sm" value={selectedDate.toISOString().split('T')[0]} onChange={e => setSelectedDate(new Date(e.target.value))} />
                </div>
             )}

             {(['SCHEDULE_ACHIEVEMENT', 'CUSTOM_REPORT'].includes(reportType)) && (
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">任務類別</label>
                   <select className="p-2 border rounded-lg text-sm min-w-[150px]" value={targetCategoryId} onChange={e => setTargetCategoryId(e.target.value)}>
                      <option value="ALL">全部類別</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
             )}

             {reportType === 'CUSTOM_REPORT' && (
                <div className="w-full mt-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">顯示欄位</label>
                    <div className="flex flex-wrap gap-2">
                        {CUSTOM_REPORT_COLUMNS.map(col => (
                           <button
                             key={col.key}
                             onClick={() => {
                                if (selectedColumns.includes(col.key)) {
                                   setSelectedColumns(selectedColumns.filter(k => k !== col.key));
                                } else {
                                   setSelectedColumns([...selectedColumns, col.key]);
                                }
                             }}
                             className={`px-2 py-1 text-xs rounded border ${selectedColumns.includes(col.key) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                           >
                              {col.label}
                           </button>
                        ))}
                    </div>
                </div>
             )}
          </div>

          <div>
             <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-slate-700">報表預覽</label>
                <div className="flex gap-2">
                   <Button variant="secondary" onClick={handleCopy} className="h-8 text-xs">
                      <Copy className="w-3 h-3" /> 複製內容
                   </Button>
                   <Button onClick={downloadExcel} className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                      <FileSpreadsheet className="w-3 h-3" /> 下載 CSV
                   </Button>
                </div>
             </div>
             <textarea 
               readOnly 
               className="w-full h-96 p-4 border rounded-lg font-mono text-xs bg-slate-50 leading-relaxed whitespace-pre"
               value={reportText}
             />
          </div>
       </div>
    </Modal>
  );
};