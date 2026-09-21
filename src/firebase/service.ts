import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Firestore,
  writeBatch,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import {
  PortfolioPage,
  PortfolioProject,
  PortfolioService,
  PortfolioSettings,
  ContactMessage,
  CaseStudyItem,
} from '../types';
import {
  DEFAULT_PAGES,
  DEFAULT_PROJECTS,
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  DEFAULT_CASE_STUDIES,
} from '../data/defaultData';
import { StorageEngine } from '../utils/storageEngine';

export interface FirebaseConfigType {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

// Helper with timeout to prevent hung Firestore network calls
async function withTimeout<T>(promise: Promise<T>, ms: number = 2500, fallbackVal: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallbackVal);
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch(() => {
      clearTimeout(timer);
      return fallbackVal;
    }),
    timeoutPromise,
  ]);
}
export function getStoredFirebaseConfig(): FirebaseConfigType | null {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
    };
  }

  try {
    const local = localStorage.getItem('berly_firebase_custom_config');
    if (local) {
      return JSON.parse(local);
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let firebaseStorage: FirebaseStorage | null = null;
let isConnectedToLiveFirebase = false;

export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (config && config.apiKey && config.projectId) {
    try {
      if (!getApps().length) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApp();
      }
      const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId.trim() ? config.firestoreDatabaseId.trim() : '(default)';
      try {
        firestoreDb = getFirestore(firebaseApp, dbId);
      } catch {
        firestoreDb = getFirestore(firebaseApp);
      }
      firebaseAuth = getAuth(firebaseApp);
      firebaseStorage = getStorage(firebaseApp);
      isConnectedToLiveFirebase = true;
      console.log('Firebase initialized successfully with project:', config.projectId);
    } catch (e) {
      console.warn('Firebase initialization error, fallback to local store:', e);
      isConnectedToLiveFirebase = false;
    }
  } else {
    isConnectedToLiveFirebase = false;
  }
}

initFirebase();

export function isFirebaseConfigured(): boolean {
  return isConnectedToLiveFirebase && firestoreDb !== null;
}

// --- Data Service Layer with LocalStorage + Firestore Sync ---

const STORAGE_KEYS = {
  PAGES: 'berly_pages_cache_v1',
  PROJECTS: 'berly_projects_cache_v1',
  SERVICES: 'berly_services_cache_v1',
  CASE_STUDIES: 'berly_casestudies_cache_v1',
  SETTINGS: 'berly_settings_cache_v1',
  MESSAGES: 'berly_messages_cache_v1',
  AUTH_USER: 'berly_demo_auth_user',
  ADMIN_PASSWORD: 'berly_admin_password_v1',
};

