import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  LogOut,
  Layers,
  Briefcase,
  Cpu,
  Mail,
  Settings as SettingsIcon,
  Database,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  Upload,
  ExternalLink,
  Shield,
  Key,
  Lock,
  Image as ImageIcon,
  BookOpen,
  UserCheck,
  Award,
  Sparkles,
  Phone,
  Globe,
  BarChart3,
  Store,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Bookmark,
  ArrowUp,
  ArrowDown,
  Target,
  AlertTriangle,
  Crop,
} from 'lucide-react';
import {
  PortfolioPage,
  PortfolioProject,
  PortfolioService,
  PortfolioSettings,
  CaseStudyItem,
  ContactMessage,
} from '../../types';
import {
  DataService,
  AuthService,
  isFirebaseConfigured,
  getStoredFirebaseConfig,
} from '../../firebase/service';
import { optimizeAndResizeImage } from '../../utils/imageOptimizer';
import { ImageCropModal } from '../../utils/ImageCropModal';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated: () => void;
  pages: PortfolioPage[];
  projects: PortfolioProject[];
  services: PortfolioService[];
  settings: PortfolioSettings;
}

// Mini preview counter
const PreviewCounter: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const stepTime = 20;
    const steps = duration / stepTime;
    const inc = target / steps;

    const timer = setInterval(() => {
      start += inc;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
  pages,
  projects,
  services,
  settings,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Change Password State
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState('');
  const [passwordStatusType, setPasswordStatusType] = useState<'success' | 'error' | ''>('');

  // Active Tab
  type AdminTab =
    | 'dashboard'
    | 'cover'
    | 'folio'
    | 'profile'
    | 'portfolio'
    | 'services'
    | 'casestudy'
    | 'pages'
    | 'messages'
    | 'settings'
    | 'firebase';
  const [activeTab, setActiveTab] = useState<AdminTab>('cover');

  // Case studies state
  const [caseStudies, setCaseStudies] = useState<CaseStudyItem[]>([]);

  // Messages state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Form Modals
  const [editingPage, setEditingPage] = useState<Partial<PortfolioPage> | null>(null);
  const [editingProject, setEditingProject] = useState<Partial<PortfolioProject> | null>(null);
  const [editingService, setEditingService] = useState<Partial<PortfolioService> | null>(null);
  const [editingCaseStudy, setEditingCaseStudy] = useState<Partial<CaseStudyItem> | null>(null);
  const [editingMessage, setEditingMessage] = useState<ContactMessage | null>(null);
  const [editableSettings, setEditableSettings] = useState<PortfolioSettings>(settings);

  // Helper state for adding gallery URLs in project edit
  const [galleryInputUrl, setGalleryInputUrl] = useState('');
  // Helper state for adding custom contact subject in settings
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Firebase Config Form
  const [customFirebaseJson, setCustomFirebaseJson] = useState('');
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Status Notification
  const [toastMessage, setToastMessage] = useState('');
  const [isOptimizingPhoto, setIsOptimizingPhoto] = useState(false);

  // 1:1 Interactive Image Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropRawImageSrc, setCropRawImageSrc] = useState<string>('');

  // Project Image Crop & Zoom State (Cover & Gallery)
  const [projectCropState, setProjectCropState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    title: string;
    description: string;
    target: 'cover' | { galleryIndex: number } | 'gallery-new';
  } | null>(null);

  const handleProjectCropComplete = (croppedBase64: string) => {
    if (!projectCropState || !editingProject) {
      setProjectCropState(null);
      return;
    }
    if (projectCropState.target === 'cover') {
      setEditingProject({
        ...editingProject,
        coverImage: croppedBase64,
      });
      showToast('Foto sampul proyek berhasil disesuaikan & di-crop!');
    } else if (projectCropState.target === 'gallery-new') {
      const current = editingProject.gallery || [];
      if (current.length < 3) {
        setEditingProject({
          ...editingProject,
          gallery: [...current, croppedBase64],
        });
        showToast('Foto galeri berhasil ditambahkan & di-crop!');
      }
    } else if (typeof projectCropState.target === 'object' && 'galleryIndex' in projectCropState.target) {
      const idx = projectCropState.target.galleryIndex;
      const current = [...(editingProject.gallery || [])];
      current[idx] = croppedBase64;
      setEditingProject({
        ...editingProject,
        gallery: current,
      });
      showToast(`Foto galeri #${idx + 1} berhasil diperbarui!`);
    }
    setProjectCropState(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Delete Confirmation Modal State (replaces blocked window.confirm in iframe)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'service' | 'project' | 'casestudy' | 'message';
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync settings when props change
  useEffect(() => {
    setEditableSettings(settings);
  }, [settings]);

  // Auth observer
  useEffect(() => {
    const unsub = AuthService.onAuthStateChange((session) => {
      setIsAuthenticated(session.isAuthenticated);
      setAdminEmail(session.email);
    });
    return () => unsub();
  }, []);

  // Fetch initial case studies and messages
  const loadCaseStudies = async () => {
    try {
      const list = await DataService.getCaseStudies();
      setCaseStudies(list);
    } catch {
      // ignore
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      if (deleteTarget.type === 'service') {
        await DataService.deleteService(deleteTarget.id);
        onDataUpdated();
        showToast(`Layanan "${deleteTarget.title}" berhasil dihapus!`);
      } else if (deleteTarget.type === 'project') {
        await DataService.deleteProject(deleteTarget.id);
        onDataUpdated();
        showToast(`Project "${deleteTarget.title}" berhasil dihapus!`);
      } else if (deleteTarget.type === 'casestudy') {
        await DataService.deleteCaseStudy(deleteTarget.id);
        await loadCaseStudies();
        showToast(`Case study "${deleteTarget.title}" berhasil dihapus!`);
      } else if (deleteTarget.type === 'message') {
        await DataService.deleteMessage(deleteTarget.id);
        setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        showToast(`Pesan dari "${deleteTarget.title}" berhasil dihapus!`);
      }
    } catch (err) {
      console.error('Error during deletion:', err);
      showToast('Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCaseStudies();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'messages' && isAuthenticated) {
      setIsLoadingMessages(true);
      DataService.getMessages().then((msgs) => {
        setMessages(msgs);
        setIsLoadingMessages(false);
      });
    }
    if (activeTab === 'casestudy' && isAuthenticated) {
      loadCaseStudies();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const success = await AuthService.login(loginPassword);
      if (success) {
        setIsAuthenticated(true);
        setLoginPassword('');
      } else {
        setLoginError('Password salah. Password default: admin123');
      }
    } catch {
      setLoginError('Terjadi kesalahan login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveSettings = async (customMsg = 'Pengaturan berhasil disimpan!') => {
    try {
      await DataService.saveSettings(editableSettings);
      onDataUpdated();
      showToast(customMsg);
    } catch {
      showToast('Gagal menyimpan pengaturan.');
    }
  };

  const handleMoveProject = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const newProjects = [...projects];
    const [moved] = newProjects.splice(index, 1);
    newProjects.splice(targetIndex, 0, moved);

    try {
      await DataService.saveAllProjects(newProjects);
      onDataUpdated();
      showToast(`Urutan proyek diperbarui: ${moved.title}`);
    } catch {
      showToast('Gagal mengubah urutan proyek.');
    }
  };

  const handleMoveService = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const newServices = [...services];
    const [moved] = newServices.splice(index, 1);
    newServices.splice(targetIndex, 0, moved);

    try {
      await DataService.saveAllServices(newServices);
      onDataUpdated();
      showToast(`Urutan layanan diperbarui: ${moved.title}`);
    } catch {
      showToast('Gagal mengubah urutan layanan.');
    }
  };

  if (!isOpen) return null;

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div
        id="admin-login-backdrop"
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      >
        <div
          id="admin-login-modal"
          className="relative w-full max-w-md bg-[#12151e] border border-[#272d3e] rounded-2xl p-6 sm:p-8 shadow-2xl text-white"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#1e2332] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#1b202e] border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059] shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display tracking-wide text-white">
              ADMINISTRATOR ACCESS
            </h3>
            <p className="text-xs text-slate-400 font-mono-code">
              Berly Digital Hardcover Portfolio CMS
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs font-mono-code">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono-code text-slate-400 mb-1">
                MASTER PASSWORD
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Masukkan password admin..."
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg bg-[#181c28] border border-[#2c3449] text-white text-sm focus:border-[#c5a059] focus:outline-none pr-10 font-mono-code"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 mt-1">
                Default: <span className="text-[#c5a059]">admin123</span> (dapat diubah di tab Settings)
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] text-black font-bold text-xs font-mono-code transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              <Key className="w-4 h-4" />
              {isLoggingIn ? 'MEMVERIFIKASI...' : 'MASUK KE DASHBOARD ADMIN'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LOGGED-IN ADMIN DASHBOARD VIEW ---
  return (
    <div
      id="admin-dashboard-backdrop"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
    >
      <div
        id="admin-dashboard-container"
        className="relative w-full max-w-6xl h-[94vh] bg-[#11131a] border border-[#262b3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row text-white"
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2 rounded-lg bg-[#c5a059] text-black font-mono-code text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle className="w-4 h-4" /> {toastMessage}
          </div>
        )}

        {/* Left Navigation Sidebar */}
        <div className="w-full sm:w-64 bg-[#141722] border-b sm:border-b-0 sm:border-r border-[#202535] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base font-display text-white tracking-wide">BERLY CMS</h3>
                <span className="text-[10px] font-mono-code text-[#c5a059]">ADMIN DASHBOARD</span>
              </div>
              <button
                onClick={onClose}
                className="sm:hidden p-1.5 rounded bg-[#1e2332] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-1 text-xs font-mono-code">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4" /> Dashboard
              </button>

              <button
                onClick={() => setActiveTab('cover')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'cover'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Cover Buku
              </button>

              <button
                onClick={() => setActiveTab('folio')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'folio'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Bookmark className="w-4 h-4" /> Executive Folio
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Profiles & Counter
              </button>

              <button
                onClick={() => setActiveTab('portfolio')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'portfolio'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Portfolio ({projects.length})
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'services'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Cpu className="w-4 h-4" /> Services ({services.length})
              </button>

              <button
                onClick={() => setActiveTab('casestudy')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'casestudy'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Award className="w-4 h-4" /> Case Study ({caseStudies.length})
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Mail className="w-4 h-4" /> Messages
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <SettingsIcon className="w-4 h-4" /> WA & Settings
              </button>

              <button
                onClick={() => setActiveTab('pages')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'pages'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4" /> Page Manager
              </button>

              <button
                onClick={() => setActiveTab('firebase')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'firebase'
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'hover:bg-[#1a1f2e] text-slate-300'
                }`}
              >
                <Database className="w-4 h-4" /> Firebase Sync
              </button>
            </nav>
          </div>

          {/* User info & Logout */}
          <div className="pt-4 border-t border-[#202535] space-y-2 mt-4">
            <div className="text-[10px] font-mono-code text-slate-400 truncate">
              User: <span className="text-white">{adminEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await AuthService.logout();
                  setIsAuthenticated(false);
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-[#1d2232] hover:bg-red-950/60 hover:text-red-300 text-xs font-mono-code text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
              <button
                onClick={onClose}
                className="hidden sm:inline-flex p-1.5 rounded-lg bg-[#1d2232] hover:bg-[#282f45] text-slate-300 cursor-pointer"
                title="Close Admin Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1118]">
          {/* Top Bar */}
          <div className="p-3 sm:p-4 border-b border-[#202535] bg-[#131620] flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono-code text-xs">
              <span className="text-slate-400">DATABASE STATUS:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-950/80 text-green-400 border border-green-800/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {isFirebaseConfigured() ? 'CLOUD FIRESTORE LIVE' : 'DATABASE PERSISTENT READY'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono-code text-[#c5a059] flex items-center gap-1.5 bg-[#1a1f2e] px-2.5 py-1 rounded-md border border-[#2b3347]">
                <Sparkles className="w-3 h-3 text-[#c5a059]" /> Auto-Sync Active
              </span>
            </div>
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* 1. DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold font-display">System Overview</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d]">
                    <div className="text-[10px] font-mono-code text-slate-400 uppercase">Projects</div>
                    <div className="text-2xl font-bold text-white font-mono-code mt-1">{projects.length}</div>
                    <div className="text-[10px] text-[#c5a059] mt-1">
                      {Math.ceil(projects.length / 5)} Halaman Buku (5/hlm)
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d]">
                    <div className="text-[10px] font-mono-code text-slate-400 uppercase">Services</div>
                    <div className="text-2xl font-bold text-white font-mono-code mt-1">{services.length}</div>
                    <div className="text-[10px] text-[#c5a059] mt-1">Full-stack solutions</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d]">
                    <div className="text-[10px] font-mono-code text-slate-400 uppercase">Case Studies</div>
                    <div className="text-2xl font-bold text-white font-mono-code mt-1">{caseStudies.length}</div>
                    <div className="text-[10px] text-[#c5a059] mt-1">Client stories</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d]">
                    <div className="text-[10px] font-mono-code text-slate-400 uppercase">Messages</div>
                    <div className="text-2xl font-bold text-white font-mono-code mt-1">{messages.length}</div>
                    <div className="text-[10px] text-green-400 mt-1">Inquiries captured</div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                  <h4 className="font-bold text-sm text-white font-mono-code text-[#c5a059]">
                    NAVIGASI PENGELOLAAN
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveTab('cover')}
                      className="p-3 rounded-lg bg-[#1c2130] hover:bg-[#c5a059] hover:text-black transition-all text-left group cursor-pointer"
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Cover Buku</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400 group-hover:text-black/80 mt-1">
                        Logo kotak besar, tagline, deskripsi cover
                      </p>
                    </button>
                    <button
                      onClick={() => setActiveTab('folio')}
                      className="p-3 rounded-lg bg-[#1c2130] hover:bg-[#c5a059] hover:text-black transition-all text-left group cursor-pointer"
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Executive Folio</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400 group-hover:text-black/80 mt-1">
                        Teks lembar kiri, nama, pengantar & metadata
                      </p>
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="p-3 rounded-lg bg-[#1c2130] hover:bg-[#c5a059] hover:text-black transition-all text-left group cursor-pointer"
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Profiles & Stats</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400 group-hover:text-black/80 mt-1">
                        Foto, bio, counter Experience & Privacy
                      </p>
                    </button>
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      className="p-3 rounded-lg bg-[#1c2130] hover:bg-[#c5a059] hover:text-black transition-all text-left group cursor-pointer"
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Portfolio</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] text-slate-400 group-hover:text-black/80 mt-1">
                        CRUD project, pembagian 5 item per halaman
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TAB COVER BUKU */}
            {activeTab === 'cover' && (
              <div className="space-y-5 max-w-3xl">
                <div>
                  <h3 className="text-base font-bold font-display text-white">MANAJEMEN COVER DEPAN</h3>
                  <p className="text-xs text-slate-400">
                    Kustomisasi tampilan sampul buku hardcover: upload logo berukuran kotak besar, tagline, deskripsi, dan teks volume edition.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Left Column: Logo square upload */}
                  <div className="md:col-span-5 p-4 rounded-xl bg-[#141722] border border-[#252b3d] text-center space-y-3">
                    <label className="block text-[11px] font-mono-code text-[#c5a059] font-bold">
                      LOGO COVER (BENTUK KOTAK BESAR)
                    </label>

                    {/* Prominent Square Logo Box */}
                    <div className="w-44 h-44 mx-auto rounded-3xl bg-[#161a26] border-2 border-[#c5a059]/80 p-3 shadow-xl flex items-center justify-center overflow-hidden relative group">
                      {editableSettings.coverLogo ? (
                        <img
                          src={editableSettings.coverLogo}
                          alt="Cover Logo"
                          className="w-full h-full object-contain rounded-2xl"
                        />
                      ) : (
                        <div className="text-center text-slate-400 text-xs font-mono-code">
                          <ImageIcon className="w-8 h-8 text-[#c5a059] mx-auto mb-1 opacity-70" />
                          <span>Belum ada logo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="w-full py-2 px-3 rounded-lg bg-[#1f2537] hover:bg-[#c5a059] text-slate-200 hover:text-black font-mono-code text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#2f384f]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isOptimizingPhoto ? 'Mengompres logo...' : 'Upload Logo Dari Komputer'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setIsOptimizingPhoto(true);
                              const optimizedLogo = await optimizeAndResizeImage(file, 600, 600, 0.85);
                              const newSettings = {
                                ...editableSettings,
                                coverLogo: optimizedLogo,
                              };
                              setEditableSettings(newSettings);
                              await DataService.saveSettings(newSettings);
                              onDataUpdated();
                              showToast('Logo cover berhasil di-resize & disimpan otomatis!');
                            } catch (err) {
                              console.error(err);
                              showToast('Gagal memproses logo.');
                            } finally {
                              setIsOptimizingPhoto(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>

                      <div className="text-left">
                        <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                          ATAU MASUKKAN URL LOGO:
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com/logo.png"
                          value={editableSettings.coverLogo || ''}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              coverLogo: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2a3044] text-white text-xs font-mono-code"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Texts */}
                  <div className="md:col-span-7 p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                        TEKS EDITION BADGE (DEFAULT: HARDCOVER VOLUME • ED. 2026)
                      </label>
                      <input
                        type="text"
                        value={editableSettings.coverEditionText || ''}
                        placeholder="HARDCOVER VOLUME • ED. 2026"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            coverEditionText: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                        NAMA / TITLE UTAMA COVER
                      </label>
                      <input
                        type="text"
                        value={editableSettings.name || ''}
                        placeholder="BERLY"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                        TAGLINE COVER
                      </label>
                      <input
                        type="text"
                        value={editableSettings.coverTagline || ''}
                        placeholder="DIGITAL PORTFOLIO"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            coverTagline: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                        DESKRIPSI COVER
                      </label>
                      <textarea
                        rows={3}
                        value={editableSettings.coverDescription || ''}
                        placeholder="Interactive Web • Digital Solution • Creative Technology"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            coverDescription: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      onClick={() => handleSaveSettings('Cover buku berhasil diperbarui!')}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#c5a059] hover:bg-[#d8b368] text-black font-bold text-xs font-mono-code flex items-center justify-center gap-2 cursor-pointer shadow-md transition-transform active:scale-[0.99]"
                    >
                      <Save className="w-4 h-4" /> SIMPAN PENGATURAN COVER
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB EXECUTIVE FOLIO (LEMBAR DALAM KIRI / FRONTISPIECE) */}
            {activeTab === 'folio' && (
              <div className="space-y-5 max-w-4xl">
                <div>
                  <h3 className="text-base font-bold font-display text-white">MANAJEMEN EXECUTIVE FOLIO (HALAMAN DEPAN KIRI)</h3>
                  <p className="text-xs text-slate-400">
                    Ubah seluruh kata-kata dan teks pada lembar dalam kiri buku (Frontispiece / Executive Folio), mulai dari tagline emas, nama/judul utama, deskripsi pengantar, hingga baris spesifikasi metadata.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Form Inputs */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Teks Utama */}
                    <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                      <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5" /> TEKS UTAMA LEMBAR DEPAN
                      </h4>

                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                          TAGLINE / SUB-HEADING ATAS
                        </label>
                        <input
                          type="text"
                          value={editableSettings.folioTagline ?? 'EXECUTIVE FOLIO'}
                          placeholder="EXECUTIVE FOLIO"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              folioTagline: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 font-mono-code mt-0.5 block">
                          Teks kecil berwarna emas dengan spasi lebar di bagian atas lembar.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                          JUDUL / NAMA UTAMA (TITLE)
                        </label>
                        <input
                          type="text"
                          value={editableSettings.folioTitle ?? editableSettings.name ?? 'BERLY'}
                          placeholder="BERLY"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              folioTitle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 font-mono-code mt-0.5 block">
                          Nama atau judul tebal dengan tipografi luxury serif.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                          DESKRIPSI / PARAGRAF PENGANTAR
                        </label>
                        <textarea
                          rows={3}
                          value={
                            editableSettings.folioDescription ??
                            'A curated anthology of production applications, enterprise cloud workflows, and interactive spatial computing systems.'
                          }
                          placeholder="A curated anthology of production applications..."
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              folioDescription: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none resize-none leading-relaxed"
                        />
                        <span className="text-[10px] text-slate-500 font-mono-code mt-0.5 block">
                          Narasi deskripsi buku yang menjelaskan portofolio dan keahlian Anda.
                        </span>
                      </div>
                    </div>

                    {/* Metadata Items */}
                    <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                      <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> BARIS METADATA / INFO SPESIFIKASI
                      </h4>

                      {/* Item 1 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Label Info 1</label>
                          <input
                            type="text"
                            value={editableSettings.folioCuratedLabel ?? 'Curated Folio:'}
                            placeholder="Curated Folio:"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioCuratedLabel: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Nilai Info 1</label>
                          <input
                            type="text"
                            value={editableSettings.folioCuratedValue ?? 'Executive Edition'}
                            placeholder="Executive Edition"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioCuratedValue: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Label Info 2</label>
                          <input
                            type="text"
                            value={editableSettings.folioDbLabel ?? 'Database Engine:'}
                            placeholder="Database Engine:"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioDbLabel: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Nilai Info 2</label>
                          <input
                            type="text"
                            value={editableSettings.folioDbValue ?? 'Cloud Firestore'}
                            placeholder="Cloud Firestore"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioDbValue: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-[#c5a059] text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Label Info 3</label>
                          <input
                            type="text"
                            value={editableSettings.folioStorageLabel ?? 'Storage Cloud:'}
                            placeholder="Storage Cloud:"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioStorageLabel: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Nilai Info 3</label>
                          <input
                            type="text"
                            value={editableSettings.folioStorageValue ?? 'Firebase Storage'}
                            placeholder="Firebase Storage"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioStorageValue: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-[#c5a059] text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      {/* Footer Labels */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232839]">
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Label Footer Kiri</label>
                          <input
                            type="text"
                            value={editableSettings.folioFooterNote ?? 'FRONTISPIECE'}
                            placeholder="FRONTISPIECE"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioFooterNote: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Teks Tombol Tutup</label>
                          <input
                            type="text"
                            value={editableSettings.folioCloseText ?? '← Close Cover'}
                            placeholder="← Close Cover"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioCloseText: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-[#c5a059] text-xs font-mono-code"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Nilai Experience (Tahun)</label>
                          <input
                            type="text"
                            value={editableSettings.folioYearsValue ?? '20+ Years'}
                            placeholder="20+ Years"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioYearsValue: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Status Ketersediaan</label>
                          <input
                            type="text"
                            value={editableSettings.folioAvailabilityValue ?? 'Advisory & Development'}
                            placeholder="Advisory & Development"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioAvailabilityValue: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Teks Cap / Seal Arsip</label>
                          <input
                            type="text"
                            value={editableSettings.folioSealText ?? 'VERIFIED ARCHIVE • HARDCOVER EDITION'}
                            placeholder="VERIFIED ARCHIVE • HARDCOVER EDITION"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                folioSealText: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-[#c5a059] text-xs font-mono-code"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveSettings('Executive Folio berhasil diperbarui!')}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#c5a059] hover:bg-[#d8b368] text-black font-bold text-xs font-mono-code flex items-center justify-center gap-2 cursor-pointer shadow-md transition-transform active:scale-[0.99]"
                    >
                      <Save className="w-4 h-4" /> SIMPAN PERUBAHAN EXECUTIVE FOLIO
                    </button>
                  </div>

                  {/* Live Visual Preview */}
                  <div className="lg:col-span-5 space-y-2">
                    <span className="text-[11px] font-mono-code text-slate-400 flex items-center gap-1.5 font-bold">
                      <Eye className="w-3.5 h-3.5 text-[#c5a059]" /> LIVE PREVIEW (LEMBAR KIRI)
                    </span>
                    <div className="p-6 rounded-xl bg-[#0d0f17] border border-[#252a3b] shadow-2xl space-y-4 text-xs font-mono-code">
                      <span className="text-[9px] tracking-[0.3em] text-[#c5a059] uppercase block font-bold">
                        {editableSettings.folioTagline || 'EXECUTIVE FOLIO'}
                      </span>
                      <h4 className="text-xl font-bold text-white font-serif-luxury">
                        {editableSettings.folioTitle || editableSettings.name || 'BERLY'}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {editableSettings.folioDescription ||
                          'A curated anthology of production applications, enterprise cloud workflows, and interactive spatial computing systems.'}
                      </p>
                      <div className="pt-3 border-t border-[#232733] space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{editableSettings.folioCuratedLabel || 'Fokus Utama :'}</span>
                          <span className="text-white">{editableSettings.folioCuratedValue || 'Manusia • Teknologi • Data'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{editableSettings.folioDbLabel || 'Ketertarikan Spesial :'}</span>
                          <span className="text-[#c5a059] text-right">{editableSettings.folioDbValue || 'Tentang Potensi & Bisnis'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{editableSettings.folioYearsLabel || 'Experience :'}</span>
                          <span className="text-[#c5a059]">{editableSettings.folioYearsValue || '20+ Years'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{editableSettings.folioAvailabilityLabel || 'Availability :'}</span>
                          <span className="text-emerald-400">{editableSettings.folioAvailabilityValue || 'Advisory & Development'}</span>
                        </div>
                      </div>

                      {/* Seal preview */}
                      <div className="p-2.5 rounded-lg bg-[#141824] border border-[#232a3a] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1b2130] border border-[#c5a059]/40 flex items-center justify-center shrink-0 text-[#c5a059]">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px] text-[#c5a059] font-bold uppercase truncate">
                          {editableSettings.folioSealText || 'VERIFIED ARCHIVE • HARDCOVER EDITION'}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-[#232733] flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{editableSettings.folioFooterNote || 'FRONTISPIECE'}</span>
                        <span className="text-[#c5a059]">{editableSettings.folioCloseText || '← Close Cover'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. TAB PROFILES & COUNTER */}
            {activeTab === 'profile' && (
              <div className="space-y-5 max-w-3xl">
                <div>
                  <h3 className="text-base font-bold font-display text-white">MANAJEMEN PROFIL & COUNTER</h3>
                  <p className="text-xs text-slate-400">
                    Upload foto profil, perbarui narasi deskripsi, dan atur angka statistik (Experience, Success Rate, dan 100% Privacy) yang akan beranimasi counter dari 0 ke target angka.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-4">
                  {/* Photo & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    <div className="sm:col-span-4 text-center space-y-2">
                      <div className="w-32 h-52 mx-auto rounded-2xl overflow-hidden bg-[#161a26] border-2 border-[#c5a059]/60 relative shadow-lg group">
                        <img
                          src={
                            editableSettings.profileImage ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
                          }
                          alt="Profile preview"
                          className="w-full h-full object-cover object-top"
                        />
                        {editableSettings.profileImage && (
                          <button
                            type="button"
                            onClick={() => {
                              if (editableSettings.profileImage) {
                                setCropRawImageSrc(editableSettings.profileImage);
                                setCropModalOpen(true);
                              }
                            }}
                            className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-black/75 hover:bg-[#c5a059] text-white hover:text-black transition-colors text-[10px] flex items-center gap-1 font-mono-code backdrop-blur-sm"
                            title="Crop / Atur Ulang Rasio 9:16"
                          >
                            <span>Crop 9:16</span>
                          </button>
                        )}
                      </div>
                      <label className="w-full py-1.5 px-3 rounded-lg bg-[#1f2537] hover:bg-[#c5a059] text-slate-200 hover:text-black font-mono-code text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#2f384f]">
                        <Upload className="w-3 h-3" />
                        <span>Upload & Crop Foto (9:16)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setCropRawImageSrc(reader.result);
                                setCropModalOpen(true);
                              }
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Format lonjong (9:16) proporsional tampak jas & postur
                      </p>
                    </div>

                    <div className="sm:col-span-8 space-y-2.5">
                      {/* STATUS BADGE / AVAILABILITY */}
                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold">
                          STATUS BADGE / AVAILABILITY
                        </label>
                        <input
                          type="text"
                          placeholder="Available for Strategic Projects"
                          value={editableSettings.profileStatusBadge ?? 'Available for Strategic Projects'}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileStatusBadge: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2a3044] text-white text-xs font-mono-code"
                        />
                      </div>

                      {/* PROFILE HEADLINE / TITLE */}
                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold">
                          PROFILE HEADLINE / SLOGAN UTAMA
                        </label>
                        <input
                          type="text"
                          placeholder="Transforming Complex Ideas into Tactile Digital Realities"
                          value={editableSettings.profileHeadline ?? 'Transforming Complex Ideas into Tactile Digital Realities'}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileHeadline: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2a3044] text-white text-xs font-mono-code"
                        />
                      </div>

                      {/* PROFILE PHOTO URL */}
                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold">
                          URL FOTO PROFIL (OPSIONAL)
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com/profile.jpg"
                          value={editableSettings.profileImage || ''}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileImage: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2a3044] text-white text-xs font-mono-code"
                        />
                      </div>

                      {/* PROFILE BIO */}
                      <div>
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold">
                          DESKRIPSI PROFIL / EXECUTIVE BIO
                        </label>
                        <textarea
                          rows={3}
                          value={editableSettings.profileDescription || ''}
                          placeholder="Senior Full-Stack Architect & Digital Craftsman with a passion for high-performance web systems..."
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileDescription: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2a3044] text-white text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3 STAT COUNTER SETTINGS */}
                  <div className="pt-3 border-t border-[#232839] space-y-3">
                    <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> PENGATURAN COUNTER ANGKA (ANIMASI DARI 0 KE TARGET)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Counter 1: Experience */}
                      <div className="p-3 rounded-xl bg-[#161a26] border border-[#293144] space-y-2">
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-[#c5a059]" /> 1. EXPERIENCE
                        </label>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono-code">Angka Target:</span>
                          <input
                            type="number"
                            value={editableSettings.profileExperience ?? 8}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profileExperience: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0f1118] border border-[#2b3346] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono-code">Label / Suffix:</span>
                          <input
                            type="text"
                            value={editableSettings.profileExperienceSuffix || '+ Tahun'}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profileExperienceSuffix: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0f1118] border border-[#2b3346] text-white text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      {/* Counter 2: Success Rate */}
                      <div className="p-3 rounded-xl bg-[#161a26] border border-[#293144] space-y-2">
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[#c5a059]" /> 2. SUCCESS RATE
                        </label>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono-code">Angka Target (%):</span>
                          <input
                            type="number"
                            value={editableSettings.profileSuccessRate ?? 99}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profileSuccessRate: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0f1118] border border-[#2b3346] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono-code">Label / Suffix:</span>
                          <input
                            type="text"
                            value={editableSettings.profileSuccessRateSuffix || '%'}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profileSuccessRateSuffix: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0f1118] border border-[#2b3346] text-white text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      {/* Counter 3: 100% Privacy */}
                      <div className="p-3 rounded-xl bg-[#161a26] border border-[#293144] space-y-2">
                        <label className="block text-[11px] font-mono-code text-slate-300 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" /> 3. 100% PRIVACY AMAN
                        </label>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono-code">Angka Target:</span>
                          <input
                            type="number"
                            value={editableSettings.profilePrivacyNumber ?? 100}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profilePrivacyNumber: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0f1118] border border-[#2b3346] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono-code">Label / Suffix (misal: % Aman):</span>
                          <input
                            type="text"
                            value={editableSettings.profilePrivacyLabel ?? '% Aman'}
                            placeholder="% Aman"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profilePrivacyLabel: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-[#0f1118] border border-[#2b3346] text-white text-xs font-mono-code"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE PREVIEW BOX */}
                    <div className="p-3 rounded-xl bg-[#0e1017] border border-[#212636] flex items-center justify-between">
                      <span className="text-[11px] font-mono-code text-slate-400">Live Counter Preview:</span>
                      <div className="flex gap-4 text-xs font-mono-code font-bold">
                        <span className="text-[#c5a059]">
                          <PreviewCounter
                            target={Number(editableSettings.profileExperience) || 8}
                            suffix={editableSettings.profileExperienceSuffix || '+ Tahun'}
                          />
                        </span>
                        <span className="text-[#c5a059]">
                          <PreviewCounter
                            target={Number(editableSettings.profileSuccessRate) || 99}
                            suffix={editableSettings.profileSuccessRateSuffix || '%'}
                          />
                        </span>
                        <span className="text-[#4ade80]">
                          <PreviewCounter
                            target={Number(editableSettings.profilePrivacyNumber) || 100}
                            suffix={editableSettings.profilePrivacyLabel || '% Aman'}
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header & Footer Teks Halaman Profile */}
                  <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#212738] pb-2">
                      <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5" /> TEKS HEADER & FOOTER HALAMAN PROFILE
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono-code">Dinamis Buku</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                          TAGLINE / SUB-HEADING ATAS:
                        </label>
                        <input
                          type="text"
                          value={editableSettings.profileTagline ?? 'BERLY — CREATIVE TECHNOLOGIST'}
                          placeholder="BERLY — CREATIVE TECHNOLOGIST"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileTagline: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                          LABEL FOOTER KIRI:
                        </label>
                        <input
                          type="text"
                          value={editableSettings.profileFooterLeft ?? 'BERLY // DIGITAL ARCHIVES'}
                          placeholder="BERLY // DIGITAL ARCHIVES"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileFooterLeft: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                          LABEL FOOTER KANAN:
                        </label>
                        <input
                          type="text"
                          value={editableSettings.profileFooterRight ?? 'Next Section'}
                          placeholder="Next Section"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              profileFooterRight: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Key Focus Pillars (Keahlian & Metodologi Utama) */}
                  <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#212738] pb-2">
                      <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" /> PILAR KEAHLIAN / KEY FOCUS AREAS (BAGIAN BAWAH PROFILE)
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono-code">2 Kartu Unggulan</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pillar 1 */}
                      <div className="p-3 rounded-lg bg-[#161a26] border border-[#262c3e] space-y-2">
                        <span className="text-[10px] font-mono-code text-[#c5a059] font-bold block uppercase">
                          Pilar 1 (Personal & Potensi)
                        </span>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Judul Pilar 1</label>
                          <input
                            type="text"
                            value={editableSettings.profilePillar1Title ?? 'Personal Potential & Life Path'}
                            placeholder="Personal Potential & Life Path"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profilePillar1Title: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Deskripsi Singkat Pilar 1</label>
                          <textarea
                            rows={2}
                            value={editableSettings.profilePillar1Desc ?? 'Bespoke personal consultations utilizing Numerology, strategic alignment, and discrete life guidance.'}
                            placeholder="Deskripsi pilar 1..."
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profilePillar1Desc: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2c3347] text-slate-300 text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      {/* Pillar 2 */}
                      <div className="p-3 rounded-lg bg-[#161a26] border border-[#262c3e] space-y-2">
                        <span className="text-[10px] font-mono-code text-[#c5a059] font-bold block uppercase">
                          Pilar 2 (Sistem & Solusi Digital)
                        </span>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Judul Pilar 2</label>
                          <input
                            type="text"
                            value={editableSettings.profilePillar2Title ?? 'Enterprise Digital Solutions'}
                            placeholder="Enterprise Digital Solutions"
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profilePillar2Title: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2c3347] text-white text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono-code text-slate-400 mb-1">Deskripsi Singkat Pilar 2</label>
                          <textarea
                            rows={2}
                            value={editableSettings.profilePillar2Desc ?? 'Custom cloud architecture, high-performance web systems, and intelligent business automation.'}
                            placeholder="Deskripsi pilar 2..."
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                profilePillar2Desc: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2c3347] text-slate-300 text-xs font-mono-code"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveSettings('Profil, counter, pilar, dan teks header/footer berhasil disimpan!')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#c5a059] hover:bg-[#d8b368] text-black font-bold text-xs font-mono-code flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" /> SIMPAN PROFIL & STATISTIK
                  </button>
                </div>
              </div>
            )}

            {/* 4. TAB PORTFOLIO (PAGINATION 5 PER HALAMAN) */}
            {activeTab === 'portfolio' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      MANAJEMEN PORTFOLIO ({projects.length} PROYEK)
                    </h3>
                    <p className="text-xs text-[#c5a059] font-mono-code">
                      ★ Setiap halaman buku menampilkan 5 proyek. Jika melebihi 5, otomatis ditampilkan di halaman baru di sebelahnya.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingProject({
                        id: 'proj-' + Date.now(),
                        title: 'New Production Project',
                        category: 'Enterprise Solution',
                        coverImage:
                          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
                        gallery: [],
                        description: 'Executive summary deskripsi proyek...',
                        liveUrl: '',
                        technologies: ['TypeScript', 'React', 'Cloud Firestore'],
                        order: projects.length + 1,
                        visible: true,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] text-black font-semibold text-xs font-mono-code flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Tambah Proyek Baru
                  </button>
                </div>

                {/* Header & Footer Teks Halaman Portfolio */}
                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#212738] pb-2">
                    <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" /> TEKS HEADER & FOOTER HALAMAN PORTFOLIO
                    </h4>
                    <button
                      onClick={() => handleSaveSettings('Header & footer portfolio berhasil disimpan!')}
                      className="px-3 py-1 rounded bg-[#c5a059] hover:bg-[#d8b368] text-black text-[11px] font-mono-code font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Simpan Teks
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        TAGLINE / SUB-HEADING ATAS:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.portfolioTagline ?? 'CURATED WORKS'}
                        placeholder="CURATED WORKS"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            portfolioTagline: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        LABEL FOOTER KIRI:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.portfolioFooterLeft ?? 'PORTFOLIO ARCHIVE'}
                        placeholder="PORTFOLIO ARCHIVE"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            portfolioFooterLeft: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        LABEL FOOTER KANAN:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.portfolioFooterRight ?? 'Total Projects'}
                        placeholder="Total Projects"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            portfolioFooterRight: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Projects grouped by pages of 5 items */}
                <div className="space-y-4">
                  {Array.from({ length: Math.max(1, Math.ceil(projects.length / 5)) }).map((_, pageIdx) => {
                    const pageProjects = projects.slice(pageIdx * 5, (pageIdx + 1) * 5);
                    return (
                      <div
                        key={pageIdx}
                        className="p-3.5 rounded-xl bg-[#141722] border border-[#252b3d] space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-[#212738] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#c5a059] text-black font-mono-code font-bold text-[10px]">
                              HALAMAN BUKU #{pageIdx + 1}
                            </span>
                            <span className="text-xs font-mono-code text-slate-300">
                              (Proyek #{pageIdx * 5 + 1} - #{Math.min((pageIdx + 1) * 5, projects.length)})
                            </span>
                          </div>
                          <span className="text-[10px] font-mono-code text-slate-400">
                            {pageProjects.length}/5 Slot Terisi
                          </span>
                        </div>

                        <div className="space-y-2">
                          {pageProjects.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-lg bg-[#181c28] border border-[#2b3347] flex items-center justify-between gap-3 group hover:border-[#c5a059]/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono-code text-xs text-[#c5a059] font-bold w-5 text-center">
                                  {pageIdx * 5 + idx + 1}
                                </span>
                                <div className="w-12 h-10 rounded overflow-hidden bg-black shrink-0 border border-[#2f374c]">
                                  <img
                                    src={p.coverImage}
                                    alt={p.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-white truncate">{p.title}</h4>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono-code truncate">
                                    <span>{p.category}</span>
                                    {p.gallery && p.gallery.length > 0 && (
                                      <span className="text-[#c5a059]">
                                        • {p.gallery.length} Foto Galeri
                                      </span>
                                    )}
                                    {p.liveUrl && (
                                      <span className="text-green-400 flex items-center gap-0.5">
                                        • Live Link <ExternalLink className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center bg-[#131620] rounded p-0.5 border border-[#262c3e]">
                                  <button
                                    onClick={() => handleMoveProject(pageIdx * 5 + idx, 'up')}
                                    disabled={pageIdx * 5 + idx === 0}
                                    className="p-1 rounded text-slate-400 hover:text-[#c5a059] disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="Pindahkan ke atas"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveProject(pageIdx * 5 + idx, 'down')}
                                    disabled={pageIdx * 5 + idx === projects.length - 1}
                                    className="p-1 rounded text-slate-400 hover:text-[#c5a059] disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="Pindahkan ke bawah"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => setEditingProject(p)}
                                  className="p-1.5 rounded bg-[#202636] hover:bg-[#c5a059] hover:text-black text-slate-300 transition-colors cursor-pointer"
                                  title="Edit Project"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'project',
                                      id: p.id,
                                      title: p.title,
                                    })
                                  }
                                  className="p-1.5 rounded bg-[#202636] hover:bg-red-900/60 hover:text-red-300 text-slate-400 transition-colors cursor-pointer"
                                  title="Delete Project"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {pageProjects.length === 0 && (
                            <div className="p-4 text-center text-xs font-mono-code text-slate-400">
                              Halaman ini belum memiliki proyek. Klik "+ Tambah Proyek Baru" di atas.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. TAB SERVICES */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      MANAJEMEN SERVICES / LAYANAN ({services.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tambah, perbarui, atau hapus layanan arsitektur dan kapabilitas digital yang ditawarkan.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingService({
                        id: 'srv-' + Date.now(),
                        title: 'Layanan Baru',
                        description: 'Deskripsi layanan arsitektur sistem...',
                        iconName: 'Cpu',
                        order: services.length + 1,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] text-black font-semibold text-xs font-mono-code flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Tambah Layanan
                  </button>
                </div>

                {/* Header & Footer Teks Halaman Services */}
                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#212738] pb-2">
                    <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" /> TEKS HEADER & FOOTER HALAMAN SERVICES
                    </h4>
                    <button
                      onClick={() => handleSaveSettings('Header & footer services berhasil disimpan!')}
                      className="px-3 py-1 rounded bg-[#c5a059] hover:bg-[#d8b368] text-black text-[11px] font-mono-code font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Simpan Teks
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        TAGLINE / SUB-HEADING ATAS:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.servicesTagline ?? 'CORE CAPABILITIES'}
                        placeholder="CORE CAPABILITIES"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            servicesTagline: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        LABEL FOOTER KIRI:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.servicesFooterLeft ?? 'END-TO-END SUITE'}
                        placeholder="END-TO-END SUITE"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            servicesFooterLeft: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        LABEL FOOTER KANAN:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.servicesFooterRight ?? 'Explore Portfolio'}
                        placeholder="Explore Portfolio"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            servicesFooterRight: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((srv, idx) => (
                    <div
                      key={srv.id}
                      className="p-3.5 rounded-xl bg-[#141722] border border-[#252b3d] flex items-start justify-between gap-3 group hover:border-[#c5a059]/40 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code text-xs font-bold text-[#c5a059] px-2 py-0.5 rounded bg-[#1c2230] border border-[#2e374c] shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="p-1.5 rounded-lg bg-[#1c2230] text-[#c5a059] border border-[#2e374c] shrink-0">
                            <Cpu className="w-3.5 h-3.5" />
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                            {srv.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center bg-[#131620] rounded p-0.5 border border-[#262c3e]">
                          <button
                            onClick={() => handleMoveService(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-[#c5a059] disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                            title="Pindahkan layanan ke atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveService(idx, 'down')}
                            disabled={idx === services.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-[#c5a059] disabled:opacity-25 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                            title="Pindahkan layanan ke bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => setEditingService(srv)}
                          className="p-1.5 rounded bg-[#1f2537] hover:bg-[#c5a059] hover:text-black text-slate-300 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'service',
                              id: srv.id,
                              title: srv.title,
                            })
                          }
                          className="p-1.5 rounded bg-[#1f2537] hover:bg-red-900/60 hover:text-red-300 text-slate-400 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. TAB CASE STUDY */}
            {activeTab === 'casestudy' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      MANAJEMEN CASE STUDY ({caseStudies.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Kelola studi kasus mendalam untuk klien korporat (The Bottleneck, The Deployment, The ROI).
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingCaseStudy({
                        id: 'cs-' + Date.now(),
                        title: 'Unified Cloud POS & Autonomous Migration',
                        client: 'Corporate Retail Network',
                        category: 'Enterprise Cloud System',
                        summary: 'Ringkasan dampak transformasi arsitektur digital klien...',
                        challenge: 'Reconciliation took 48+ hours monthly due to duplicate manual logs.',
                        solution: 'Rolled out custom PWA cashier clients with automatic offline queueing.',
                        result: 'Shrinkage dropped to zero; real-time dashboard on mobile.',
                        coverImage:
                          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
                        order: caseStudies.length + 1,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] text-black font-semibold text-xs font-mono-code flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Tambah Case Study
                  </button>
                </div>

                {/* Header & Footer Teks Halaman Case Study */}
                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#212738] pb-2">
                    <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" /> TEKS HEADER & FOOTER HALAMAN CASE STUDY
                    </h4>
                    <button
                      onClick={() => handleSaveSettings('Header & footer case study berhasil disimpan!')}
                      className="px-3 py-1 rounded bg-[#c5a059] hover:bg-[#d8b368] text-black text-[11px] font-mono-code font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Simpan Teks
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        TAGLINE / SUB-HEADING ATAS:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.caseStudyTagline ?? 'ENTERPRISE ARCHITECTURE'}
                        placeholder="ENTERPRISE ARCHITECTURE"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            caseStudyTagline: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        LABEL FOOTER KIRI:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.caseStudyFooterLeft ?? 'CASE STUDY ARCHIVE'}
                        placeholder="CASE STUDY ARCHIVE"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            caseStudyFooterLeft: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                        LABEL FOOTER KANAN:
                      </label>
                      <input
                        type="text"
                        value={editableSettings.caseStudyFooterRight ?? 'ENTERPRISE ARCHITECTURE'}
                        placeholder="ENTERPRISE ARCHITECTURE"
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            caseStudyFooterRight: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {caseStudies.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-mono-code text-[#c5a059] font-bold uppercase">
                            {cs.client} // {cs.category}
                          </span>
                          <h4 className="font-bold text-sm text-white">{cs.title}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditingCaseStudy(cs)}
                            className="p-1.5 rounded bg-[#1f2537] hover:bg-[#c5a059] hover:text-black text-slate-300 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'casestudy',
                                id: cs.id,
                                title: cs.title,
                              })
                            }
                            className="p-1.5 rounded bg-[#1f2537] hover:bg-red-900/60 hover:text-red-300 text-slate-400 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{cs.summary}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono-code">
                        <div className="p-2 rounded bg-[#181c28] border border-[#282f42]">
                          <span className="text-slate-400 block text-[9px]">BOTTLENECK</span>
                          <span className="text-white line-clamp-1">{cs.challenge}</span>
                        </div>
                        <div className="p-2 rounded bg-[#181c28] border border-[#282f42]">
                          <span className="text-slate-400 block text-[9px]">DEPLOYMENT</span>
                          <span className="text-white line-clamp-1">{cs.solution}</span>
                        </div>
                        <div className="p-2 rounded bg-[#181c28] border border-[#282f42]">
                          <span className="text-[#c5a059] block text-[9px]">ROI & IMPACT</span>
                          <span className="text-white line-clamp-1">{cs.result}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {caseStudies.length === 0 && (
                    <div className="p-6 text-center text-xs font-mono-code text-slate-400 bg-[#141722] rounded-xl">
                      Belum ada Case Study. Klik tombol "+ Tambah Case Study" di atas.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. TAB SETTINGS & WHATSAPP TEMPLATE */}
            {activeTab === 'settings' && (
              <div className="space-y-5 max-w-3xl">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    PENGATURAN WHATSAPP & SISTEM
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kustomisasi nomor kontak WhatsApp, template pesan otomatis saat klien klik "Send Message", akun sosial, serta ganti password admin.
                  </p>
                </div>

                {/* WhatsApp & Message Template Section */}
                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3.5">
                  <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> WHATSAPP DIRECT TRANSMISSION & TEMPLATE
                  </h4>

                  <div>
                    <label className="block text-[11px] font-mono-code text-slate-300 font-bold mb-1">
                      NOMOR WHATSAPP PENERIMA (DENGAN KODE NEGARA, CONTOH: 6281234567890)
                    </label>
                    <input
                      type="text"
                      value={editableSettings.whatsapp || ''}
                      placeholder="6281234567890"
                      onChange={(e) =>
                        setEditableSettings({
                          ...editableSettings,
                          whatsapp: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono-code text-slate-300 font-bold">
                        TEMPLATE PESAN WHATSAPP (BISA DI-EDIT)
                      </label>
                      <span className="text-[10px] font-mono-code text-[#c5a059]">
                        Gunakan tag: {'{name}'}, {'{subject}'}, {'{message}'}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={
                        editableSettings.whatsappMessageTemplate ||
                        'Halo Berly, nama saya {name}. Saya ingin berkonsultasi mengenai {subject}.\n\nPesan:\n{message}'
                      }
                      onChange={(e) =>
                        setEditableSettings({
                          ...editableSettings,
                          whatsappMessageTemplate: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none resize-none"
                    />
                  </div>

                  {/* Live Template WhatsApp Preview */}
                  <div className="p-3 rounded-xl bg-[#0e1017] border border-[#212636] space-y-1">
                    <span className="text-[10px] font-mono-code text-slate-400 block">
                      SIMULASI PESAN YANG AKAN DITERIMA DI WHATSAPP:
                    </span>
                    <div className="p-2 rounded-lg bg-[#19231c] border border-[#22442e] text-xs font-mono-code text-emerald-200 whitespace-pre-wrap">
                      {(
                        editableSettings.whatsappMessageTemplate ||
                        'Halo Berly, nama saya {name}. Saya ingin berkonsultasi mengenai {subject}.\n\nPesan:\n{message}'
                      )
                        .replace(/{name}/g, 'Budi Santoso')
                        .replace(/{subject}/g, 'Pengembangan Web App')
                        .replace(/{message}/g, 'Halo, kami memerlukan sistem POS terintegrasi.')}
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                        LINKEDIN URL
                      </label>
                      <input
                        type="url"
                        value={editableSettings.linkedin || ''}
                        placeholder="https://linkedin.com/in/..."
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, linkedin: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                        INSTAGRAM URL
                      </label>
                      <input
                        type="url"
                        value={editableSettings.instagram || ''}
                        placeholder="https://instagram.com/..."
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, instagram: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                        GITHUB URL
                      </label>
                      <input
                        type="url"
                        value={editableSettings.github || ''}
                        placeholder="https://github.com/..."
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, github: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                      />
                    </div>
                  </div>

                  {/* Header & Footer Teks Halaman Contact */}
                  <div className="pt-3 border-t border-[#252b3d] space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5" /> TEKS HEADER & FOOTER HALAMAN CONTACT
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono-code">Dinamis Buku</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                          TAGLINE / SUB-HEADING ATAS:
                        </label>
                        <input
                          type="text"
                          value={editableSettings.contactTagline ?? 'DIRECT TRANSMISSION'}
                          placeholder="DIRECT TRANSMISSION"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              contactTagline: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                          LABEL FOOTER KIRI:
                        </label>
                        <input
                          type="text"
                          value={editableSettings.contactFooterLeft ?? 'DIRECT TRANSMISSION'}
                          placeholder="DIRECT TRANSMISSION"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              contactFooterLeft: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-code text-slate-300 font-bold mb-1">
                          LABEL FOOTER KANAN:
                        </label>
                        <input
                          type="text"
                          value={editableSettings.contactFooterRight ?? 'SECURE DISPATCH'}
                          placeholder="SECURE DISPATCH"
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              contactFooterRight: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DAFTAR PILIHAN SUBJEK / KEBUTUHAN FORMULIR KONTAK */}
                  <div className="pt-3 border-t border-[#252b3d] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-[11px] font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> DAFTAR PILIHAN SUBJEK / KEBUTUHAN FORMULIR KONTAK
                        </h5>
                        <p className="text-[10px] text-slate-400">
                          Pilihan dropdown yang muncul saat pengunjung mengisi form kontak buku.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#1f2537] text-[#c5a059]">
                        {(editableSettings.contactSubjects || ['Virtual Assistant', 'Konsultasi Numerologi', 'Web Development']).length} Pilihan
                      </span>
                    </div>

                    {/* Subject Pills list */}
                    <div className="flex flex-wrap gap-2">
                      {(editableSettings.contactSubjects || ['Virtual Assistant', 'Konsultasi Numerologi', 'Web Development']).map((subj, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181d2a] border border-[#2d354a] text-xs font-mono-code text-slate-200"
                        >
                          <span className="text-[#c5a059] font-bold">#{idx + 1}</span>
                          <span>{subj}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const current = editableSettings.contactSubjects || ['Virtual Assistant', 'Konsultasi Numerologi', 'Web Development'];
                              const updated = current.filter((_, i) => i !== idx);
                              setEditableSettings({
                                ...editableSettings,
                                contactSubjects: updated,
                              });
                            }}
                            className="ml-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title={`Hapus opsi "${subj}"`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new subject input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Ketik nama subjek / layanan baru (e.g. Audit SEO, Konsultasi Bisnis)..."
                        value={newSubjectInput}
                        onChange={(e) => setNewSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSubjectInput.trim()) {
                              const current = editableSettings.contactSubjects || ['Virtual Assistant', 'Konsultasi Numerologi', 'Web Development'];
                              if (!current.includes(newSubjectInput.trim())) {
                                setEditableSettings({
                                  ...editableSettings,
                                  contactSubjects: [...current, newSubjectInput.trim()],
                                });
                                setNewSubjectInput('');
                              }
                            }
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSubjectInput.trim()) return;
                          const current = editableSettings.contactSubjects || ['Virtual Assistant', 'Konsultasi Numerologi', 'Web Development'];
                          if (current.includes(newSubjectInput.trim())) {
                            showToast('Pilihan subjek ini sudah ada!');
                            return;
                          }
                          setEditableSettings({
                            ...editableSettings,
                            contactSubjects: [...current, newSubjectInput.trim()],
                          });
                          setNewSubjectInput('');
                          showToast('Subjek baru ditambahkan!');
                        }}
                        className="px-4 py-1.5 rounded-lg bg-[#1e2434] hover:bg-[#c5a059] text-slate-200 hover:text-black font-bold text-xs font-mono-code transition-colors cursor-pointer border border-[#2f384f]"
                      >
                        + Tambah Subjek
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveSettings('Pengaturan kontak, subjek dropdown, dan teks berhasil disimpan!')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#c5a059] hover:bg-[#d8b368] text-black font-bold text-xs font-mono-code flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" /> SIMPAN PENGATURAN KONTAK
                  </button>
                </div>

                {/* Change Admin Password */}
                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3">
                  <h4 className="text-xs font-bold font-mono-code text-[#c5a059] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> UBAH MASTER PASSWORD ADMIN
                  </h4>

                  {passwordStatusMsg && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-mono-code ${
                        passwordStatusType === 'success'
                          ? 'bg-green-950/60 border border-green-800 text-green-300'
                          : 'bg-red-950/60 border border-red-800 text-red-300'
                      }`}
                    >
                      {passwordStatusMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-400 mb-1">
                        PASSWORD BARU
                      </label>
                      <input
                        type="password"
                        placeholder="Minimal 6 karakter..."
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono-code text-slate-400 mb-1">
                        KONFIRMASI PASSWORD BARU
                      </label>
                      <input
                        type="password"
                        placeholder="Ulangi password baru..."
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      setPasswordStatusMsg('');
                      if (!newAdminPassword || newAdminPassword.length < 6) {
                        setPasswordStatusType('error');
                        setPasswordStatusMsg('Password minimal harus 6 karakter.');
                        return;
                      }
                      if (newAdminPassword !== confirmAdminPassword) {
                        setPasswordStatusType('error');
                        setPasswordStatusMsg('Konfirmasi password tidak cocok.');
                        return;
                      }

                      try {
                        await AuthService.updateAdminPassword(newAdminPassword);
                        setPasswordStatusType('success');
                        setPasswordStatusMsg('Master password berhasil diperbarui!');
                        setNewAdminPassword('');
                        setConfirmAdminPassword('');
                        showToast('Password admin diperbarui!');
                      } catch {
                        setPasswordStatusType('error');
                        setPasswordStatusMsg('Gagal memperbarui password admin.');
                      }
                    }}
                    className="py-2 px-4 rounded-lg bg-[#1e2434] hover:bg-[#c5a059] text-slate-200 hover:text-black font-bold text-xs font-mono-code transition-colors cursor-pointer border border-[#2f384f]"
                  >
                    Perbarui Password Admin
                  </button>
                </div>
              </div>
            )}

            {/* 8. TAB MESSAGES */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      INCOMING INQUIRIES & TRANSMISSIONS
                    </h3>
                    <p className="text-xs text-slate-400">
                      Pesan masuk dari calon klien via formulir kontak buku. Kelola status, nomor WA, dan catatan negosiasi.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsLoadingMessages(true);
                      DataService.getMessages().then((msgs) => {
                        setMessages(msgs);
                        setIsLoadingMessages(false);
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1c2230] hover:bg-[#252d40] text-slate-300 hover:text-white text-xs font-mono-code flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {isLoadingMessages ? (
                  <div className="p-8 text-center text-xs font-mono-code text-slate-400">
                    Memuat daftar pesan...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono-code text-slate-400 bg-[#141722] rounded-xl border border-[#222838]">
                    Belum ada pesan yang masuk.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      // Normalize WhatsApp number for direct click
                      const rawPhone = m.whatsapp || '';
                      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                      const formattedWaNumber = cleanPhone.startsWith('0')
                        ? '62' + cleanPhone.slice(1)
                        : cleanPhone;

                      const waGreeting = encodeURIComponent(
                        `Halo ${m.name}, terima kasih telah menghubungi kami melalui portofolio Berly. Terkait pesan Anda: "${m.message.slice(0, 80)}${m.message.length > 80 ? '...' : ''}", apakah ada waktu yang pas untuk kita diskusikan lebih lanjut?`
                      );
                      const waChatUrl = formattedWaNumber
                        ? `https://wa.me/${formattedWaNumber}?text=${waGreeting}`
                        : '';

                      return (
                        <div
                          key={m.id}
                          className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] hover:border-[#3b445e] transition-colors space-y-3"
                        >
                          {/* Top Row: Sender Info, Status Badge & Action Controls */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2536] pb-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-sm tracking-wide">{m.name}</span>

                              {/* WhatsApp Contact Badge & Direct Chat Button */}
                              {m.whatsapp ? (
                                <a
                                  href={waChatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e2a1b] hover:bg-[#153f28] border border-emerald-500/40 text-emerald-400 font-mono-code text-xs font-bold transition-colors cursor-pointer group"
                                  title="Klik untuk langsung chat WhatsApp dengan pesan pembuka otomatis"
                                >
                                  <Phone className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                  <span>+{formattedWaNumber}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-emerald-400/70" />
                                </a>
                              ) : (
                                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#1e2434] text-slate-400">
                                  Tanpa No WA
                                </span>
                              )}

                              {/* Email if available */}
                              {m.email && (
                                <a
                                  href={`mailto:${m.email}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono-code text-slate-400 hover:text-white transition-colors"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>{m.email}</span>
                                </a>
                              )}

                              {/* Subject Badge if available */}
                              {m.subject && (
                                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#1e2434] text-[#c5a059] border border-[#30384f] font-semibold">
                                  {m.subject}
                                </span>
                              )}

                              {/* Status Badge */}
                              <span
                                className={`text-[10px] font-mono-code px-2 py-0.5 rounded border uppercase tracking-wider ${
                                  m.status === 'contacted'
                                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                                    : m.status === 'resolved'
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                    : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                }`}
                              >
                                {m.status === 'contacted'
                                  ? 'Sudah Dihubungi'
                                  : m.status === 'resolved'
                                  ? 'Selesai'
                                  : 'Baru'}
                              </span>
                            </div>

                            {/* Action Buttons (Edit, Delete, Timestamp) */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">
                                {new Date(m.createdAt).toLocaleDateString()} •{' '}
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>

                              {/* Edit / View Details Button */}
                              <button
                                type="button"
                                onClick={() => setEditingMessage(m)}
                                className="px-2 py-1 rounded bg-[#1b2030] hover:bg-[#283047] text-[#c5a059] hover:text-[#ffd680] text-xs font-mono-code font-bold flex items-center gap-1 cursor-pointer transition-colors border border-[#2e374f]"
                                title="Lihat detail lengkap, ubah nomor WA, atau tambahkan catatan"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit / Detail</span>
                              </button>

                              {/* Delete Message Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'message',
                                    id: m.id,
                                    title: m.name,
                                  })
                                }
                                className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 text-xs font-mono-code flex items-center gap-1 cursor-pointer transition-colors border border-red-900/50"
                                title="Hapus pesan ini dari inbox"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>

                          {/* Message Body */}
                          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#0d1017] p-3 rounded-lg border border-[#1b202d]">
                            {m.message}
                          </div>

                          {/* Internal Follow-up Notes if any */}
                          {m.notes && (
                            <div className="text-[11px] font-mono-code text-amber-200/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg flex items-start gap-2">
                              <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-amber-300">Catatan Internal: </span>
                                <span>{m.notes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 9. TAB PAGES MANAGER */}
            {activeTab === 'pages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">Page Manager</h3>
                    <p className="text-xs text-slate-400">
                      Total {pages.length} halaman terdaftar dalam volume buku.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-[#141722] border border-[#252b3d] flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono-code text-[#c5a059] font-bold w-6">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white">{p.title}</div>
                          <div className="text-[10px] font-mono-code text-slate-400">
                            Tipe: {p.pageType} • {p.visible ? 'Ditampilkan' : 'Disembunyikan'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            await DataService.savePage({
                              ...p,
                              visible: !p.visible,
                            });
                            onDataUpdated();
                            showToast(p.visible ? 'Halaman disembunyikan' : 'Halaman ditampilkan');
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            p.visible
                              ? 'bg-[#1e2436] text-[#c5a059] hover:bg-[#252e44]'
                              : 'bg-[#1a1c24] text-slate-500 hover:text-white'
                          }`}
                          title={p.visible ? 'Hide page' : 'Show page'}
                        >
                          {p.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingPage(p)}
                          className="p-1.5 rounded bg-[#1e2436] text-slate-300 hover:bg-[#c5a059] hover:text-black transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. TAB FIREBASE CONFIG */}
            {activeTab === 'firebase' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-base font-bold font-display text-white">FIREBASE SYNC & BACKUP</h3>
                  <p className="text-xs text-slate-400">
                    Sistem mendukung persistensi otomatis dengan fallback transparan ke browser storage dan opsi export/import cadangan data.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3 text-xs font-mono-code">
                  <div className="flex justify-between items-center pb-2 border-b border-[#212738]">
                    <span className="text-slate-400">Status Database:</span>
                    <span className="font-bold text-green-400">
                      {isFirebaseConfigured()
                        ? 'Connected to Google Cloud Firestore (Live Real-time)'
                        : 'Database Terkoneksi & Siap Sinkronisasi'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Semua perubahan yang Anda buat di Dashboard Admin ini langsung disimpan secara persisten. Jika Firebase credentials tersedia di environment atau dikonfigurasi, data otomatis tersinkronisasi ke Cloud Firestore secara instan.
                  </div>
                </div>

                {/* Backup Data Export & Import */}
                <div className="p-4 rounded-xl bg-[#141722] border border-[#252b3d] space-y-3 text-xs">
                  <h4 className="font-bold text-white font-mono-code text-[#c5a059] flex items-center gap-2">
                    <Database className="w-4 h-4" /> CADANGAN DATA LENGKAP (BACKUP & RESTORE)
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Anda dapat mengunduh seluruh data (foto, profil, proyek, teks, layanan, kontak) dalam format file JSON untuk dipindahkan ke domain lain atau dijadikan cadangan data.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const backupData = {
                          settings: editableSettings,
                          projects,
                          services,
                          pages,
                          caseStudies,
                          exportedAt: new Date().toISOString(),
                        };
                        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `berly-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast('Cadangan data JSON berhasil diunduh!');
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] text-black font-bold font-mono-code text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-180" /> Unduh Cadangan JSON (Export)
                    </button>

                    <label className="px-3.5 py-2 rounded-lg bg-[#1e2434] hover:bg-[#2b334a] text-slate-200 border border-[#2f384f] font-mono-code text-xs flex items-center gap-2 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5 text-[#c5a059]" /> Pulihkan dari File JSON (Import)
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const parsed = JSON.parse(event.target?.result as string);
                              if (parsed.settings) await DataService.saveSettings(parsed.settings);
                              if (Array.isArray(parsed.projects)) {
                                for (const p of parsed.projects) await DataService.saveProject(p);
                              }
                              if (Array.isArray(parsed.services)) {
                                for (const s of parsed.services) await DataService.saveService(s);
                              }
                              if (Array.isArray(parsed.pages)) {
                                for (const pg of parsed.pages) await DataService.savePage(pg);
                              }
                              onDataUpdated();
                              showToast('Data berhasil dipulihkan dari file JSON!');
                            } catch {
                              showToast('Format file JSON tidak valid.');
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- PROJECT EDIT MODAL --- */}
      {editingProject && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingProject(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#12151f] border border-[#272d3e] rounded-2xl p-6 text-white text-xs space-y-3.5 my-8"
          >
            <div className="flex items-center justify-between border-b border-[#202536] pb-2">
              <div>
                <h4 className="font-bold text-sm">
                  {editingProject.id?.startsWith('proj-') && !editingProject.title
                    ? 'Tambah Proyek Baru'
                    : `Edit Proyek: ${editingProject.title || ''}`}
                </h4>
                <p className="text-[10px] text-[#c5a059] font-mono-code">
                  Setiap halaman hanya memuat 5 proyek. Di halaman buku hanya tampil: Foto Cover & 3 Galeri, Executive Summary, dan Tombol Open Live Project.
                </p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-mono-code mb-1">TITLE PROYEK *</label>
                <input
                  type="text"
                  value={editingProject.title || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  placeholder="e.g. Apex Omnichannel Commerce"
                  className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-mono-code mb-1">KATEGORI *</label>
                <input
                  type="text"
                  value={editingProject.category || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                  placeholder="e.g. Enterprise Cloud POS"
                  className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
                />
              </div>
            </div>

            {/* COVER IMAGE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-mono-code font-bold text-[11px] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#c5a059]" />
                  COVER IMAGE URL *
                </label>
                <span className="text-[10px] text-slate-400 font-mono-code">Rasio 16:9 disarankan</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={editingProject.coverImage || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, coverImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white text-xs font-mono-code"
                />
                <label className="px-3 py-1.5 rounded bg-[#1f2537] hover:bg-[#c5a059] text-slate-200 hover:text-black font-mono-code text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-[#2f384f] transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Upload & Crop</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const result = ev.target?.result as string;
                        if (result) {
                          setProjectCropState({
                            isOpen: true,
                            imageSrc: result,
                            title: 'Sesuaikan Foto Sampul Proyek (16:9)',
                            description: 'Atur zoom besar/kecil & geser posisi cover agar tampilan judul/gambar tidak terpotong',
                            target: 'cover',
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {editingProject.coverImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectCropState({
                        isOpen: true,
                        imageSrc: editingProject.coverImage!,
                        title: 'Sesuaikan Ulang Foto Sampul Proyek (16:9)',
                        description: 'Atur zoom besar/kecil & geser posisi cover proyek',
                        target: 'cover',
                      });
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#182030] hover:bg-[#c5a059] text-[#c5a059] hover:text-black font-mono-code text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-[#c5a059]/40 transition-colors"
                    title="Crop & Zoom Foto Sampul"
                  >
                    <Crop className="w-3 h-3" />
                    <span>Crop & Zoom</span>
                  </button>
                )}
              </div>

              {/* Cover Image Preview Card */}
              {editingProject.coverImage && (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#2c3347] bg-[#0c0e14] mt-2 group">
                  <img
                    src={editingProject.coverImage}
                    alt="Cover Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectCropState({
                          isOpen: true,
                          imageSrc: editingProject.coverImage!,
                          title: 'Sesuaikan Ulang Foto Sampul Proyek (16:9)',
                          description: 'Atur zoom besar/kecil & geser posisi cover proyek',
                          target: 'cover',
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#c5a059] hover:bg-[#d4af37] text-black font-mono-code font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-transform hover:scale-105"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Crop / Sesuaikan Tampilan (Zoom & Posisi)</span>
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[9px] font-mono-code text-[#c5a059] border border-white/10">
                    Preview Sampul (16:9)
                  </div>
                </div>
              )}
            </div>

            {/* LIVE PROJECT URL INPUT */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-mono-code font-bold text-[11px] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]" />
                  URL LINK LIVE PROJECT (TOMBOL OPEN LIVE PROJECT)
                </label>
                <span className="text-[10px] text-slate-400 font-mono-code">Opsional</span>
              </div>
              <input
                type="url"
                placeholder="https://example.com/project-live"
                value={editingProject.liveUrl || editingProject.externalUrl || ''}
                onChange={(e) =>
                  setEditingProject({
                    ...editingProject,
                    liveUrl: e.target.value,
                    externalUrl: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none font-mono-code"
              />
            </div>

            {/* PROJECT GALLERY (MAX 3 PHOTOS) */}
            <div className="p-3 rounded-xl bg-[#151824] border border-[#262c3e] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-mono-code font-bold text-[11px] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#c5a059]" />
                  GALERI FOTO PROYEK (MAKSIMAL 3 FOTO TAMBAHAN)
                </label>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#1f2537] text-[#c5a059]">
                  {(editingProject.gallery || []).length}/3 Foto
                </span>
              </div>

              {/* Thumbnails of current gallery items */}
              {(editingProject.gallery || []).length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(editingProject.gallery || []).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg overflow-hidden border border-[#2b3347] bg-black h-24 group"
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProjectCropState({
                              isOpen: true,
                              imageSrc: imgUrl,
                              title: `Sesuaikan Foto Galeri #${idx + 1} (16:9)`,
                              description: 'Atur zoom besar/kecil & geser posisi foto galeri',
                              target: { galleryIndex: idx },
                            });
                          }}
                          className="px-2 py-1 rounded bg-[#c5a059] hover:bg-[#d4af37] text-black text-[10px] font-mono-code font-bold flex items-center gap-1 cursor-pointer w-full justify-center transition-colors"
                          title="Crop & Zoom Foto Galeri"
                        >
                          <Crop className="w-3 h-3" /> Crop & Zoom
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingProject.gallery || []).filter((_, i) => i !== idx);
                            setEditingProject({ ...editingProject, gallery: updated });
                          }}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-mono-code flex items-center gap-1 cursor-pointer w-full justify-center transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono-code text-[#c5a059] border border-white/10">
                        Foto #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo controls if < 3 photos */}
              {(editingProject.gallery || []).length < 3 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Masukkan URL foto tambahan..."
                      value={galleryInputUrl}
                      onChange={(e) => setGalleryInputUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded bg-[#10131d] border border-[#2a3044] text-white text-xs font-mono-code"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!galleryInputUrl.trim()) return;
                        const current = editingProject.gallery || [];
                        if (current.length >= 3) return;
                        setEditingProject({
                          ...editingProject,
                          gallery: [...current, galleryInputUrl.trim()],
                        });
                        setGalleryInputUrl('');
                      }}
                      className="px-3 py-1.5 rounded bg-[#1e2332] hover:bg-[#c5a059] text-slate-200 hover:text-black font-mono-code font-bold text-xs transition-colors cursor-pointer border border-[#30384d]"
                    >
                      + Tambah URL
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded bg-[#181d2a] hover:bg-[#c5a059] border border-[#2b3347] text-slate-300 hover:text-black font-mono-code text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Upload & Crop Foto Dari Komputer (#{((editingProject.gallery || []).length) + 1})</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const current = editingProject.gallery || [];
                          if (current.length >= 3) return;

                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const result = ev.target?.result as string;
                            if (result) {
                              setProjectCropState({
                                isOpen: true,
                                imageSrc: result,
                                title: `Sesuaikan Foto Galeri #${current.length + 1} (16:9)`,
                                description: 'Atur zoom besar/kecil & geser posisi foto dokumentasi proyek',
                                target: 'gallery-new',
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#c5a059] font-mono-code">
                  ✓ Maksimal 3 foto tambahan tercapai.
                </p>
              )}
            </div>

            {/* EXECUTIVE SUMMARY / DESKRIPSI */}
            <div>
              <label className="block text-slate-400 font-mono-code mb-1">
                EXECUTIVE SUMMARY / DESKRIPSI PROYEK *
              </label>
              <textarea
                rows={3}
                value={editingProject.description || editingProject.shortDescription || ''}
                onChange={(e) =>
                  setEditingProject({
                    ...editingProject,
                    description: e.target.value,
                    shortDescription: e.target.value,
                  })
                }
                placeholder="Tuliskan ringkasan eksekutif proyek..."
                className="w-full p-2.5 rounded bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#202536]">
              <button
                onClick={() => setEditingProject(null)}
                className="px-3 py-1.5 rounded bg-[#1e2332] text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingProject && editingProject.title) {
                    try {
                      const projToSave: PortfolioProject = {
                        ...(editingProject as PortfolioProject),
                        gallery: Array.isArray(editingProject.gallery) ? editingProject.gallery : [],
                      };
                      await DataService.saveProject(projToSave);
                      await onDataUpdated();
                      setEditingProject(null);
                      showToast('Proyek berhasil disimpan!');
                    } catch (saveErr) {
                      console.error('Error saving project:', saveErr);
                      showToast('Gagal menyimpan proyek: ' + String(saveErr));
                    }
                  }
                }}
                className="px-4 py-1.5 rounded bg-[#c5a059] text-black font-bold font-mono-code cursor-pointer hover:bg-[#d4af37] transition-colors"
              >
                Simpan Proyek
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SERVICE EDIT MODAL --- */}
      {editingService && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setEditingService(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12151f] border border-[#272d3e] rounded-2xl p-6 text-white text-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#202536] pb-2">
              <h4 className="font-bold text-sm">
                {editingService.id?.startsWith('srv-') ? 'Tambah Layanan' : 'Edit Layanan'}
              </h4>
              <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">JUDUL LAYANAN *</label>
              <input
                type="text"
                value={editingService.title || ''}
                onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">ICON</label>
              <select
                value={editingService.iconName || 'Cpu'}
                onChange={(e) => setEditingService({ ...editingService, iconName: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white font-mono-code"
              >
                <option value="Globe">Globe (Web Architecture)</option>
                <option value="Cpu">Cpu (Full-Stack Engineering)</option>
                <option value="Sparkles">Sparkles (Creative / AI)</option>
                <option value="BarChart3">BarChart3 (Analytics / ROI)</option>
                <option value="Store">Store (Omnichannel Commerce)</option>
                <option value="Layers">Layers (System Infrastructure)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">DESKRIPSI *</label>
              <textarea
                rows={3}
                value={editingService.description || ''}
                onChange={(e) =>
                  setEditingService({ ...editingService, description: e.target.value })
                }
                className="w-full p-2 rounded bg-[#161a26] border border-[#2c3347] text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#202536]">
              <button
                onClick={() => setEditingService(null)}
                className="px-3 py-1.5 rounded bg-[#1e2332] text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingService && editingService.title) {
                    await DataService.saveService(editingService as PortfolioService);
                    onDataUpdated();
                    setEditingService(null);
                    showToast('Layanan tersimpan!');
                  }
                }}
                className="px-4 py-1.5 rounded bg-[#c5a059] text-black font-bold font-mono-code cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CASE STUDY EDIT MODAL --- */}
      {editingCaseStudy && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingCaseStudy(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#12151f] border border-[#272d3e] rounded-2xl p-6 text-white text-xs space-y-3 my-8"
          >
            <div className="flex items-center justify-between border-b border-[#202536] pb-2">
              <h4 className="font-bold text-sm">
                {editingCaseStudy.id?.startsWith('cs-') ? 'Tambah Case Study' : 'Edit Case Study'}
              </h4>
              <button
                onClick={() => setEditingCaseStudy(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-mono-code mb-1">JUDUL CASE STUDY *</label>
                <input
                  type="text"
                  value={editingCaseStudy.title || ''}
                  onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, title: e.target.value })}
                  placeholder="e.g. Unified Cloud POS"
                  className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-mono-code mb-1">PROFIL KLIEN *</label>
                <input
                  type="text"
                  value={editingCaseStudy.client || ''}
                  onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, client: e.target.value })}
                  placeholder="e.g. Retail Chain Indonesia"
                  className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">RINGKASAN EKSEKUTIF *</label>
              <textarea
                rows={2}
                value={editingCaseStudy.summary || ''}
                onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, summary: e.target.value })}
                className="w-full p-2 rounded bg-[#161a26] border border-[#2c3347] text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">
                01. THE BOTTLENECK (TANTANGAN) *
              </label>
              <textarea
                rows={2}
                value={editingCaseStudy.challenge || ''}
                onChange={(e) =>
                  setEditingCaseStudy({ ...editingCaseStudy, challenge: e.target.value })
                }
                className="w-full p-2 rounded bg-[#161a26] border border-[#2c3347] text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">
                02. THE DEPLOYMENT (SOLUSI ENJINIRING) *
              </label>
              <textarea
                rows={2}
                value={editingCaseStudy.solution || ''}
                onChange={(e) =>
                  setEditingCaseStudy({ ...editingCaseStudy, solution: e.target.value })
                }
                className="w-full p-2 rounded bg-[#161a26] border border-[#2c3347] text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">
                03. THE ROI & HASIL AKHIR *
              </label>
              <textarea
                rows={2}
                value={editingCaseStudy.result || ''}
                onChange={(e) => setEditingCaseStudy({ ...editingCaseStudy, result: e.target.value })}
                className="w-full p-2 rounded bg-[#161a26] border border-[#2c3347] text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#202536]">
              <button
                onClick={() => setEditingCaseStudy(null)}
                className="px-3 py-1.5 rounded bg-[#1e2332] text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingCaseStudy && editingCaseStudy.title) {
                    await DataService.saveCaseStudy(editingCaseStudy as CaseStudyItem);
                    loadCaseStudies();
                    setEditingCaseStudy(null);
                    showToast('Case Study berhasil disimpan!');
                  }
                }}
                className="px-4 py-1.5 rounded bg-[#c5a059] text-black font-bold font-mono-code cursor-pointer"
              >
                Simpan Case Study
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PAGE EDIT MODAL --- */}
      {editingPage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setEditingPage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12151f] border border-[#272d3e] rounded-2xl p-6 text-white text-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#202536] pb-2">
              <h4 className="font-bold text-sm">Edit Page #{editingPage.pageNumber}</h4>
              <button onClick={() => setEditingPage(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">TITLE</label>
              <input
                type="text"
                value={editingPage.title || ''}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">SUBTITLE</label>
              <input
                type="text"
                value={editingPage.subtitle || ''}
                onChange={(e) => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#161a26] border border-[#2c3347] text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono-code mb-1">CONTENT</label>
              <textarea
                rows={4}
                value={editingPage.content || ''}
                onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                className="w-full p-2 rounded bg-[#161a26] border border-[#2c3347] text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#202536]">
              <button
                onClick={() => setEditingPage(null)}
                className="px-3 py-1.5 rounded bg-[#1e2332] text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingPage) {
                    await DataService.savePage(editingPage as PortfolioPage);
                    onDataUpdated();
                    setEditingPage(null);
                    showToast('Halaman tersimpan!');
                  }
                }}
                className="px-4 py-1.5 rounded bg-[#c5a059] text-black font-bold font-mono-code"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MESSAGE EDIT & DETAIL MODAL --- */}
      {editingMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#12151f] border border-[#272d3e] rounded-2xl p-6 text-white text-xs space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#202536] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#1d2333] text-[#c5a059]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Detail & Edit Pesan Calon Klien</h4>
                  <p className="text-[11px] font-mono-code text-slate-400">
                    ID: {editingMessage.id} • Diterima: {new Date(editingMessage.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingMessage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1a202e] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Client Name */}
                <div>
                  <label className="block text-slate-400 font-mono-code mb-1">NAMA CALON KLIEN</label>
                  <input
                    type="text"
                    value={editingMessage.name || ''}
                    onChange={(e) => setEditingMessage({ ...editingMessage, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none"
                  />
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label className="block text-slate-400 font-mono-code mb-1 flex items-center justify-between">
                    <span>NOMOR WHATSAPP</span>
                    <span className="text-[10px] text-[#c5a059]">Awali 62 / 08</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editingMessage.whatsapp || ''}
                      onChange={(e) => setEditingMessage({ ...editingMessage, whatsapp: e.target.value })}
                      placeholder="contoh: 6283866677296"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none font-mono-code"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email */}
                <div>
                  <label className="block text-slate-400 font-mono-code mb-1">EMAIL KLIEN</label>
                  <input
                    type="email"
                    value={editingMessage.email || ''}
                    onChange={(e) => setEditingMessage({ ...editingMessage, email: e.target.value })}
                    placeholder="email@domain.com"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none"
                  />
                </div>

                {/* Follow-up Status */}
                <div>
                  <label className="block text-slate-400 font-mono-code mb-1">STATUS PENANGANAN</label>
                  <select
                    value={editingMessage.status || 'new'}
                    onChange={(e) =>
                      setEditingMessage({
                        ...editingMessage,
                        status: e.target.value as 'new' | 'contacted' | 'resolved',
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none"
                  >
                    <option value="new">Baru (Belum Dihubungi)</option>
                    <option value="contacted">Sudah Dihubungi (Follow Up)</option>
                    <option value="resolved">Selesai / Deal</option>
                  </select>
                </div>
              </div>

              {/* Subjek / Kebutuhan */}
              <div>
                <label className="block text-slate-400 font-mono-code mb-1">KEBUTUHAN / SUBJEK LAYANAN</label>
                <input
                  type="text"
                  value={editingMessage.subject || ''}
                  onChange={(e) => setEditingMessage({ ...editingMessage, subject: e.target.value })}
                  placeholder="e.g. Web Development, Virtual Assistant..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-slate-400 font-mono-code mb-1">ISI PESAN / BRIEF DARI KLIEN</label>
                <textarea
                  rows={4}
                  value={editingMessage.message || ''}
                  onChange={(e) => setEditingMessage({ ...editingMessage, message: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-slate-400 font-mono-code mb-1 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>CATATAN INTERNAL ADMIN (HASIL CHAT / FOLLOW UP)</span>
                </label>
                <textarea
                  rows={2}
                  value={editingMessage.notes || ''}
                  onChange={(e) => setEditingMessage({ ...editingMessage, notes: e.target.value })}
                  placeholder="Contoh: Klien berminat paket Website Portfolio, jadwal presentasi hari Kamis jam 14.00..."
                  className="w-full p-2.5 rounded-lg bg-[#161a26] border border-[#2c3347] text-white focus:border-[#c5a059] focus:outline-none"
                />
              </div>

              {/* Quick WhatsApp Action Button inside modal */}
              {editingMessage.whatsapp && (
                <div className="pt-1">
                  {(() => {
                    const cleanPhone = (editingMessage.whatsapp || '').replace(/[^0-9]/g, '');
                    const formatted = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                    const text = encodeURIComponent(
                      `Halo ${editingMessage.name}, terima kasih telah menghubungi kami. Terkait pesan: "${editingMessage.message.slice(0, 80)}...", apakah ada waktu luang untuk berdiskusi?`
                    );
                    return (
                      <a
                        href={`https://wa.me/${formatted}?text=${text}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-lg bg-[#0e2a1b] hover:bg-[#153f28] border border-emerald-500/40 text-emerald-400 font-mono-code text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Buka Chat WhatsApp Sekarang (+{formatted})</span>
                        <ExternalLink className="w-3 h-3 text-emerald-400/70" />
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#202536]">
              <button
                type="button"
                onClick={() => {
                  const targetMsg = editingMessage;
                  setEditingMessage(null);
                  setDeleteTarget({
                    type: 'message',
                    id: targetMsg.id,
                    title: targetMsg.name,
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 text-xs font-mono-code flex items-center gap-1.5 border border-red-900/50 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Pesan</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMessage(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#1e2332] text-slate-300 hover:bg-[#283042] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (editingMessage) {
                      try {
                        await DataService.updateMessage(editingMessage);
                        setMessages((prev) =>
                          prev.map((m) => (m.id === editingMessage.id ? editingMessage : m))
                        );
                        setEditingMessage(null);
                        showToast('Pesan & kontak berhasil diperbarui!');
                      } catch (err) {
                        console.error('Error updating message:', err);
                        showToast('Gagal memperbarui pesan.');
                      }
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#c5a059] hover:bg-[#d4af37] text-black font-bold font-mono-code transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM DELETE MODAL (IFRAME SAFE) --- */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#12151f] border border-red-900/40 rounded-2xl p-6 text-white text-xs space-y-4 shadow-2xl relative"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-950/80 text-red-400 border border-red-800/60 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white">
                  {deleteTarget.type === 'service'
                    ? 'Hapus Layanan?'
                    : deleteTarget.type === 'project'
                    ? 'Hapus Proyek?'
                    : deleteTarget.type === 'casestudy'
                    ? 'Hapus Case Study?'
                    : 'Hapus Pesan Inquiries?'}
                </h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus{' '}
                  <span className="text-[#c5a059] font-medium font-mono-code">
                    "{deleteTarget.title}"
                  </span>
                  ? Data akan dihapus secara permanen.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#202536]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-[#1e2332] text-slate-300 hover:bg-[#272e42] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold font-mono-code transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9:16 Interactive Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropRawImageSrc}
        aspectRatio={9 / 16}
        outputWidth={720}
        outputHeight={1280}
        onClose={() => {
          setCropModalOpen(false);
          setCropRawImageSrc('');
        }}
        onCropComplete={async (croppedBase64) => {
          setCropModalOpen(false);
          setCropRawImageSrc('');
          try {
            setIsOptimizingPhoto(true);
            const newSettings = {
              ...editableSettings,
              profileImage: croppedBase64,
            };
            setEditableSettings(newSettings);
            await DataService.saveSettings(newSettings);
            onDataUpdated();
            showToast('Foto profil 1:1 berhasil dipotong & disimpan!');
          } catch (err) {
            console.error(err);
            showToast('Gagal menyimpan hasil crop foto.');
          } finally {
            setIsOptimizingPhoto(false);
          }
        }}
      />

      {/* Project Image Crop Modal (Cover & Gallery) */}
      {projectCropState && (
        <ImageCropModal
          isOpen={projectCropState.isOpen}
          imageSrc={projectCropState.imageSrc}
          title={projectCropState.title}
          description={projectCropState.description}
          aspectRatio={16 / 9}
          outputWidth={1280}
          outputHeight={720}
          allowRatioChange={true}
          onClose={() => setProjectCropState(null)}
          onCropComplete={handleProjectCropComplete}
        />
      )}
    </div>
  );
};
