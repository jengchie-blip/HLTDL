
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Briefcase, ChevronRight, ChevronDown, LogOut, CheckCircle2, LayoutDashboard, Badge, Search, Users, Car, Gauge, Wrench, Tag, Lock, X, FolderOpen, PieChart, User as UserIcon, Calendar, Target, RotateCcw, AlertOctagon, ExternalLink, RefreshCw, Database, Plus } from 'lucide-react';
import { User, Task, TaskLog, Category, ProjectPhase, DateChangeRequest, FirebaseConfig } from './types';
import { INITIAL_USERS, INITIAL_TASKS, INITIAL_CATEGORIES, HARDCODED_FIREBASE_CONFIG } from './constants';
import { generateId, getRandomColor, storage, getPhaseLabel } from './utils';
import { ConfirmModal, Modal, Button, UserAvatar } from './components/Shared';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loading } from './components/Loading';
import { TaskItem, StatisticsModal, TaskModal } from './components/BusinessModals';
import { firebaseService } from './services/firebase';
import { CloudSetup } from './components/CloudSetup';

// Lazy load dashboard components for better performance
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const EngineerDashboard = React.lazy(() => import('./components/EngineerDashboard'));
const CalendarView = React.lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));

const App = () => {
  // --- Cloud State ---
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // --- App Data State (Synced from Firebase) ---
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projectOwners, setProjectOwners] = useState<Record<string, string>>({});

  // --- UI State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // View Control: 'DASHBOARD' | 'TASKS' | 'PROJECT' | 'CALENDAR' | 'PROJECT_LIST'
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'TASKS' | 'PROJECT' | 'CALENDAR' | 'PROJECT_LIST'>('TASKS');
  const [selectedPartNumber, setSelectedPartNumber] = useState<string | null>(null);
  const [expandedProjectPhase, setExpandedProjectPhase] = useState<ProjectPhase | null>(null);

  // Statistics Modal State
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsType, setStatsType] = useState<'SCHEDULE' | 'DESIGN' | 'CHANGE' | 'DESIGN_CHANGE_SUCCESS'>('SCHEDULE');

  const [pendingImportData, setPendingImportData] = useState<{users: User[], tasks: Task[]} | null>(null);

  // Login Screen State
  const [loginSearch, setLoginSearch] = useState('');

  // Password Protection State
  const [requireAdminPassword, setRequireAdminPassword] = useState(() => storage.get<boolean>('require_admin_password', false));
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Project Search State
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  
  // Task Modal State (for quick add)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

  // --- Initialization & Subscription ---

  // 1. Check if configured (CloudSetup will handle init if config exists)
  useEffect(() => {
    // Priority 1: Check URL Parameters (Share Link from Desktop)
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config'); // Short param name
    
    if (configParam) {
       try {
          const decoded = atob(configParam);
          const parsed = JSON.parse(decoded);
          if (firebaseService.init(parsed)) {
             storage.set('firebase_config', parsed);
             setIsCloudConfigured(true);
             // Clean URL to prevent re-init or visual clutter
             window.history.replaceState({}, document.title, window.location.pathname);
             return;
          }
       } catch (e) {
          console.error("Failed to parse config from URL", e);
       }
    }

    // Priority 2: Check Hardcoded Config (from constants.ts)
    if (HARDCODED_FIREBASE_CONFIG && firebaseService.init(HARDCODED_FIREBASE_CONFIG)) {
        setIsCloudConfigured(true);
        return;
    }

    // Priority 3: Check Environment Variables (Vite)
    try {
        const metaEnv = (import.meta as any).env;
        if (metaEnv && metaEnv.VITE_FIREBASE_API_KEY) {
            const envConfig: FirebaseConfig = {
                apiKey: metaEnv.VITE_FIREBASE_API_KEY,
                authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
                projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
                storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
                appId: metaEnv.VITE_FIREBASE_APP_ID || ''
            };
            
            if (firebaseService.init(envConfig)) {
                setIsCloudConfigured(true);
                return;
            }
        }
    } catch (e) {
        console.warn("Env var check failed", e);
    }

    // Priority 4: Try Local Storage
    const savedConfig = storage.get('firebase_config', null);
    if (savedConfig) {
       if (firebaseService.init(savedConfig)) {
          setIsCloudConfigured(true);
       }
    }
  }, []);

  // 2. Subscribe to Collections once configured
  useEffect(() => {
    if (!isCloudConfigured) return;

    // Loading State
    setIsDataLoaded(false);
    setPermissionError(false);

    const handleAuthError = (err: any) => {
        console.error("Auth/Permission Error:", err);
        const msg = err?.message || '';
        // Robust check for permission errors (code or message)
        if (
            err?.code === 'permission-denied' || 
            msg.includes('permission-denied') || 
            msg.includes('Missing or insufficient permissions')
        ) {
            setPermissionError(true);
        }
    };

    const unsubUsers = firebaseService.subscribe('users', (data) => setUsers(data as User[]), handleAuthError);
    const unsubTasks = firebaseService.subscribe('tasks', (data) => setTasks(data as Task[]), handleAuthError);
    
    // Sort categories by order on fetch
    const unsubCats = firebaseService.subscribe('categories', (data) => {
       const sorted = (data as Category[]).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
       setCategories(sorted);
    }, handleAuthError);
    
    const unsubSettings = firebaseService.subscribeDoc('settings', 'project_owners', (data) => {
       if (data) setProjectOwners(data);
    }, handleAuthError);

    // Small timeout to prevent flicker, usually subscriptions are fast
    setTimeout(() => setIsDataLoaded(true), 500);

    return () => {
      unsubUsers();
      unsubTasks();
      unsubCats();
      unsubSettings();
    };
  }, [isCloudConfigured]);

  // Persist local setting
  useEffect(() => {
    storage.set('require_admin_password', requireAdminPassword);
  }, [requireAdminPassword]);

  // Handle default view on login
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ADMIN') {
        setCurrentView('DASHBOARD');
      } else {
        setCurrentView('TASKS');
      }
    }
  }, [currentUser]);
  
  // Reset expanded phase when switching projects
  useEffect(() => {
    setExpandedProjectPhase(null);
  }, [selectedPartNumber]);

  // Filter Users for Login Screen
  const filteredLoginUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(loginSearch.toLowerCase()) || 
        user.employeeId.toLowerCase().includes(loginSearch.toLowerCase());
      
      return matchesSearch;
    }).sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  }, [users, loginSearch]);
  
  const partNumbers = useMemo(() => {
    if (!currentUser) return [];
    const pns = new Set<string>();
    const visibleTasks = currentUser.role === 'ADMIN' 
      ? tasks 
      : tasks.filter(t => t.userId === currentUser.id);

    visibleTasks.forEach(t => {
      if (t.partNumber) pns.add(t.partNumber);
    });
    return Array.from(pns).sort();
  }, [tasks, currentUser]);

  // --- Handlers ---

  const handleResetConfig = () => {
    storage.remove('firebase_config');
    setIsCloudConfigured(false);
    setPermissionError(false);
    
    // Clear URL params to clean state
    const url = new URL(window.location.href);
    if (url.searchParams.has('config')) {
        url.searchParams.delete('config');
        window.history.replaceState({}, '', url.toString());
    }
  };

  const handleLoginSelect = (user: User) => {
    if (user.role === 'ADMIN' && requireAdminPassword) {
      setPasswordModalUser(user);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setCurrentUser(user);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordModalUser) {
      const correctPassword = passwordModalUser.password || '';
      if (passwordInput === correctPassword) {
        setCurrentUser(passwordModalUser);
        setPasswordModalUser(null);
      } else {
        setPasswordError('密碼錯誤，請重試。');
      }
    }
  };

  const handleAddUser = (userData: Omit<User, 'id' | 'avatarColor'>) => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      avatarColor: getRandomColor()
    };
    firebaseService.add('users', newUser);
  };

  const handleUpdateUser = (id: string, userData: Partial<User>) => {
    firebaseService.update('users', id, userData);
  };

  const handleRemoveUser = (userId: string) => {
    firebaseService.delete('users', userId);
  };

  const handleAddCategory = (name: string, suggestedHours: number, note?: string, icon?: string) => {
    const maxOrder = Math.max(0, ...categories.map(c => c.order ?? 0));
    const newCat: Category = {
      id: generateId(),
      name,
      suggestedHours,
      note,
      icon,
      order: maxOrder + 1
    };
    firebaseService.add('categories', newCat);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    firebaseService.update('categories', id, updates);
  };

  const handleDeleteCategory = (id: string) => {
    firebaseService.delete('categories', id);
  };

  const handleReorderCategories = (newCategories: Category[]) => {
    // 1. Optimistic Update
    setCategories(newCategories);
    
    // 2. Persist order to Firebase
    newCategories.forEach((cat, index) => {
       if (cat.order !== index) {
          firebaseService.update('categories', cat.id, { order: index });
       }
    });
  };

  const handleAddTask = (taskData: any) => {
    if (!currentUser) return;
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      userId: taskData.userId || currentUser.id,
      status: 'TODO',
      logs: [],
      actualHours: 0
    };
    firebaseService.add('tasks', newTask);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    firebaseService.update('tasks', taskId, updates);
  };

  const handleDeleteTask = (taskId: string) => {
    firebaseService.delete('tasks', taskId);
  };

  const handleRequestDeleteTask = (taskId: string, requesterId: string) => {
    firebaseService.update('tasks', taskId, {
      pendingDelete: {
        requesterId,
        requestedAt: new Date().toISOString()
      }
    });
  };

  const handleRejectDeleteTask = (taskId: string) => {
    firebaseService.update('tasks', taskId, { pendingDelete: null });
  };

  const handleTransferTask = (taskId: string, newUserId: string, fromUserId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const sender = users.find(u => u.id === fromUserId);
    const receiver = users.find(u => u.id === newUserId);
    const senderName = sender ? sender.name : 'Unknown';
    const receiverName = receiver ? receiver.name : 'Unknown';

    // Create a system log entry
    const systemLog: TaskLog = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      content: `📝 ${senderName} 轉給 ${receiverName}`,
      hoursSpent: 0
    };

    firebaseService.update('tasks', taskId, {
      userId: newUserId,
      transferredFrom: fromUserId, // This triggers the notification
      logs: [systemLog, ...task.logs] // Prepend log
    });
  };

  const handleDismissAlert = (taskId: string) => {
    firebaseService.update('tasks', taskId, { transferredFrom: null });
  };

  const handleAddLog = (taskId: string, logData: { content: string, hoursSpent: number }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newLog: TaskLog = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      ...logData
    };
    
    const updates: Partial<Task> = {
       actualHours: task.actualHours + logData.hoursSpent,
       logs: [newLog, ...task.logs],
       status: 'IN_PROGRESS'
    };
    
    if (!task.startDate) {
        updates.startDate = new Date().toISOString().split('T')[0];
    }
    
    firebaseService.update('tasks', taskId, updates);
  };

  const handleRequestDateChange = (taskId: string, request: DateChangeRequest) => {
    firebaseService.update('tasks', taskId, { pendingChange: request });
  };

  const handleApproveDateChange = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.pendingChange) {
       firebaseService.update('tasks', taskId, {
          receiveDate: task.pendingChange.newReceiveDate,
          deadline: task.pendingChange.newDeadline,
          pendingChange: null
       });
    }
  };

  const handleRejectDateChange = (taskId: string) => {
    firebaseService.update('tasks', taskId, { pendingChange: null });
  };
  
  const handleUpdateProjectOwner = (partNumber: string, userId: string) => {
     firebaseService.updateProjectOwner(partNumber, userId);
  };

  // --- Export / Import ---
  const handleExportData = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users,
      tasks
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo_list_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.users || !parsed.tasks) {
          alert("錯誤：檔案格式不正確");
          return;
        }
        setPendingImportData({ users: parsed.users, tasks: parsed.tasks });
      } catch (err) {
        alert("錯誤：無法解析檔案");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (pendingImportData) {
       try {
         await firebaseService.batchImport(pendingImportData.users, pendingImportData.tasks, categories);
         alert("資料匯入成功！");
       } catch(e) {
         console.error(e);
         alert("匯入失敗");
       }
       setPendingImportData(null);
    }
  };

  // --- Seed Data Modal (DB Initialization) ---
  const handleSeedData = async () => {
     setIsDataLoaded(false);
     try {
       await firebaseService.batchImport(INITIAL_USERS, INITIAL_TASKS, INITIAL_CATEGORIES);
       alert("初始化成功！請重新整理頁面。");
       window.location.reload();
     } catch (e: any) {
       alert("初始化失敗: " + e.message);
     } finally {
       setIsDataLoaded(true);
     }
  };

  // --- Render ---

  if (!isCloudConfigured) {
     return <CloudSetup onConfigured={() => setIsCloudConfigured(true)} />;
  }

  // Permission Error Modal
  if (permissionError) {
      return (
          <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                  <div className="flex flex-col items-center mb-6">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border-2 border-red-100">
                          <AlertOctagon className="w-8 h-8 text-red-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">資料庫存取被拒 (Permission Denied)</h2>
                      <p className="text-slate-500 text-center mt-2 max-w-lg">
                          Firebase Firestore 拒絕了讀取請求。這通常是因為您的資料庫「安全性規則」設定為鎖定模式。
                      </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm space-y-4">
                      <div>
                          <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                              <Wrench className="w-4 h-4" /> 如何修復 (Fix Instructions)
                          </h3>
                          <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                              <li>前往 <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3"/></a>。</li>
                              <li>點選左側選單的 <strong>Build &gt; Firestore Database</strong>。</li>
                              <li>進入上方的 <strong>Rules (規則)</strong> 分頁。</li>
                              <li>將內容替換為以下「測試模式」規則 (允許所有讀寫)：</li>
                          </ol>
                      </div>

                      <div className="relative">
                         <div className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">firestore.rules</div>
                         <pre className="bg-slate-800 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                         </pre>
                      </div>

                      <p className="text-xs text-slate-400">
                          * 注意：這會讓任何人都能讀寫您的資料庫，僅適用於開發或內部測試環境。
                      </p>
                  </div>

                  <div className="mt-8 flex gap-3 justify-center">
                      <Button onClick={() => window.location.reload()} className="flex-1 max-w-xs justify-center py-3">
                          <RefreshCw className="w-4 h-4" /> 我已修改規則，重新載入
                      </Button>
                      <Button variant="ghost" onClick={handleResetConfig} className="flex-1 max-w-xs justify-center py-3 text-slate-500 hover:bg-slate-100">
                          <LogOut className="w-4 h-4" /> 重設連線設定
                      </Button>
                  </div>
              </div>
          </div>
      );
  }

  // Database Initialization Screen (Empty DB)
  if (isDataLoaded && users.length === 0) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
           <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg text-center animate-in fade-in zoom-in-95">
               <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Database className="w-10 h-10 text-blue-600" />
               </div>
               <h1 className="text-2xl font-bold text-slate-900 mb-2">資料庫已連線</h1>
               <p className="text-slate-500 mb-8">
                   目前資料庫是空的。您可以選擇初始化預設資料，以便立即開始測試。
               </p>
               
               <Button onClick={handleSeedData} className="w-full justify-center py-3 text-lg">
                   <CheckCircle2 className="w-5 h-5" /> 寫入預設測試資料 (Seed Data)
               </Button>
               
               <div className="mt-6 pt-6 border-t border-slate-100">
                   <Button variant="ghost" onClick={handleResetConfig} className="text-slate-400 hover:text-red-500 text-sm">
                       <LogOut className="w-3 h-3 mr-1" /> 中斷連線並重設
                   </Button>
               </div>
           </div>
        </div>
     );
  }

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-sm ring-4 ring-blue-50/50">
              <Car className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">To-Do List</h1>
            <p className="text-slate-500 mt-1">請選擇您的身份登入系統 (Cloud Connected)</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋姓名或工號..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={loginSearch}
                onChange={(e) => setLoginSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {!isDataLoaded ? (
                 <div className="col-span-full py-8"><Loading /></div>
              ) : filteredLoginUsers.length > 0 ? (
                filteredLoginUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleLoginSelect(user)}
                    className="flex items-center p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left relative overflow-hidden"
                  >
                    <UserAvatar user={user} size="md" className="mr-3" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-blue-700 truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Badge className="w-3 h-3 shrink-0" /> {user.employeeId}
                        {user.role === 'ADMIN' && requireAdminPassword && <Lock className="w-3 h-3 text-slate-400 ml-1" />}
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-8 text-slate-400 flex flex-col items-center">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">找不到符合的使用者</p>
                </div>
              )}
            </div>
            
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
               <span>共顯示 {filteredLoginUsers.length} 位成員</span>
            </div>
          </div>
        </div>

        {passwordModalUser && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                       <Lock className="w-5 h-5 text-slate-500" /> 管理員驗證
                    </h3>
                    <button onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-600">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-4">
                       請輸入 <strong>{passwordModalUser.name}</strong> 的登入密碼：
                    </p>
                    <form onSubmit={handlePasswordSubmit}>
                       <input 
                         autoFocus
                         type="password" 
                         className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         placeholder="密碼"
                         value={passwordInput}
                         onChange={e => setPasswordInput(e.target.value)}
                       />
                       {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                       <div className="flex justify-end gap-2 mt-4">
                          <Button variant="secondary" onClick={() => setPasswordModalUser(null)}>取消</Button>
                          <Button type="submit">確認登入</Button>
                       </div>
                    </form>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // Main App
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
        <aside className="bg-white w-full md:w-64 border-b md:border-r border-slate-200 flex-shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900">To-Do List</span>
          </div>
          
          <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</div>
            <button 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'DASHBOARD' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setCurrentView('DASHBOARD')}
            >
              <Gauge className="w-4 h-4" /> 總覽儀表板
            </button>

            <button 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'CALENDAR' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setCurrentView('CALENDAR')}
            >
              <Calendar className="w-4 h-4" /> 行事曆視圖
            </button>
            
            {currentUser.role !== 'ADMIN' && (
              <button 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'TASKS' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setCurrentView('TASKS')}
              >
                <Wrench className="w-4 h-4" /> 我的任務
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
               <>
                 <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">統計監控中心</div>
                 <button 
                    onClick={() => { setStatsType('SCHEDULE'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors group"
                 >
                    <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-500" /> 日程達成率
                 </button>
                 <button 
                    onClick={() => { setStatsType('DESIGN'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors group"
                 >
                    <Target className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> 設計成功率
                 </button>
                 <button 
                    onClick={() => { setStatsType('DESIGN_CHANGE_SUCCESS'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-lg transition-colors group"
                 >
                    <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" /> 設計變更成功率
                 </button>
                 <button 
                    onClick={() => { setStatsType('CHANGE'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-600 rounded-lg transition-colors group"
                 >
                    <RotateCcw className="w-4 h-4 text-slate-400 group-hover:text-orange-500" /> 設計變更原因
                 </button>
               </>
            )}

            {partNumbers.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">專案品號</div>
                
                {currentUser.role === 'ADMIN' ? (
                   <button 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'PROJECT_LIST' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      onClick={() => setCurrentView('PROJECT_LIST')}
                   >
                      <FolderOpen className="w-4 h-4 text-slate-400" /> 
                      <div className="text-left">
                         <div className="font-bold">專案列表總覽</div>
                         <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                            共 {partNumbers.length} 個專案
                         </div>
                      </div>
                   </button>
                ) : (
                  <div className="space-y-1">
                    {partNumbers.map(pn => {
                      const ownerId = projectOwners[pn];
                      const ownerName = users.find(u => u.id === ownerId)?.name || '未指派';

                      return (
                        <div 
                          key={pn}
                          className={`group flex items-center gap-1 px-4 py-2 rounded-lg transition-colors w-full ${currentView === 'PROJECT' && selectedPartNumber === pn ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                            <button
                              className={`flex-1 flex items-start gap-3 text-sm font-medium text-left transition-colors ${currentView === 'PROJECT' && selectedPartNumber === pn ? 'text-blue-700' : 'text-slate-600'}`}
                              onClick={() => {
                                setCurrentView('PROJECT');
                                setSelectedPartNumber(pn);
                              }}
                            >
                              <Tag className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <div className="leading-tight min-w-0">
                                 <div className="font-bold truncate">{pn}</div>
                                 <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">
                                    {ownerName}
                                 </div>
                              </div>
                            </button>
                            
                            <button
                               onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask({ partNumber: pn, userId: currentUser.id } as Task);
                                  setIsTaskModalOpen(true);
                               }}
                               className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                               title={`在 ${pn} 新增任務`}
                            >
                               <Plus className="w-4 h-4" />
                            </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 mt-auto border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <UserAvatar user={currentUser} size="sm" />
              <div className="overflow-hidden">
                <div className="font-bold text-sm text-slate-900 truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-500 truncate">{currentUser.employeeId}</div>
              </div>
            </div>
            <button 
              onClick={() => setCurrentUser(null)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> 登出系統
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            <Suspense fallback={<Loading />}>
              {currentView === 'DASHBOARD' && (
                <div className="p-6 md:p-8 max-w-6xl mx-auto">
                  <AdminDashboard 
                    currentUser={currentUser}
                    users={users} 
                    tasks={tasks}
                    categories={categories}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onRemoveUser={handleRemoveUser}
                    onImportData={handleImportData}
                    onExportData={handleExportData}
                    onTransferTask={handleTransferTask}
                    onDismissAlert={handleDismissAlert}
                    onAddTask={handleAddTask}
                    onAddCategory={handleAddCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onReorderCategories={handleReorderCategories}
                    onApproveDateChange={handleApproveDateChange}
                    onRejectDateChange={handleRejectDateChange}
                    requireAdminPassword={requireAdminPassword}
                    onTogglePasswordRequirement={setRequireAdminPassword}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onRejectDeleteTask={handleRejectDeleteTask}
                    onUpdateProjectOwner={handleUpdateProjectOwner}
                    onShowStats={(type) => { setStatsType(type); setIsStatsModalOpen(true); }}
                  />
                </div>
              )}
              {currentView === 'TASKS' && (
                <div className="p-6 md:p-8 max-w-6xl mx-auto">
                  <EngineerDashboard 
                    user={currentUser} 
                    tasks={tasks} 
                    users={users}
                    categories={categories}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onAddLog={handleAddLog}
                    onDeleteTask={handleDeleteTask}
                    onRequestDeleteTask={handleRequestDeleteTask}
                    onTransferTask={handleTransferTask}
                    onDismissAlert={handleDismissAlert}
                    onRequestDateChange={handleRequestDateChange}
                    onUpdateUser={handleUpdateUser}
                  />
                </div>
              )}
              {currentView === 'CALENDAR' && (
                 <CalendarView 
                   tasks={tasks}
                   users={users}
                   categories={categories}
                   currentUser={currentUser}
                   onAddTask={handleAddTask}
                   onUpdateTask={handleUpdateTask}
                   onRequestDateChange={handleRequestDateChange}
                 />
              )}
              {currentView === 'PROJECT_LIST' && (
                  <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
                      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                              <FolderOpen className="w-8 h-8 text-blue-600" /> 專案品號總覽
                           </h1>
                           <p className="text-slate-500 mt-1">檢視與管理所有進行中的專案</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                           {/* Search Input */}
                           <div className="relative w-full sm:w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                 type="text" 
                                 placeholder="搜尋專案品號或負責人..." 
                                 className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 value={projectSearchTerm}
                                 onChange={e => setProjectSearchTerm(e.target.value)}
                              />
                           </div>
                           <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 font-medium shadow-sm whitespace-nowrap">
                              共 {partNumbers.length} 個專案
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {partNumbers
                            .filter(pn => {
                                const term = projectSearchTerm.toLowerCase();
                                const ownerId = projectOwners[pn];
                                const ownerName = users.find(u => u.id === ownerId)?.name || '';
                                return pn.toLowerCase().includes(term) || ownerName.toLowerCase().includes(term);
                            })
                            .map(pn => {
                              const ownerId = projectOwners[pn];
                              const owner = users.find(u => u.id === ownerId);
                              const projectTasks = tasks.filter(t => t.partNumber === pn);
                              const totalCount = projectTasks.length;
                              const activeCount = projectTasks.filter(t => t.status !== 'DONE').length;
                              const completedCount = projectTasks.filter(t => t.status === 'DONE').length;
                              const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                              
                              // Check for urgent status (Red border if high priority active tasks or overdue)
                              const hasUrgent = projectTasks.some(t => t.status !== 'DONE' && (t.priority === 'HIGH' || new Date(t.deadline) < new Date()));
                              
                              return (
                                  <div 
                                    key={pn}
                                    onClick={() => {
                                        setSelectedPartNumber(pn);
                                        setCurrentView('PROJECT');
                                    }}
                                    className={`bg-white p-5 rounded-xl border transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-lg flex flex-col h-full ${hasUrgent ? 'border-l-4 border-l-red-500 border-y border-r border-slate-200' : 'border-slate-200 hover:border-blue-300'}`}
                                  >
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="font-bold text-lg text-slate-800 group-hover:text-blue-700 break-all">
                                              {pn}
                                          </div>
                                          <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                             <Tag className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                          </div>
                                      </div>
                                      
                                      <div className="mb-4 flex-1">
                                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                              <UserIcon className="w-4 h-4 text-slate-400" />
                                              <span className="font-medium">{owner ? owner.name : '未指派負責人'}</span>
                                          </div>
                                          
                                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                                              <div className="bg-blue-500 h-full rounded-full transition-all" style={{width: `${progress}%`}}></div>
                                          </div>
                                          <div className="flex justify-between text-xs text-slate-500">
                                              <span>進度: {progress}%</span>
                                              <span>{completedCount}/{totalCount}</span>
                                          </div>
                                      </div>

                                      <div className="flex gap-2 text-xs pt-3 border-t border-slate-100 mt-auto">
                                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium flex-1 text-center">進行中: {activeCount}</span>
                                          {hasUrgent && <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-medium flex-1 text-center">需關注</span>}
                                      </div>
                                  </div>
                              )
                          })}
                          
                          {/* Empty State for Search */}
                          {partNumbers.filter(pn => {
                                const term = projectSearchTerm.toLowerCase();
                                const ownerId = projectOwners[pn];
                                const ownerName = users.find(u => u.id === ownerId)?.name || '';
                                return pn.toLowerCase().includes(term) || ownerName.toLowerCase().includes(term);
                            }).length === 0 && projectSearchTerm && (
                                <div className="col-span-full py-12 text-center text-slate-400">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>找不到符合「{projectSearchTerm}」的專案</p>
                                </div>
                            )}
                      </div>
                  </div>
              )}
              {currentView === 'PROJECT' && selectedPartNumber && (
                  <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <Tag className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold text-slate-900">專案品號: {selectedPartNumber}</h1>
                            <p className="text-slate-500">專案階段概況與任務清單</p>
                          </div>
                        </div>

                        <div className="bg-white p-2 pl-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                           <UserIcon className="w-4 h-4 text-slate-400" />
                           <span className="text-xs font-bold text-slate-500">專案負責人:</span>
                           
                           {currentUser.role === 'ADMIN' ? (
                             <select 
                                className="bg-transparent text-sm font-bold text-blue-700 outline-none cursor-pointer hover:bg-slate-50 rounded px-1"
                                value={projectOwners[selectedPartNumber] || ''}
                                onChange={(e) => handleUpdateProjectOwner(selectedPartNumber, e.target.value)}
                             >
                                <option value="">-- 未指派 --</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
                                ))}
                             </select>
                           ) : (
                             <span className="text-sm font-bold text-slate-700 px-1">
                                {users.find(u => u.id === projectOwners[selectedPartNumber])?.name || '未指派'}
                             </span>
                           )}
                        </div>
                      </div>

                      <div className="space-y-4">
                         {(['P1', 'P2', 'P3', 'P4', 'P5'] as ProjectPhase[]).map(phase => {
                            const phaseTasks = tasks.filter(t => t.partNumber === selectedPartNumber && t.phase === phase);
                            const hasTasks = phaseTasks.length > 0;
                            const isExpanded = expandedProjectPhase === phase;
                            
                            const completedCount = phaseTasks.filter(t => t.status === 'DONE').length;
                            const isAllCompleted = hasTasks && completedCount === phaseTasks.length;
                            
                            let cardClass = "bg-white border-slate-200 hover:border-blue-300";
                            let iconClass = "text-slate-400 bg-slate-100";
                            let titleClass = "text-slate-700";

                            if (hasTasks) {
                                if (isAllCompleted) {
                                   cardClass = "bg-emerald-50 border-emerald-200 hover:border-emerald-300";
                                   iconClass = "text-emerald-600 bg-emerald-100";
                                   titleClass = "text-emerald-800 font-bold";
                                } else {
                                   cardClass = "bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md border-y border-r border-slate-200";
                                   iconClass = "text-blue-600 bg-blue-50";
                                   titleClass = "text-blue-700 font-bold";
                                }
                            } else {
                                cardClass = "bg-slate-50 border-slate-100 opacity-70";
                            }

                            return (
                               <div key={phase} className="rounded-xl overflow-hidden transition-all duration-300">
                                   <div 
                                     onClick={() => hasTasks && setExpandedProjectPhase(isExpanded ? null : phase)}
                                     className={`p-4 flex items-center justify-between cursor-pointer border ${cardClass} rounded-xl`}
                                   >
                                      <div className="flex items-center gap-4">
                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
                                            {isAllCompleted ? <CheckCircle2 className="w-5 h-5" /> : <PieChart className="w-5 h-5" />}
                                         </div>
                                         <div>
                                            <h3 className={`text-base ${titleClass}`}>
                                               {getPhaseLabel(phase)}
                                            </h3>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                               {hasTasks 
                                                 ? `${phaseTasks.length} 個任務 (${completedCount} 完成)` 
                                                 : '無任務'}
                                            </div>
                                         </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                          {/* Add Task button inside Phase Card */}
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingTask({ partNumber: selectedPartNumber, phase: phase, userId: currentUser.id } as Task);
                                                  setIsTaskModalOpen(true);
                                              }}
                                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                              title="新增任務至此階段"
                                          >
                                              <Plus className="w-5 h-5" />
                                          </button>

                                          {hasTasks && (
                                            <div className="text-slate-400">
                                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                            </div>
                                          )}
                                          {!hasTasks && <FolderOpen className="w-5 h-5 text-slate-300" />}
                                      </div>
                                   </div>

                                   {isExpanded && hasTasks && (
                                      <div className="mt-2 pl-4 pr-1 pb-2 space-y-2 animate-in slide-in-from-top-2 fade-in duration-300 border-l-2 border-slate-200 ml-6">
                                         {phaseTasks
                                            .sort((a,b) => new Date(b.receiveDate).getTime() - new Date(a.receiveDate).getTime())
                                            .map(task => (
                                              <TaskItem 
                                                key={task.id} 
                                                task={task} 
                                                categories={categories}
                                                showOwner={true}
                                                users={users}
                                              />
                                            ))
                                         }
                                      </div>
                                   )}
                               </div>
                            );
                         })}
                      </div>
                  </div>
              )}
            </Suspense>

            <StatisticsModal
               isOpen={isStatsModalOpen}
               onClose={() => setIsStatsModalOpen(false)}
               initialType={statsType}
               tasks={tasks}
               users={users}
               categories={categories}
            />
            
            <TaskModal 
              isOpen={isTaskModalOpen}
              onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
              onSubmit={(data: any) => handleAddTask(data)}
              editingTask={editingTask}
              categories={categories}
              users={users}
              currentUser={currentUser}
              onRequestDateChange={handleRequestDateChange}
              tasks={tasks} // Pass tasks for workload check
            />
          </div>
        </main>

        <ConfirmModal 
          isOpen={!!pendingImportData}
          onClose={() => setPendingImportData(null)}
          onConfirm={confirmImport}
          title="確認匯入資料"
          message={
            <div className="space-y-2">
              <p>您即將匯入新的資料檔案。這將會：</p>
              <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                <li><strong>覆蓋</strong> 目前系統中所有的成員與任務資料。</li>
                <li>若是從雲端硬碟讀取，這將同步成最新的版本。</li>
              </ul>
              <p className="font-bold text-slate-800 mt-2">請確認您已備份目前的資料，或確定要執行此操作？</p>
            </div>
          }
          confirmText="確認覆蓋匯入"
          isDanger={true}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
