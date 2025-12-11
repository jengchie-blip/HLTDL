import * as firebaseApp from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  Firestore, 
  writeBatch 
} from 'firebase/firestore';
import { FirebaseConfig, User, Task, Category } from '../types';

// Use 'any' for app to avoid type import issues with FirebaseApp if types are missing/mismatched
let app: any | undefined;
let db: Firestore | undefined;

// Helper to sanitize data (remove undefined values which Firestore does not support)
const sanitizeData = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  
  const clean = { ...data };
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  });
  return clean;
};

export const firebaseService = {
  init: (config: FirebaseConfig) => {
    try {
      if (!app) {
        // Handle both named export (v9 modular) and default export (compat/v8) patterns
        const init = firebaseApp.initializeApp || (firebaseApp as any).default?.initializeApp;
        if (init) {
             app = init(config);
             db = getFirestore(app);
        } else {
             console.error("Firebase initializeApp not found");
             return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Firebase Initialization Error:", error);
      return false;
    }
  },

  isInitialized: () => !!db,

  // --- Real-time Subscriptions ---

  subscribe: (collectionName: string, onData: (data: any[]) => void, onError?: (error: any) => void) => {
    if (!db) return () => {};
    const colRef = collection(db, collectionName);
    return onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      onData(data);
    }, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
      if (onError) onError(error);
    });
  },

  subscribeDoc: (collectionName: string, docId: string, onData: (data: any) => void, onError?: (error: any) => void) => {
    if (!db) return () => {};
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data());
      } else {
        onData(null);
      }
    }, (error) => {
      console.error(`Error subscribing to doc ${collectionName}/${docId}:`, error);
      if (onError) onError(error);
    });
  },

  // --- CRUD Operations ---

  add: async (collectionName: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    await setDoc(doc(db, collectionName, data.id), sanitizeData(data));
  },

  update: async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    await updateDoc(doc(db, collectionName, id), sanitizeData(data));
  },

  delete: async (collectionName: string, id: string) => {
    if (!db) throw new Error("Database not initialized");
    await deleteDoc(doc(db, collectionName, id));
  },

  // --- Special Handlers ---

  // Project Owners are stored as a single map document in 'settings/project_owners'
  updateProjectOwner: async (partNumber: string, userId: string) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, 'settings', 'project_owners');
    await setDoc(docRef, { [partNumber]: userId }, { merge: true });
  },

  // Batch import for migration
  batchImport: async (users: User[], tasks: Task[], categories: Category[]) => {
    if (!db) throw new Error("Database not initialized");
    
    const batch = writeBatch(db);

    users.forEach(u => {
      const ref = doc(db, 'users', u.id);
      batch.set(ref, sanitizeData(u));
    });

    tasks.forEach(t => {
      const ref = doc(db, 'tasks', t.id);
      batch.set(ref, sanitizeData(t));
    });

    categories.forEach(c => {
      const ref = doc(db, 'categories', c.id);
      batch.set(ref, sanitizeData(c));
    });

    await batch.commit();
  }
};