export const DataService = {
  // Settings
  async getSettings(): Promise<PortfolioSettings> {
    const local = await StorageEngine.getItem<PortfolioSettings>(STORAGE_KEYS.SETTINGS);
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const snap = await withTimeout(getDocs(collection(firestoreDb, 'settings')), 1200, null as any);
        if (snap && !snap.empty) {
          const docData = snap.docs[0].data() as PortfolioSettings;
          if (local) {
            // Keep local if exists or merge
            await StorageEngine.setItem(STORAGE_KEYS.SETTINGS, { ...docData, ...local });
            return { ...docData, ...local };
          }
          await StorageEngine.setItem(STORAGE_KEYS.SETTINGS, docData);
          return docData;
        }
      } catch (err) {
        console.warn('Firestore settings fetch error:', err);
      }
    }
    return local || DEFAULT_SETTINGS;
  },

  async saveSettings(settings: PortfolioSettings): Promise<void> {
    await StorageEngine.setItem(STORAGE_KEYS.SETTINGS, settings);
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'global'), settings);
      } catch (err) {
        console.warn('Firestore settings sync notice (saved locally in IndexedDB):', err);
      }
    }
  },

  // Pages
  async getPages(): Promise<PortfolioPage[]> {
    const local = await StorageEngine.getItem<PortfolioPage[]>(STORAGE_KEYS.PAGES);
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const q = query(collection(firestoreDb, 'pages'), orderBy('pageOrder', 'asc'));
        const snap = await withTimeout(getDocs(q), 1200, null as any);
        if (snap && !snap.empty) {
          const pages = snap.docs.map((d) => ({ ...d.data(), id: d.id } as PortfolioPage));
          if (local && local.length > 0) {
            const localMap = new Map(local.map((p) => [p.id, p]));
            const merged = pages.map((rp) => {
              const lp = localMap.get(rp.id);
              if (lp && lp.updatedAt && (!rp.updatedAt || new Date(lp.updatedAt).getTime() >= new Date(rp.updatedAt).getTime())) {
                return lp;
              }
              return rp;
            });
            local.forEach((lp) => {
              if (!merged.some((m) => m.id === lp.id)) merged.push(lp);
            });
            merged.sort((a, b) => (a.pageOrder || 0) - (b.pageOrder || 0));
            await StorageEngine.setItem(STORAGE_KEYS.PAGES, merged);
            return merged;
          }
          await StorageEngine.setItem(STORAGE_KEYS.PAGES, pages);
          return pages;
        }
      } catch (err) {
        console.warn('Firestore pages fetch error:', err);
      }
    }

    if (local && local.length > 0) {
      const EXCLUDED_PAGE_TYPES = new Set(['about', 'technology', 'project', 'web-app', 'digitalization', 'creative']);
      const EXCLUDED_KEYWORDS = ['project detail', 'web application', 'digitalization', 'numerology', 'restaurant', 'pos system', 'dashboard & data', 'creative project', 'creative projects'];
      const filtered = local.filter((p) => {
        if (EXCLUDED_PAGE_TYPES.has(p.pageType)) return false;
        const lower = (p.title || '').toLowerCase();
        return !EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw));
      });
      if (filtered.length > 0) return filtered;
    }
    return DEFAULT_PAGES;
  },

  async savePage(page: PortfolioPage): Promise<void> {
    const current = await this.getPages();
    const index = current.findIndex((p) => p.id === page.id);
    const nowIso = new Date().toISOString();
    const normalized: PortfolioPage = {
      ...page,
      pageOrder: Number(page.pageOrder ?? (index >= 0 ? current[index].pageOrder : current.length + 1)),
      updatedAt: nowIso,
      createdAt: page.createdAt || (index >= 0 ? current[index].createdAt : nowIso),
    };
    let updated: PortfolioPage[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = normalized;
    } else {
      updated = [...current, normalized];
    }
    updated.sort((a, b) => (a.pageOrder || 0) - (b.pageOrder || 0));
    await StorageEngine.setItem(STORAGE_KEYS.PAGES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'pages', normalized.id), normalized);
      } catch (err) {
        console.warn('Firestore page write notice (saved locally in IndexedDB):', err);
      }
    }
  },

  async deletePage(pageId: string): Promise<void> {
    const current = await this.getPages();
    const updated = current.filter((p) => p.id !== pageId);
    await StorageEngine.setItem(STORAGE_KEYS.PAGES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'pages', pageId));
      } catch (err) {
        console.warn('Firestore page delete notice:', err);
      }
    }
  },

  // Projects
  async getProjects(): Promise<PortfolioProject[]> {
    const local = await StorageEngine.getItem<PortfolioProject[]>(STORAGE_KEYS.PROJECTS);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const q = query(collection(firestoreDb, 'projects'), orderBy('projectOrder', 'asc'));
        const snap = await withTimeout(getDocs(q), 1200, null as any);
        if (snap && !snap.empty) {
          const projs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as PortfolioProject));
          // Reconcile: Preserve user's local edits (including removed gallery images or edited covers)
          if (local && local.length > 0) {
            const localMap = new Map(local.map((p) => [p.id, p]));
            const merged = projs.map((remoteP) => {
              const locP = localMap.get(remoteP.id);
              // If local project exists, prefer local changes if it has updatedAt or was customized
              if (locP) {
                if (locP.updatedAt && (!remoteP.updatedAt || new Date(locP.updatedAt).getTime() >= new Date(remoteP.updatedAt).getTime())) {
                  return locP;
                }
                // If local gallery was explicitly edited (e.g. emptied or changed)
                if (Array.isArray(locP.gallery)) {
                  return { ...remoteP, ...locP };
                }
              }
              return remoteP;
            });

            local.forEach((locP) => {
              if (!merged.some((m) => m.id === locP.id)) {
                merged.push(locP);
              }
            });

            merged.sort((a, b) => (a.projectOrder || a.order || 0) - (b.projectOrder || b.order || 0));
            await StorageEngine.setItem(STORAGE_KEYS.PROJECTS, merged);
            return merged;
          }

          await StorageEngine.setItem(STORAGE_KEYS.PROJECTS, projs);
          return projs;
        }
      } catch (err) {
        console.warn('Firestore projects fetch error:', err);
      }
    }

    if (local && local.length > 0) {
      return local;
    }

    return DEFAULT_PROJECTS;
  },

  async saveProject(project: PortfolioProject): Promise<void> {
    const current = await this.getProjects();
    const index = current.findIndex((p) => p.id === project.id);
    const nowIso = new Date().toISOString();

    const normalizedProject: PortfolioProject = {
      ...project,
      projectOrder: Number(project.projectOrder ?? project.order ?? (index >= 0 ? current[index].projectOrder : current.length + 1)),
      order: Number(project.order ?? project.projectOrder ?? (index >= 0 ? current[index].order : current.length + 1)),
      gallery: Array.isArray(project.gallery) ? project.gallery : [],
      updatedAt: nowIso,
      createdAt: project.createdAt || (index >= 0 ? current[index].createdAt : nowIso),
    };

    let updated: PortfolioProject[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = normalizedProject;
    } else {
      updated = [...current, normalizedProject];
    }
    updated.sort((a, b) => (a.projectOrder || a.order || 0) - (b.projectOrder || b.order || 0));

    // Persist via StorageEngine (IndexedDB + LocalStorage)
    await StorageEngine.setItem(STORAGE_KEYS.PROJECTS, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'projects', normalizedProject.id), normalizedProject);
      } catch (err) {
        console.warn('Firestore project write notice (saved locally in IndexedDB):', err);
      }
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    const current = await this.getProjects();
    const updated = current.filter((p) => p.id !== projectId);
    await StorageEngine.setItem(STORAGE_KEYS.PROJECTS, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'projects', projectId));
      } catch (err) {
        console.warn('Firestore project delete notice:', err);
      }
    }
  },

  async saveAllProjects(projects: PortfolioProject[]): Promise<void> {
    const nowIso = new Date().toISOString();
    const updated = projects.map((p, idx) => ({
      ...p,
      projectOrder: idx + 1,
      order: idx + 1,
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      updatedAt: nowIso,
    }));
    await StorageEngine.setItem(STORAGE_KEYS.PROJECTS, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const batch = writeBatch(firestoreDb);
        updated.forEach((p) => {
          const ref = doc(firestoreDb!, 'projects', p.id);
          batch.set(ref, p);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore batch updating projects notice:', err);
      }
    }
  },

  // Services
  async getServices(): Promise<PortfolioService[]> {
    const local = await StorageEngine.getItem<PortfolioService[]>(STORAGE_KEYS.SERVICES);
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const q = query(collection(firestoreDb, 'services'), orderBy('order', 'asc'));
        const snap = await withTimeout(getDocs(q), 1200, null as any);
        if (snap && !snap.empty) {
          const srvs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as PortfolioService));
          if (local && local.length > 0) {
            const localMap = new Map(local.map((s) => [s.id, s]));
            const merged = srvs.map((rs) => localMap.get(rs.id) || rs);
            local.forEach((ls) => {
              if (!merged.some((m) => m.id === ls.id)) merged.push(ls);
            });
            merged.sort((a, b) => a.order - b.order);
            await StorageEngine.setItem(STORAGE_KEYS.SERVICES, merged);
            return merged;
          }
          await StorageEngine.setItem(STORAGE_KEYS.SERVICES, srvs);
          return srvs;
        }
      } catch (err) {
        console.warn('Firestore services fetch error:', err);
      }
    }
    return local && local.length > 0 ? local : DEFAULT_SERVICES;
  },

  async saveService(service: PortfolioService): Promise<void> {
    const current = await this.getServices();
    const index = current.findIndex((s) => s.id === service.id);
    let updated: PortfolioService[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = service;
    } else {
      updated = [...current, service];
    }
    updated.sort((a, b) => a.order - b.order);
    await StorageEngine.setItem(STORAGE_KEYS.SERVICES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'services', service.id), service);
      } catch (err) {
        console.warn('Firestore service write notice:', err);
      }
    }
  },

  async deleteService(serviceId: string): Promise<void> {
    const current = await this.getServices();
    const updated = current
      .filter((s) => s.id !== serviceId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    await StorageEngine.setItem(STORAGE_KEYS.SERVICES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'services', serviceId));
      } catch (err) {
        console.warn('Firestore service delete notice:', err);
      }
    }
  },

  async saveAllServices(services: PortfolioService[]): Promise<void> {
    const updated = services.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));
    await StorageEngine.setItem(STORAGE_KEYS.SERVICES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const batch = writeBatch(firestoreDb);
        updated.forEach((s) => {
          const ref = doc(firestoreDb!, 'services', s.id);
          batch.set(ref, s);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore batch update services notice:', err);
      }
    }
  },

  // Case Studies
  async getCaseStudies(): Promise<CaseStudyItem[]> {
    const local = await StorageEngine.getItem<CaseStudyItem[]>(STORAGE_KEYS.CASE_STUDIES);
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const q = query(collection(firestoreDb, 'casestudies'), orderBy('order', 'asc'));
        const snap = await withTimeout(getDocs(q), 1200, null as any);
        if (snap && !snap.empty) {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as CaseStudyItem));
          await StorageEngine.setItem(STORAGE_KEYS.CASE_STUDIES, items);
          return items;
        }
      } catch (err) {
        console.warn('Firestore casestudies fetch error:', err);
      }
    }
    return local && local.length > 0 ? local : DEFAULT_CASE_STUDIES;
  },

  async saveCaseStudy(study: CaseStudyItem): Promise<void> {
    const current = await this.getCaseStudies();
    const index = current.findIndex((s) => s.id === study.id);
    let updated: CaseStudyItem[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = study;
    } else {
      updated = [...current, study];
    }
    updated.sort((a, b) => a.order - b.order);
    await StorageEngine.setItem(STORAGE_KEYS.CASE_STUDIES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'casestudies', study.id), study);
      } catch (err) {
        console.warn('Firestore case study write notice:', err);
      }
    }
  },

  async deleteCaseStudy(studyId: string): Promise<void> {
    const current = await this.getCaseStudies();
    const updated = current.filter((s) => s.id !== studyId);
    await StorageEngine.setItem(STORAGE_KEYS.CASE_STUDIES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'casestudies', studyId));
      } catch (err) {
        console.warn('Firestore case study delete notice:', err);
      }
    }
  },

  // Messages (Contact Form)
  async getMessages(): Promise<ContactMessage[]> {
    const local = await StorageEngine.getItem<ContactMessage[]>(STORAGE_KEYS.MESSAGES);
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'messages'));
        const msgs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as ContactMessage));
        if (local && local.length > 0) {
          const localMap = new Map(local.map((m) => [m.id, m]));
          const merged = msgs.map((rm) => localMap.get(rm.id) || rm);
          local.forEach((lm) => {
            if (!merged.some((m) => m.id === lm.id)) merged.push(lm);
          });
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          await StorageEngine.setItem(STORAGE_KEYS.MESSAGES, merged);
          return merged;
        }
        msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        await StorageEngine.setItem(STORAGE_KEYS.MESSAGES, msgs);
        return msgs;
      } catch (err) {
        console.warn('Firestore messages fetch error:', err);
      }
    }
    return local || [];
  },

  async sendMessage(msg: Omit<ContactMessage, 'id' | 'createdAt'>): Promise<void> {
    const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newMsg: ContactMessage = {
      ...msg,
      id,
      createdAt: new Date().toISOString(),
      read: false,
      status: 'new',
    };

    // Save locally
    const current = await this.getMessages();
    const updated = [newMsg, ...current];
    await StorageEngine.setItem(STORAGE_KEYS.MESSAGES, updated);

    // Save to Firestore if available
    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'messages', id), newMsg);
      } catch (err) {
        console.warn('Firestore message save notice:', err);
      }
    }
  },

  async updateMessage(updatedMsg: ContactMessage): Promise<void> {
    const current = await this.getMessages();
    const updated = current.map((m) => (m.id === updatedMsg.id ? updatedMsg : m));
    await StorageEngine.setItem(STORAGE_KEYS.MESSAGES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'messages', updatedMsg.id), updatedMsg);
      } catch (err) {
        console.warn('Firestore message update notice:', err);
      }
    }
  },

  async deleteMessage(msgId: string): Promise<void> {
    const current = await this.getMessages();
    const updated = current.filter((m) => m.id !== msgId);
    await StorageEngine.setItem(STORAGE_KEYS.MESSAGES, updated);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'messages', msgId));
      } catch (err) {
        console.warn('Firestore message delete notice:', err);
      }
    }
  },

  // Storage Upload helper
  async uploadMedia(file: File, pathPrefix: string = 'portfolio/gallery'): Promise<string> {
    if (isFirebaseConfigured() && firebaseStorage) {
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageRef = ref(firebaseStorage, `${pathPrefix}/${Date.now()}_${cleanName}`);
        const snap = await uploadBytes(storageRef, file);
        return await getDownloadURL(snap.ref);
      } catch (err) {
        console.warn('Firebase storage upload error, falling back to data URL:', err);
      }
    }

    // Fallback to local DataURL for immediate preview/testing
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Reset to initial demo data
  async resetToDemoData(): Promise<void> {
    await StorageEngine.setItem(STORAGE_KEYS.PAGES, DEFAULT_PAGES);
    await StorageEngine.setItem(STORAGE_KEYS.PROJECTS, DEFAULT_PROJECTS);
    await StorageEngine.setItem(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
    await StorageEngine.setItem(STORAGE_KEYS.CASE_STUDIES, DEFAULT_CASE_STUDIES);
    await StorageEngine.setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
};

// --- Authentication Service ---
export interface AuthSession {
  email: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const authSubscribers = new Set<(session: AuthSession) => void>();

function notifyAuthSubscribers(session: AuthSession) {
  authSubscribers.forEach((cb) => {
    try {
      cb(session);
    } catch (err) {
      console.error('Error in auth subscriber:', err);
    }
  });
}

export const AuthService = {
  getCurrentSession(): AuthSession {
    if (isFirebaseConfigured() && firebaseAuth?.currentUser) {
      return {
        email: firebaseAuth.currentUser.email || 'Admin',
        isAuthenticated: true,
        isAdmin: true,
      };
    }
    const demo = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return {
      email: demo || '',
      isAuthenticated: !!demo,
      isAdmin: !!demo,
    };
  },

  onAuthStateChange(callback: (session: AuthSession) => void): () => void {
    authSubscribers.add(callback);

    // Initial notification
    callback(this.getCurrentSession());

    let firebaseUnsub = () => {};

    if (isFirebaseConfigured() && firebaseAuth) {
      firebaseUnsub = onAuthStateChanged(firebaseAuth, (user: User | null) => {
        if (user) {
          const session = {
            email: user.email || 'Admin',
            isAuthenticated: true,
            isAdmin: true,
          };
          notifyAuthSubscribers(session);
        } else {
          const demo = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
          const session = {
            email: demo || '',
            isAuthenticated: !!demo,
            isAdmin: !!demo,
          };
          notifyAuthSubscribers(session);
        }
      });
    }

    return () => {
      authSubscribers.delete(callback);
      firebaseUnsub();
    };
  },

  getAdminPassword(): string {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD) || 'admin123';
  },

  async updateAdminPassword(newPassword: string): Promise<void> {
    const clean = newPassword.trim();
    if (!clean) {
      throw new Error('Password tidak boleh kosong');
    }
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, clean);

    if (isFirebaseConfigured() && firestoreDb) {
      try {
        await setDoc(
          doc(firestoreDb, 'settings', 'admin_auth'),
          {
            password: clean,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Could not sync password to Firestore:', err);
      }
    }
  },

  async login(password: string): Promise<boolean> {
    const cleanPass = password.trim();
    const storedPass = this.getAdminPassword();

    if (!cleanPass) {
      throw new Error('Harap masukkan password');
    }

    if (cleanPass !== storedPass) {
      throw new Error('Password salah. Silakan coba lagi.');
    }

    localStorage.setItem(STORAGE_KEYS.AUTH_USER, 'Admin');
    const session = {
      email: 'Admin',
      isAuthenticated: true,
      isAdmin: true,
    };
    notifyAuthSubscribers(session);
    return true;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    if (isFirebaseConfigured() && firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    const session = {
      email: '',
      isAuthenticated: false,
      isAdmin: false,
    };
    notifyAuthSubscribers(session);
  },
};
