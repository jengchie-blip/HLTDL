export interface TimesheetEntry {
  id: string;
  employeeName: string;
  project: string;
  date: string;
  hours: number;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface SystemStat {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  requestLatency: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum ViewMode {
  TIMESHEET = 'TIMESHEET',
  STATISTICS = 'STATISTICS',
  ASSISTANT = 'ASSISTANT'
}

// --- App Types ---

export type Role = 'ADMIN' | 'ENGINEER' | 'ASSISTANT';

export interface User {
  id: string;
  name: string;
  employeeId: string;
  role: Role;
  avatarColor: string;
  avatarIcon?: string;
  password?: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'PAUSED' | 'REVIEW' | 'DONE';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProjectPhase = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'OTHER';

export interface Category {
  id: string;
  name: string;
  suggestedHours: number;
  note?: string;
  icon?: string;
  order?: number;
}

export interface TaskLog {
  id: string;
  date: string;
  content: string;
  hoursSpent: number;
}

export interface DateChangeRequest {
  newReceiveDate: string;
  newDeadline: string;
  reason: string;
  requesterId: string;
  requestedAt: string;
}

export interface DeleteRequest {
  requesterId: string;
  requestedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  receiveDate: string;
  deadline: string;
  startDate?: string;
  completedDate?: string | null;
  estimatedHours: number;
  actualHours: number;
  status: TaskStatus;
  priority: TaskPriority;
  phase: ProjectPhase;
  categoryId: string;
  partNumber?: string;
  logs: TaskLog[];
  
  // Workflow
  transferredFrom?: string | null;
  pendingChange?: DateChangeRequest | null;
  pendingDelete?: DeleteRequest | null;
  
  // Verification
  dvCount?: number;
  dvAchieved?: number;
  
  // Design Change
  changeOrderNumber?: string;
  changeCount?: number;
  changeCategory?: string;
  changeAnalysis?: string;
  designChangeResult?: 'PASS' | 'NG' | null;
  
  // Proposal
  isCoDev?: boolean;
  hasCompetitor?: boolean;
  designProposalResult?: 'WON' | 'LOST' | null;
  proposalRejectReason?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type PerformanceLevel = 'EXCEEDS' | 'MEETS' | 'NEEDS_IMPROVEMENT' | 'NA';

export interface NotificationItem {
  id: string;
  type: 'APPROVAL_NEEDED' | 'TRANSFER_RECEIVED' | 'OVERDUE' | 'DUE_SOON' | 'REVIEW_NEEDED';
  message: string;
  taskId: string;
  action?: () => void;
  userName?: string;
}