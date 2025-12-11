


import { User, Task, Category, FirebaseConfig } from './types';

// 若要將 Firebase 設定直接寫入程式碼 (方便手機端使用)，請填寫下方物件：
// If you want to hardcode Firebase config for mobile access, fill this object:
export const HARDCODED_FIREBASE_CONFIG: FirebaseConfig | null = {
  apiKey: "AIzaSyC6PB77WuAYDpdyj8sd7_UlxGf3wFeRkVo",
  authDomain: "to-do-list-626db.firebaseapp.com",
  projectId: "to-do-list-626db",
  storageBucket: "to-do-list-626db.firebasestorage.app",
  messagingSenderId: "821992173602",
  appId: "1:821992173602:web:4b7d2397affd39ffa59a7b"
};
/* Example:
export const HARDCODED_FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
*/

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: '主管', employeeId: 'ADMIN-001', role: 'ADMIN', avatarColor: 'bg-blue-500', password: '' },
  { id: 'u2', name: 'Alex Chen', employeeId: 'ENG-001', role: 'ENGINEER', avatarColor: 'bg-emerald-500' },
  { id: 'u3', name: 'Sarah Lin', employeeId: 'ENG-002', role: 'ENGINEER', avatarColor: 'bg-purple-500' },
  { id: 'u4', name: 'Mike Wang', employeeId: 'ENG-003', role: 'ENGINEER', avatarColor: 'bg-orange-500' },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: '客戶資訊輸入表', suggestedHours: 1, note: '確認客戶需求規格與聯絡窗口。', icon: 'file-text', order: 0 },
  { id: 'c2', name: '初始特殊特性清單', suggestedHours: 2, note: '列出 KPC/KCC 項目。', icon: 'clipboard', order: 1 },
  { id: 'c3', name: '設計提案', suggestedHours: 8, note: '包含 3D 草圖與結構說明。', icon: 'layers', order: 2 },
  { id: 'c4', name: '估價', suggestedHours: 4, note: '計算 BOM Cost 與 NRE 費用。', icon: 'database', order: 3 },
  { id: 'c5', name: '設計目標計劃表', suggestedHours: 2, note: '設定各階段里程碑日期。', icon: 'gauge', order: 4 },
  { id: 'c6', name: '開發點檢表', suggestedHours: 2, note: '確認各階段產出物是否齊全。', icon: 'clipboard', order: 5 },
  { id: 'c7', name: '特殊特性清單', suggestedHours: 2, note: '更新並凍結特殊特性項目。', icon: 'clipboard', order: 6 },
  { id: 'c8', name: '設計審查', suggestedHours: 2, note: '召集相關部門進行 Design Review。', icon: 'users', order: 7 },
  { id: 'c9', name: '試模檢驗報告', suggestedHours: 8, note: '需附上 CPK 數據與全尺寸量測報告。', icon: 'microscope', order: 8 },
  { id: 'c10', name: '設計變更', suggestedHours: 4, note: '需填寫 ECN 變更單號與分析原因。', icon: 'cog', order: 9 }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    userId: 'u2',
    title: 'Type-C Gen3 設計初稿',
    description: '完成 Pin 腳定義與初步 3D 堆疊，需確認阻抗匹配。',
    receiveDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    estimatedHours: 16,
    actualHours: 4,
    status: 'IN_PROGRESS',
    logs: [
      { id: 'l1', date: new Date().toISOString().split('T')[0], content: '完成 Pin 定義', hoursSpent: 4 }
    ],
    priority: 'HIGH',
    phase: 'P2',
    categoryId: 'c3', // 對應 設計提案
    partNumber: '805-0023-01'
  },
  {
    id: 't2',
    userId: 'u3',
    title: '模具公差分析報告',
    description: '針對上週試模結果進行公差檢討，確認 Cpk 值。',
    receiveDate: new Date().toISOString().split('T')[0],
    deadline: new Date().toISOString().split('T')[0],
    estimatedHours: 4,
    actualHours: 0,
    status: 'TODO',
    logs: [],
    priority: 'MEDIUM',
    phase: 'P3',
    categoryId: 'c9', // 對應 試模檢驗報告
    partNumber: '910-1102-00'
  }
];

export const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 
  'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-cyan-500'
];
