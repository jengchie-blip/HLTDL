



import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertTriangle, Upload, Database, Key } from 'lucide-react';
import { Button, Modal } from './Shared';
import { FirebaseConfig } from '../types';
import { firebaseService } from '../services/firebase';
import { INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_TASKS } from '../constants';
import { storage } from '../utils';

interface CloudSetupProps {
  onConfigured: () => void;
}

export const CloudSetup: React.FC<CloudSetupProps> = ({ onConfigured }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  // Auto-load config if exists in local storage
  useEffect(() => {
    const savedConfig = storage.get<FirebaseConfig | null>('firebase_config', null);
    if (savedConfig) {
      if (firebaseService.init(savedConfig)) {
        onConfigured();
        setIsOpen(false);
      }
    }
  }, [onConfigured]);

  const handleConnect = async () => {
    setError('');
    try {
      let input = configJson.trim();

      // 1. Strip "const firebaseConfig =" or similar variable declarations if user copied full line
      if (input.includes('=')) {
         input = input.substring(input.indexOf('=') + 1).trim();
      }

      // 2. Strip trailing semicolon
      if (input.endsWith(';')) {
         input = input.slice(0, -1).trim();
      }

      // 3. Robust parsing using Function constructor
      // This handles standard JS object syntax (unquoted keys, single quotes, trailing commas)
      // which JSON.parse cannot handle.
      let config: FirebaseConfig;
      try {
         // eslint-disable-next-line no-new-func
         const parse = new Function(`return ${input}`);
         config = parse();
      } catch (syntaxError) {
         // Fallback to strict JSON parse only if JS parse fails (unlikely for valid objects)
         try {
            config = JSON.parse(input);
         } catch (e) {
             console.error(syntaxError);
             throw new Error("無法解析設定檔格式。請確保您複製了包含大括號 {} 的完整物件內容。");
         }
      }

      // 4. Validation
      if (!config || typeof config !== 'object') {
         throw new Error("格式錯誤: 輸入的內容不是有效的物件");
      }
      
      if (!config.apiKey || !config.projectId) {
        throw new Error("設定檔缺漏: 必須包含 apiKey 與 projectId");
      }

      // 5. Initialize
      const success = firebaseService.init(config);
      if (success) {
        storage.set('firebase_config', config);
        onConfigured();
        setIsOpen(false);
      } else {
        setError("連線失敗，請檢查設定檔內容是否正確。");
      }
    } catch (err: any) {
      setError(`解析錯誤: ${err.message}`);
    }
  };

  const handleMigrate = async () => {
    if (!confirm("確定要將本地資料上傳至雲端嗎？這將覆蓋雲端上的任何現有資料。")) return;
    
    setIsMigrating(true);
    try {
      // Get current local data or fallback to defaults
      const users = storage.get('connector_users', INITIAL_USERS);
      const tasks = storage.get('connector_tasks', INITIAL_TASKS);
      const categories = storage.get('connector_categories', INITIAL_CATEGORIES);

      await firebaseService.batchImport(users, tasks, categories);
      alert("資料遷移成功！");
    } catch (e: any) {
      alert("遷移失敗: " + e.message);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center mb-6">
             <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Cloud className="w-8 h-8 text-blue-600" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900">連線至雲端資料庫</h2>
             <p className="text-slate-500 text-center mt-2 max-w-md">
                本應用程式已升級為雲端架構。請輸入您的 Google Firebase 設定以啟用即時同步功能。
             </p>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                   <Key className="w-4 h-4" /> Firebase Configuration Object
                </label>
                <textarea 
                  className="w-full h-40 p-4 border border-slate-200 rounded-xl font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={`{
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  // ... 直接貼上 Firebase 控制台的程式碼即可
}`}
                  value={configJson}
                  onChange={e => setConfigJson(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                   提示：若要在手機上使用，可先在電腦端設定完成後，使用設定選單中的 <strong>「產生手機連線連結」</strong> 功能。
                   <br/>
                   開發人員也可使用 Environment Variables (Vite) 或修改 constants.ts 來寫入設定。
                </p>
             </div>
             
             {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                   <AlertTriangle className="w-4 h-4" /> {error}
                </div>
             )}

             <div className="flex gap-3 pt-4">
                 <Button 
                    className="flex-1 justify-center py-3" 
                    onClick={handleConnect}
                    disabled={!configJson}
                 >
                    <CheckCircle2 className="w-4 h-4" /> 連線並啟用
                 </Button>
             </div>
          </div>
          
          <div className="mt-8 border-t pt-6 text-center">
             <p className="text-sm text-slate-500 mb-4">第一次設定嗎？您可以將現有的本地資料上傳至雲端。</p>
             <Button 
               variant="secondary" 
               onClick={handleMigrate}
               disabled={!firebaseService.isInitialized() || isMigrating}
               className="mx-auto"
             >
                {isMigrating ? '上傳中...' : <><Upload className="w-4 h-4" /> 上傳本地資料至雲端</>}
             </Button>
             {!firebaseService.isInitialized() && <p className="text-xs text-red-300 mt-2">* 請先完成連線設定</p>}
          </div>
       </div>
    </div>
  );
};