import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book, Transaction, UserType, TransactionStatus, ActionType, BookType, Member, AdminSettings, ResolutionMethod, ResolutionStatus } from './types';
import { INITIAL_BOOKS, YEARS, CATEGORIES } from './constants';
import { getStockInsight } from './services/geminiService';
import { 
  Library, 
  History, 
  LayoutDashboard, 
  UserCircle, 
  AlertTriangle,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  CheckCircle,
  Edit2,
  X,
  Lock,
  BookPlus,
  UserPlus,
  Plus,
  ArrowRight,
  Sparkles,
  Save,
  KeyRound,
  Printer,
  Share2,
  CloudLightning,
  RefreshCw,
  RotateCcw,
  LogOut,
  Wifi,
  WifiOff,
  Coins,
  Settings2,
  Database,
  TrendingUp,
  ArrowUpCircle,
  Search,
  DollarSign,
  ShieldCheck,
  Copy,
  Globe
} from 'lucide-react';

type AuthView = 'landing' | 'guru_auth' | 'admin_auth' | 'setup' | 'main';

const App: React.FC = () => {
  // --- State Utama ---
  const [authView, setAuthView] = useState<AuthView>('landing');
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'admin' | 'profile'>('inventory');
  const [inventoryView, setInventoryView] = useState<'Guru' | 'Murid'>('Guru');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'manage' | 'members' | 'damages' | 'session' | 'system'>('overview');
  const [adminMemberView, setAdminMemberView] = useState<'Guru' | 'Murid'>('Guru');
  const [selectedMemberYear, setSelectedMemberYear] = useState<number>(1);
  
  // --- Tetapan & Auth ---
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    schoolName: '', adminName: 'ADMIN', adminId: '', adminPass: '', isRegistered: false
  });

  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // --- UI States ---
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [lastSyncText, setLastSyncText] = useState('Sedia');
  const [searchInLoan, setSearchInLoan] = useState('');
  const [yearFilterInLoan, setYearFilterInLoan] = useState<number | 'Semua'>('Semua');
  
  // --- Modal States ---
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isMemberDetailOpen, setIsMemberDetailOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);
  const [borrowingMember, setBorrowingMember] = useState<Member | null>(null);
  const [selectedBooksToBorrow, setSelectedBooksToBorrow] = useState<Set<string>>(new Set());
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'error'>('online');
  
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 });
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });
  const [isEditingMemberName, setIsEditingMemberName] = useState(false);
  const [editedMemberName, setEditedMemberName] = useState('');

  // --- Refs for Real-time Logic ---
  const isInternalUpdate = useRef(false);
  const lastSyncTimestamp = useRef<number>(0);
  const syncKeyRef = useRef<string | null>(localStorage.getItem('spbt_cloud_sync_key'));

  // --- Cloud Sync Actions ---
  const pushToCloud = async (silent = false) => {
    const key = syncKeyRef.current || (adminSettings.schoolName && adminSettings.adminId ? btoa(unescape(encodeURIComponent(`${adminSettings.schoolName}_${adminSettings.adminId}`.toLowerCase().replace(/\s+/g, '')))).replace(/[/+=]/g, '').substring(0, 10) : null);
    if (!key) return;
    
    try {
      if (!silent) setIsSyncing(true);
      const v = Date.now();
      const payload = {
        s: adminSettings.schoolName,
        i: adminSettings.adminId,
        p: adminSettings.adminPass,
        n: adminSettings.adminName,
        r: adminSettings.isRegistered,
        b: books.map(b => [b.id, b.stock, b.price, b.title, b.year, b.type, b.subject]), 
        m: members.map(m => [m.id, m.name, m.type === 'Guru' ? 0 : 1, m.year]),
        t: transactions.slice(0, 150),
        v: v 
      };
      
      const response = await fetch(`https://api.keyvalue.xyz/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Push failed");
      lastSyncTimestamp.current = v;
      setSyncStatus('online');
      setLastSyncText(new Date().toLocaleTimeString());
      if (!silent) alert("Data berjaya dikemaskini ke Cloud!");
    } catch (e) {
      console.error("Cloud Push Error:", e);
      setSyncStatus('error');
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const pullFromCloud = async (targetKey?: string, silent = false) => {
    const key = targetKey || syncKeyRef.current;
    if (!key) return;
    
    try {
      if (!silent) setIsSyncing(true);
      const response = await fetch(`https://api.keyvalue.xyz/${key}`, { 
        cache: 'no-store' 
      });
      if (!response.ok) throw new Error("Pull failed");
      const data = await response.json();
      
      if (data && data.v && data.v > lastSyncTimestamp.current) {
        isInternalUpdate.current = true;
        
        setAdminSettings({
          schoolName: data.s,
          adminId: data.i,
          adminPass: data.p,
          adminName: data.n || 'ADMIN',
          isRegistered: data.r ?? true
        });

        if (data.b) {
          const updatedBooks = data.b.map((db: any) => ({
            id: db[0], stock: db[1], price: db[2], title: db[3], year: db[4], type: db[5], subject: db[6]
          }));
          setBooks(updatedBooks);
        }

        if (data.m) {
          const updatedMembers = data.m.map((am: any) => ({
            id: am[0], name: am[1], type: am[2] === 0 ? 'Guru' : 'Murid', year: am[3]
          }));
          setMembers(updatedMembers);
        }
        
        if (data.t) setTransactions(data.t);

        lastSyncTimestamp.current = data.v;
        syncKeyRef.current = key;
        localStorage.setItem('spbt_cloud_sync_key', key);
        setSyncStatus('online');
        setLastSyncText(new Date().toLocaleTimeString());

        if (targetKey && !silent) {
           alert("Sambungan Cloud Berjaya!");
           setAuthView('main');
        }
      }
    } catch (e) {
      console.error("Cloud Pull Error:", e);
      setSyncStatus('offline');
    } finally {
      if (!silent) setIsSyncing(false);
      isInternalUpdate.current = false;
    }
  };

  // --- Real-time Sync Interval ---
  useEffect(() => {
    const key = localStorage.getItem('spbt_cloud_sync_key');
    if (key) {
      const interval = setInterval(() => {
        pullFromCloud(key, true);
      }, 5000); 
      return () => clearInterval(interval);
    }
  }, []);

  // --- Handlers ---
  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1, silent: boolean = false) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    if (action === 'Pinjaman' && book.stock < qty) {
      if (!silent) alert(`Stok tidak mencukupi.`);
      return;
    }
    
    let status: TransactionStatus = 'Berjaya';
    let stockChange = (action === 'Pinjaman') ? -qty : qty;
    let resStatus: ResolutionStatus | undefined;

    if (action === 'Pulang Rosak/Hilang') {
      status = 'Rosak/Hilang'; stockChange = 0; resStatus = 'Tertunggak';
    }

    const updatedBooks = books.map(b => b.id === bookId ? { ...b, stock: Math.max(0, b.stock + stockChange) } : b);
    
    const newTrans: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      bookId, bookTitle: book.title, userName: targetUser, userType: targetType, quantity: qty,
      timestamp: new Date().toLocaleString('ms-MY'), createdAt: Date.now(), action, status,
      resolutionStatus: resStatus, fineAmount: action === 'Pulang Rosak/Hilang' ? book.price : 0
    };

    setBooks(updatedBooks);
    setTransactions(prev => [newTrans, ...prev]);
    
    // Auto Push to Cloud for real-time
    isInternalUpdate.current = false;
    setTimeout(() => pushToCloud(true), 100);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    const trans = transactions.find(t => t.id === transactionId);
    if (!trans) return;
    if (method === 'Buku') setBooks(prev => prev.map(b => b.id === trans.bookId ? { ...b, stock: b.stock + 1 } : b));
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } : t));
    alert(`Rekod kerosakan telah diselesaikan secara ${method}.`);
    pushToCloud(true);
  };

  const handleUpdateMemberName = () => {
    if (!selectedMemberDetail || !editedMemberName.trim()) return;
    const oldName = selectedMemberDetail.name;
    const newName = editedMemberName.trim().toUpperCase();
    setMembers(prev => prev.map(m => m.id === selectedMemberDetail.id ? { ...m, name: newName } : m));
    setTransactions(prev => prev.map(t => t.userName === oldName ? { ...t, userName: newName } : t));
    if (userName === oldName) { setUserName(newName); localStorage.setItem('spbt_user_name', newName); }
    setSelectedMemberDetail({ ...selectedMemberDetail, name: newName });
    setIsEditingMemberName(false);
    pushToCloud(true);
  };

  const handlePromoteStudents = () => {
    if (confirm("Adakah anda pasti? Semua murid akan dinaikkan 1 tahun kelas secara pukal.")) {
      setMembers(prev => prev.map(m => {
        if (m.type === 'Murid' && m.year) return { ...m, year: m.year + 1 };
        return m;
      }).filter(m => m.type === 'Guru' || (m.year && m.year <= 6)));
      alert("Proses Naik Kelas Selesai.");
      pushToCloud(true);
    }
  };

  const handleResetData = () => {
    if (confirm("AMARAN: Ini akan memadam semua rekod transaksi dan ahli. Stok buku tidak akan berubah. Teruskan?")) {
      setTransactions([]);
      setMembers([{ id: '1', name: 'PENYELARAS SPBT', type: 'Guru' }]);
      alert("Semua data telah dikosongkan.");
      pushToCloud(true);
    }
  };

  const handleAddNewBook = () => {
    if (!newBook.title) return;
    const book: Book = {
      id: `book-${Math.random().toString(36).substr(2, 5)}`,
      title: newBook.title.toUpperCase(),
      year: newBook.year || 1,
      type: (newBook.type as BookType) || 'Buku Teks',
      stock: Number(newBook.stock) || 0,
      subject: (newBook.subject || 'AM').toUpperCase(),
      price: Number(newBook.price) || 0
    };
    setBooks(prev => [...prev, book]);
    setIsAddingBook(false);
    setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 });
    pushToCloud(true);
  };

  const handleUpdateBook = () => {
    if (!bookToEdit) return;
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? (bookToEdit as Book) : b));
    setIsEditingBook(false);
    pushToCloud(true);
  };

  const handleRemoveBook = (id: string) => {
    if (confirm("Padam buku ini dari sistem?")) {
      setBooks(prev => prev.filter(b => b.id !== id));
      pushToCloud(true);
    }
  };

  const handleRemoveMember = (id: string) => {
    if (confirm("Padam ahli ini?")) {
      setMembers(prev => prev.filter(m => m.id !== id));
      setIsMemberDetailOpen(false);
      pushToCloud(true);
    }
  };

  const handleAddMember = () => {
    if (!newMember.name) return;
    const member: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMember.name.toUpperCase(),
      type: (newMember.type as UserType) || 'Guru',
      year: newMember.type === 'Murid' ? newMember.year : undefined
    };
    setMembers(prev => [...prev, member]);
    setIsAddingMember(false);
    setNewMember({ name: '', type: 'Guru', year: 1 });
    pushToCloud(true);
  };

  const handleGenerateSyncLink = async () => {
    if (!adminSettings.schoolName || !adminSettings.adminId) {
      alert("Sila lengkapkan profil sekolah dahulu.");
      return;
    }
    const key = btoa(unescape(encodeURIComponent(`${adminSettings.schoolName}_${adminSettings.adminId}`.toLowerCase().replace(/\s+/g, '')))).replace(/[/+=]/g, '').substring(0, 10);
    syncKeyRef.current = key;
    localStorage.setItem('spbt_cloud_sync_key', key);
    await pushToCloud();
    const shareUrl = `${window.location.origin}${window.location.pathname}#cloud=${key}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert("Pautan Sekolah disalin! Berikan pautan ini kepada guru lain untuk akses Online."));
  };

  const handleLogout = () => {
    setUserName('');
    setIsAdminAuthenticated(false);
    localStorage.removeItem('spbt_user_name');
    setAuthView('landing');
  };

  const fetchAiInsight = async () => {
    setIsAiLoading(true);
    const insight = await getStockInsight(books, transactions);
    setAiInsight(insight || "Tiada analisa tersedia.");
    setIsAiLoading(false);
  };

  const getActiveLoans = (name: string) => {
    const userTrans = transactions.filter(t => t.userName === name);
    const active: Transaction[] = [];
    [...userTrans].sort((a,b) => a.createdAt - b.createdAt).forEach(t => {
      if (t.action === 'Pinjaman') active.push(t);
      else if (t.action === 'Pemulangan' || t.action === 'Pulang Rosak/Hilang') {
        const idx = active.findIndex(a => a.bookId === t.bookId);
        if (idx > -1) active.splice(idx, 1);
      }
    });
    return active;
  };

  // --- Initial Load ---
  useEffect(() => {
    const keyFromHash = window.location.hash.includes('cloud=') ? window.location.hash.split('cloud=')[1] : null;
    const key = keyFromHash || localStorage.getItem('spbt_cloud_sync_key');
    if (key) {
      syncKeyRef.current = key;
      pullFromCloud(key, true);
    }
    
    const savedName = localStorage.getItem('spbt_user_name');
    if (savedName) {
      setUserName(savedName);
      if (savedName === 'ADMIN') setIsAdminAuthenticated(true);
      setAuthView('main');
    }
  }, []);

  // --- Auth View Screens ---
  if (authView === 'landing') {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-6 text-white font-['Plus_Jakarta_Sans']">
        <div className="max-w-4xl w-full text-center space-y-12 animate-in fade-in duration-700">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl border-2 border-indigo-400">
              <Library size={48} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic">E-SPBT PINTAR</h1>
            <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs">Sistem Pengurusan Buku Teks Digital</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto w-full">
            <button onClick={() => adminSettings.isRegistered ? setAuthView('admin_auth') : setAuthView('setup')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3rem] text-left hover:bg-white/20 transition group border-indigo-400/30 shadow-2xl">
              <Lock size={32} className="mb-4 text-indigo-400" />
              <h3 className="text-2xl font-black uppercase text-white">Portal Admin</h3>
              <p className="text-indigo-200 text-sm">Urus stok, ahli & kunci cloud.</p>
              <ArrowRight className="mt-8 text-indigo-400 group-hover:translate-x-2 transition" />
            </button>
            <button onClick={() => setAuthView('guru_auth')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3rem] text-left hover:bg-white/20 transition group border-emerald-400/30 shadow-2xl">
              <UserCircle size={32} className="mb-4 text-emerald-400" />
              <h3 className="text-2xl font-black uppercase text-white">Layan Diri Guru</h3>
              <p className="text-indigo-200 text-sm">Pinjam & pulangan layan diri.</p>
              <ArrowRight className="mt-8 text-emerald-400 group-hover:translate-x-2 transition" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (['setup', 'admin_auth', 'guru_auth'].includes(authView)) {
    const isGuru = authView === 'guru_auth';
    const isSetup = authView === 'setup';
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center border-4 border-indigo-100">
          <h3 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter mb-10 leading-tight">
            {isSetup ? 'Daftar Sistem' : isGuru ? 'Nama Guru' : 'Akses Admin'}
          </h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (isSetup) { setAdminSettings({...adminSettings, isRegistered: true}); setAuthView('admin_auth'); }
            else if (isGuru) {
                const name = tempName.trim().toUpperCase();
                if (name) {
                  setUserName(name); localStorage.setItem('spbt_user_name', name); setAuthView('main');
                  if (!members.find(m => m.name === name)) {
                    setMembers(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, type: 'Guru' }]);
                  }
                }
            }
            else {
              if (adminIdInput === adminSettings.adminId && adminPasswordInput === adminSettings.adminPass) {
                setIsAdminAuthenticated(true); setUserName('ADMIN'); localStorage.setItem('spbt_user_name', 'ADMIN'); setAuthView('main'); setActiveTab('admin');
              } else alert("Kredential Salah!");
            }
          }} className="space-y-4">
            {isSetup && <input type="text" required className="w-full px-6 py-4 rounded-3xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="NAMA SEKOLAH" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />}
            <input type="text" required className="w-full px-6 py-4 rounded-3xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder={isGuru ? "NAMA PENUH ANDA" : "ID PENTADBIR"} value={isGuru ? tempName : (isSetup ? adminSettings.adminId : adminIdInput)} onChange={(e) => isGuru ? setTempName(e.target.value) : (isSetup ? setAdminSettings({...adminSettings, adminId: e.target.value}) : setAdminIdInput(e.target.value))} />
            {!isGuru && <input type="password" required className="w-full px-6 py-4 rounded-3xl border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none" placeholder="KATA LALUAN" value={isSetup ? adminSettings.adminPass : adminPasswordInput} onChange={(e) => isSetup ? setAdminSettings({...adminSettings, adminPass: e.target.value}) : setAdminPasswordInput(e.target.value)} />}
            <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-indigo-700 transition uppercase shadow-xl">Buka Sistem</button>
            <button type="button" onClick={() => setAuthView('landing')} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Kembali</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-indigo-950 overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 shadow-2xl z-30">
        <div className="p-8 border-b border-white/10 flex items-center gap-4">
          <Library size={32} className="text-indigo-400" />
          <div className="overflow-hidden"><h1 className="font-black text-sm tracking-tighter uppercase leading-tight">E-SPBT PINTAR</h1><p className="text-[9px] text-indigo-300 font-bold uppercase truncate">{adminSettings.schoolName}</p></div>
        </div>
        <div className="flex-1 p-6 space-y-2 mt-4">
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-950 font-black shadow-lg scale-105' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><BookOpen size={20} /> Bilik Buku</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white text-indigo-950 font-black shadow-lg scale-105' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><History size={20} /> Log Rekod</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-950 font-black shadow-lg scale-105' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><UserCircle size={20} /> Profil Saya</button>
          {isAdminAuthenticated && (
            <button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`w-full flex items-center gap-4 px-5 py-4 mt-8 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-950 font-black shadow-lg scale-105' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><LayoutDashboard size={20} /> Panel Admin</button>
          )}
        </div>
        <div className="p-6 border-t border-white/5 bg-black/20 text-center">
          <p className="text-[10px] font-black uppercase mb-4 text-indigo-200 truncate italic">{userName}</p>
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/20 text-rose-300 rounded-xl text-[10px] font-black border border-rose-500/30 uppercase tracking-widest hover:bg-rose-600 transition shadow-sm">Log Keluar</button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-black text-indigo-900 uppercase tracking-tighter">{activeTab === 'inventory' ? 'Bilik Buku' : activeTab === 'history' ? 'Rekod Transaksi' : activeTab === 'profile' ? 'Akaun Saya' : 'Panel Admin'}</h2>
             <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border-2 ${syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest">{syncStatus === 'online' ? 'Real-Time Online' : 'Offline'}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => pullFromCloud(undefined, false)} className={`p-2.5 rounded-xl border-2 transition-all ${isSyncing ? 'animate-spin border-indigo-600 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-indigo-600 hover:text-indigo-600'}`} title="Kemaskini Cloud"><RefreshCw size={20} /></button>
            <button onClick={handleLogout} className="md:hidden p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100"><LogOut size={20} /></button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 md:p-10 pb-24 bg-slate-50 scroll-smooth">
          {activeTab === 'inventory' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="bg-white p-1.5 rounded-[1.5rem] border-2 border-slate-200 shadow-sm flex gap-2 w-fit">
                  <button onClick={() => setInventoryView('Guru')} className={`px-10 py-3 rounded-2xl font-black text-[11px] uppercase transition-all ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>Bagi Guru</button>
                  <button onClick={() => setInventoryView('Murid')} className={`px-10 py-3 rounded-2xl font-black text-[11px] uppercase transition-all ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>Bagi Murid</button>
                </div>
                <div className="flex gap-2">
                   {YEARS.map(y => (
                    <button key={y} onClick={() => setSelectedYear(y)} className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl font-black transition-all uppercase text-[11px] flex items-center justify-center border-2 ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg scale-110' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'}`}>T{y}</button>
                  ))}
                </div>
              </div>

              {inventoryView === 'Guru' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {books.filter(b => b.year === selectedYear).sort((a,b) => a.title.localeCompare(b.title)).map(book => {
                    const hasBorrowed = getActiveLoans(userName).some(l => l.bookId === book.id);
                    return (
                      <div key={book.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                           <h4 className="font-black text-indigo-950 text-[12px] uppercase h-10 overflow-hidden leading-tight group-hover:text-indigo-600">{book.title}</h4>
                           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">RM{book.price.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 mb-5 flex justify-between items-center">
                           <p className="text-[10px] text-slate-500 font-black uppercase">Stok Tersedia</p>
                           <p className={`font-black text-xl ${book.stock < 20 ? 'text-rose-600 animate-pulse' : 'text-indigo-600'}`}>{book.stock}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-700 transition active:scale-95 shadow-md border-b-4 border-indigo-800">Pinjam</button>
                          <button disabled={!hasBorrowed} onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} className={`py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all ${hasBorrowed ? 'bg-emerald-600 text-white shadow-md active:scale-95 border-b-4 border-emerald-800' : 'bg-slate-100 text-slate-300 border-none'}`}>Pulang</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {members.filter(m => m.type === 'Murid' && m.year === selectedYear).sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                    <div key={student.id} onClick={() => { setSelectedMemberDetail(student); setIsMemberDetailOpen(true); }} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-6 flex justify-between items-center group cursor-pointer hover:border-indigo-400 hover:shadow-xl transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg group-hover:rotate-6 transition-transform">{student.name.charAt(0)}</div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-black text-indigo-950 uppercase text-[11px] truncate max-w-[150px] group-hover:text-indigo-600">{student.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <BookOpen size={12} className="text-slate-400" />
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{getActiveLoans(student.name).length} Pinjaman Aktif</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><ChevronRight size={18} /></div>
                    </div>
                  ))}
                  {members.filter(m => m.type === 'Murid' && m.year === selectedYear).length === 0 && (
                     <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-200 rounded-[3rem] bg-white/50 animate-in fade-in">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><UserCircle size={40} /></div>
                        <p className="text-slate-400 font-black uppercase text-[11px] tracking-widest italic">Sila daftar murid di Panel Admin <br/> untuk Tahun {selectedYear}.</p>
                     </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              {/* Admin Tabs */}
              <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-2 rounded-[1.5rem] border-2 shadow-sm border-slate-200">
                  {['overview', 'manage', 'members', 'damages', 'session', 'system'].map(tab => (
                    <button key={tab} onClick={() => setAdminSubTab(tab as any)} className={`px-6 py-3 text-[10px] font-black rounded-xl transition-all uppercase whitespace-nowrap ${adminSubTab === tab ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {tab === 'manage' ? 'Buku' : tab === 'damages' ? 'Rosak' : tab === 'session' ? 'Sesi' : tab === 'system' ? 'Sistem & Kunci' : tab.toUpperCase()}
                    </button>
                  ))}
              </div>

              {adminSubTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in zoom-in duration-300">
                   <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Total Stok</p><p className="text-4xl font-black text-indigo-900 leading-none">{books.reduce((acc, b) => acc + Number(b.stock), 0)}</p></div>
                   <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Pinjaman</p><p className="text-4xl font-black text-emerald-600 leading-none">{transactions.filter(t => t.action === 'Pinjaman').length}</p></div>
                   <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Rosak/Hilang</p><p className="text-4xl font-black text-rose-600 leading-none">{transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length}</p></div>
                   <button onClick={fetchAiInsight} className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-center items-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 border-b-8 border-indigo-900">
                     <Sparkles size={32} className={isAiLoading ? 'animate-spin' : ''} />
                     <span className="font-black text-[11px] uppercase tracking-tighter">Analisa Pintar AI</span>
                   </button>
                   {aiInsight && <div className="col-span-full bg-white p-10 rounded-[3rem] border-4 border-indigo-50 text-indigo-950 text-xs font-bold leading-relaxed whitespace-pre-wrap shadow-xl italic">{aiInsight}</div>}
                </div>
              )}

              {adminSubTab === 'manage' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-black uppercase text-indigo-950 tracking-tighter">Pengurusan Inventori</h3>
                     <button onClick={() => { setIsAddingBook(true); setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 }); }} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center gap-3 hover:bg-indigo-700 transition active:scale-95"><BookPlus size={20}/> Tambah Buku Baru</button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {books.sort((a,b) => a.year - b.year || a.title.localeCompare(b.title)).map(book => (
                      <div key={book.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between hover:border-indigo-400 hover:shadow-xl transition-all group">
                         <div className="flex-1 pr-4 mb-4 sm:mb-0 text-center sm:text-left">
                           <h4 className="font-black text-[12px] uppercase text-indigo-950 group-hover:text-indigo-600">{book.title}</h4>
                           <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-2">
                             <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase">TAHUN {book.year}</span>
                             <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100 shadow-sm">RM {book.price.toFixed(2)}</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-8">
                            <div className="text-center w-16">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">STOK</p>
                               <p className={`font-black text-2xl ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-700'}`}>{book.stock}</p>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => { setBookToEdit({...book}); setIsEditingBook(true); }} className="p-3.5 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm"><Edit2 size={20}/></button>
                              <button onClick={() => handleRemoveBook(book.id)} className="p-3.5 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm"><Trash2 size={20}/></button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'members' && (
                <div className="space-y-6">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <div className="bg-white p-2 rounded-[1.5rem] border-2 border-slate-200 flex shadow-sm gap-2">
                        <button onClick={() => setAdminMemberView('Guru')} className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${adminMemberView === 'Guru' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>Senarai Guru</button>
                        <button onClick={() => setAdminMemberView('Murid')} className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${adminMemberView === 'Murid' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>Senarai Murid</button>
                      </div>
                      <button onClick={() => { setNewMember({ type: adminMemberView, year: adminMemberView === 'Murid' ? selectedMemberYear : undefined, name: '' }); setIsAddingMember(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-2xl hover:bg-indigo-700 transition-all border-b-4 border-indigo-900 active:scale-95"><UserPlus size={22}/> Pendaftaran Baru</button>
                   </div>

                   {adminMemberView === 'Murid' && (
                      <div className="flex bg-white p-2 rounded-[2rem] border-2 border-slate-200 shadow-sm overflow-x-auto no-scrollbar gap-2">
                        {YEARS.map(y => (
                          <button key={y} onClick={() => setSelectedMemberYear(y)} className={`flex-1 min-w-[80px] py-3.5 rounded-xl font-black uppercase text-[11px] transition-all ${selectedMemberYear === y ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-indigo-900 hover:bg-indigo-50'}`}>Tahun {y}</button>
                        ))}
                      </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-500">
                      {members.filter(m => m.type === adminMemberView && (adminMemberView === 'Guru' || m.year === selectedMemberYear)).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                        <div key={m.id} onClick={() => { setSelectedMemberDetail(m); setEditedMemberName(m.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-xl transition-all shadow-sm group">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">{m.name.charAt(0)}</div>
                              <h4 className="font-black text-[11px] uppercase text-indigo-950 truncate max-w-[140px] group-hover:text-indigo-600">{m.name}</h4>
                           </div>
                           <div className="p-2 bg-slate-50 text-slate-300 rounded-xl group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all"><ChevronRight size={20} /></div>
                        </div>
                      ))}
                      {members.filter(m => m.type === adminMemberView && (adminMemberView === 'Guru' || m.year === selectedMemberYear)).length === 0 && (
                        <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-400 font-black uppercase text-[11px] tracking-widest">Tiada ahli didaftarkan untuk kategori ini.</div>
                      )}
                   </div>
                </div>
              )}

              {adminSubTab === 'damages' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-black uppercase text-indigo-950 tracking-tighter">Rekod Kerosakan & Ganti Rugi</h3>
                  <div className="bg-white rounded-[3rem] border-2 border-slate-200 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b tracking-widest">
                            <tr><th className="px-8 py-6">Nama Ahli</th><th className="px-8 py-6">Judul Buku</th><th className="px-8 py-6">Nilai Ganti</th><th className="px-8 py-6 text-center">Tindakan Selesaikan</th></tr>
                        </thead>
                        <tbody className="divide-y text-[11px] font-bold text-indigo-950">
                            {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-6 uppercase font-black">{t.userName}</td>
                                <td className="px-8 py-6 uppercase truncate max-w-[200px]">{t.bookTitle}</td>
                                <td className="px-8 py-6 text-rose-600 font-black">RM {t.fineAmount?.toFixed(2)}</td>
                                <td className="px-8 py-6 flex justify-center gap-3">
                                  <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] uppercase font-black shadow-md border-b-4 border-emerald-800 active:scale-95">Bayar Tunai</button>
                                  <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] uppercase font-black shadow-md border-b-4 border-indigo-800 active:scale-95">Ganti Buku</button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length === 0 && (
                      <div className="p-20 text-center text-[12px] font-black text-slate-300 uppercase italic tracking-widest">Alhamdulillah, tiada kerosakan tertunggak.</div>
                    )}
                  </div>
                </div>
              )}

              {adminSubTab === 'session' && (
                <div className="max-w-2xl mx-auto py-10 animate-in zoom-in duration-500">
                   <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 p-12 shadow-2xl border-b-[1rem] border-indigo-200 text-center">
                      <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 border-4 border-white"><TrendingUp size={48} className="text-white"/></div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-950 mb-4 italic">KEMAS KINI SESI SEKOLAH</h3>
                      <p className="text-slate-500 text-[11px] font-bold uppercase mb-10 leading-relaxed px-10 tracking-widest">Gunakan fungsi ini hanya sekali setahun untuk menguruskan kenaikan kelas murid secara automatik.</p>
                      <div className="space-y-6">
                         <button onClick={handlePromoteStudents} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl border-b-8 border-indigo-900 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 active:scale-95"><ArrowUpCircle size={24}/> Naikkan Tahun Kelas Murid</button>
                         <button onClick={handleResetData} className="w-full py-6 bg-white text-rose-600 border-4 border-rose-100 rounded-[2rem] font-black uppercase text-xs shadow-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-4 active:scale-95"><RotateCcw size={24}/> Padam Seluruh Log & Ahli</button>
                      </div>
                   </div>
                </div>
              )}

              {adminSubTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-6">
                  {/* Cloud Sync Section */}
                  <div className="bg-indigo-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between border-b-[1rem] border-indigo-950">
                    <div>
                      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                        <Globe size={32} className="text-indigo-400" />
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Akses Real-time Online</h3>
                      </div>
                      <p className="text-[11px] font-bold text-indigo-200 mb-8 uppercase leading-relaxed tracking-widest italic">Aplikasi ini membolehkan semua guru menyemak stok serentak. Jana pautan khas untuk diberikan kepada guru-guru lain.</p>
                    </div>
                    <div className="space-y-4">
                      <button onClick={handleGenerateSyncLink} disabled={isSyncing} className={`w-full py-6 bg-indigo-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-4 transition-all hover:bg-indigo-400 active:scale-95 border-b-4 border-indigo-700 ${isSyncing ? 'opacity-50' : ''}`}>
                        <Share2 size={24}/> {localStorage.getItem('spbt_cloud_sync_key') ? 'Salin Pautan Guru' : 'Aktifkan Cloud Online'}
                      </button>
                      {localStorage.getItem('spbt_cloud_sync_key') && (
                        <div className="p-5 bg-white/10 rounded-2xl border border-white/10 text-center select-all cursor-pointer">
                            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">ID Cloud Aktif</p>
                            <code className="text-[11px] font-bold text-white break-all">{localStorage.getItem('spbt_cloud_sync_key')}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Credentials Section */}
                  <div className="bg-white rounded-[3rem] border-2 border-slate-200 p-10 shadow-xl border-b-[1rem] border-indigo-100">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                      <ShieldCheck size={32} className="text-indigo-600" />
                      <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">Akses & Sekuriti Admin</h3>
                    </div>
                    <div className="space-y-6 mb-10">
                      <div className="relative group">
                        <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">ID PENTADBIR (LOGIN)</label>
                        <input type="text" className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none shadow-inner" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} />
                      </div>
                      <div className="relative group">
                        <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">KATA LALUAN (PASSWORD)</label>
                        <input type="text" className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none shadow-inner" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} />
                      </div>
                      <div className="relative group">
                        <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">NAMA RASMI SEKOLAH</label>
                        <input type="text" className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none shadow-inner" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <button onClick={() => { pushToCloud(); alert("Kredential berjaya dikemaskini secara Online!"); }} className="w-full py-6 bg-white border-4 border-indigo-600 text-indigo-600 rounded-[2rem] font-black uppercase text-xs hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                       <Save size={24} /> Simpan Perubahan Akses
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white rounded-[3rem] border-2 border-slate-200 p-12 shadow-2xl text-center border-b-[1rem] border-indigo-500 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-1000" />
                <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto mb-8 shadow-2xl border-4 border-white rotate-3 group-hover:-rotate-3 transition-transform">{userName.charAt(0)}</div>
                <h3 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter mb-2 leading-none italic">{userName}</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-10 tracking-widest">{isAdminAuthenticated ? 'ADMIN SISTEM' : 'GURU BERDAFTAR'}</p>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Pinjaman</p>
                      <p className="text-3xl font-black text-indigo-600 leading-none">{getActiveLoans(userName).length}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Cloud</p>
                      <p className="text-[11px] font-black text-emerald-600 leading-none">CONNECTED</p>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="p-8 bg-slate-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><BookOpen size={20}/></div>
                    <h4 className="font-black text-indigo-950 uppercase text-sm tracking-tight italic">Senarai Pinjaman Anda</h4>
                  </div>
                  <span className="bg-indigo-100 px-4 py-1.5 rounded-full text-indigo-700 font-black text-[10px] uppercase shadow-sm">{getActiveLoans(userName).length} Buku</span>
                </div>
                <div className="p-8 space-y-4">
                  {getActiveLoans(userName).map(loan => (
                    <div key={loan.id} className="p-5 bg-white border-2 border-slate-50 rounded-[2rem] flex items-center justify-between shadow-sm hover:border-indigo-400 hover:scale-[1.01] transition-all">
                       <div className="flex-1 overflow-hidden pr-4">
                          <p className="font-black text-indigo-950 text-[12px] uppercase truncate leading-tight mb-1">{loan.bookTitle}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{loan.timestamp}</p>
                       </div>
                       <button onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-emerald-800 active:scale-95 transition-all">Pulang</button>
                    </div>
                  ))}
                  {getActiveLoans(userName).length === 0 && (
                    <div className="py-20 text-center">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><History size={32} /></div>
                       <p className="text-center text-[11px] font-black text-slate-300 uppercase italic tracking-widest">Tiada pinjaman aktif dikesan.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden animate-in fade-in duration-700">
               <div className="p-8 md:p-10 border-b bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter italic">Log Transaksi Seluruh Sekolah</h3>
                  <button onClick={() => window.print()} className="px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 active:scale-95 shadow-lg hover:bg-indigo-50 transition-all"><Printer size={18} /><span>Cetak Rekod</span></button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b tracking-widest">
                     <tr><th className="px-10 py-6 italic">Peminjam</th><th className="px-10 py-6 italic">Judul Buku</th><th className="px-10 py-6 italic text-center">Status</th><th className="px-10 py-6 italic text-right">Tarikh & Masa</th></tr>
                   </thead>
                   <tbody className="divide-y text-[11px] md:text-xs text-indigo-950 bg-white">
                     {transactions.map(t => (
                       <tr key={t.id} className="hover:bg-indigo-50/50 transition-colors duration-300 group">
                         <td className="px-10 py-6 font-black text-indigo-900 uppercase">{t.userName}</td>
                         <td className="px-10 py-6 font-bold text-slate-600 uppercase truncate max-w-[200px] group-hover:text-indigo-600">{t.bookTitle}</td>
                         <td className="px-10 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 shadow-sm ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span>
                         </td>
                         <td className="px-10 py-6 font-black text-slate-400 text-right uppercase italic tracking-tighter">{t.timestamp}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {transactions.length === 0 && <div className="p-32 text-center text-[12px] font-black text-slate-200 uppercase tracking-[0.2em] italic">Log transaksi masih kosong.</div>}
               </div>
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {/* Modal Daftar/Edit Buku */}
        {(isAddingBook || isEditingBook) && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl border-4 border-indigo-400 animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-indigo-950">{isAddingBook ? 'Daftar Buku Baru' : 'Edit Maklumat Buku'}</h3>
                  <button onClick={() => {setIsAddingBook(false); setIsEditingBook(false);}} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"><X size={24}/></button>
                </div>
                <div className="space-y-6">
                   <div className="relative group">
                      <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">JUDUL PENUH BUKU</label>
                      <input type="text" className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600 shadow-inner" value={isAddingBook ? newBook.title : (bookToEdit?.title || '')} onChange={(e) => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">TAHUN</label>
                        <select className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black text-indigo-950 outline-none focus:border-indigo-600 shadow-inner" value={isAddingBook ? newBook.year : (bookToEdit?.year || 1)} onChange={(e) => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>
                          {YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}
                        </select>
                      </div>
                      <div className="relative group">
                        <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">STOK SEMASA</label>
                        <input type="number" className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black text-indigo-950 outline-none focus:border-indigo-600 shadow-inner" value={isAddingBook ? newBook.stock : (bookToEdit?.stock || 0)} onChange={(e) => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} />
                      </div>
                   </div>
                   <div className="relative bg-emerald-50 rounded-[2rem] p-6 border-2 border-emerald-100 shadow-inner">
                      <div className="flex items-center gap-3 mb-2"><DollarSign size={20} className="text-emerald-600" /><label className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">HARGA SEUNIT (RM)</label></div>
                      <input type="number" step="0.01" className="w-full bg-transparent font-black text-3xl text-emerald-950 outline-none" value={isAddingBook ? newBook.price : (bookToEdit?.price || 0)} onChange={(e) => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} />
                   </div>
                   <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl border-b-8 border-indigo-900 transition-all hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-3">
                     <CheckCircle size={20} /> Sahkan & Simpan
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Modal Ahli Baru */}
        {isAddingMember && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-4 border-indigo-400 animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-indigo-950">Daftar {newMember.type} Baru</h3>
                  <button onClick={() => setIsAddingMember(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"><X size={24}/></button>
                </div>
                <div className="space-y-6">
                   <div className="relative group">
                      <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest z-10 transition-all group-focus-within:text-indigo-600">NAMA PENUH RASMI</label>
                      <input type="text" placeholder="HURUF BESAR" className="w-full px-6 pt-9 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600 shadow-inner" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value.toUpperCase()})} />
                   </div>
                   {newMember.type === 'Murid' && (
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PILIH TAHUN KELAS</label>
                        <div className="grid grid-cols-3 gap-3">
                          {YEARS.map(y => (
                            <button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`py-4 rounded-2xl font-black text-[12px] uppercase transition-all border-2 ${newMember.year === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg scale-105' : 'bg-slate-50 border-slate-100 text-indigo-950 hover:border-indigo-200'}`}>T{y}</button>
                          ))}
                        </div>
                     </div>
                   )}
                   <button onClick={handleAddMember} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl border-b-8 border-indigo-900 transition-all hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-3">
                     <UserPlus size={24} /> Sahkan Pendaftaran
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Member Detail Modal */}
        {isMemberDetailOpen && selectedMemberDetail && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-indigo-400 animate-in zoom-in duration-300">
                <div className="p-8 md:p-10 border-b-2 border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-2xl border-4 border-white rotate-3">{selectedMemberDetail.name.charAt(0)}</div>
                      <div className="flex-1">
                        {!isEditingMemberName ? (
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-indigo-950 uppercase tracking-tighter leading-tight truncate max-w-[200px] italic">{selectedMemberDetail.name}</h3>
                            <button onClick={() => { setEditedMemberName(selectedMemberDetail.name); setIsEditingMemberName(true); }} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90"><Edit2 size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                             <input type="text" className="bg-white border-4 border-indigo-300 px-4 py-2 rounded-2xl font-black uppercase text-xs outline-none w-48 shadow-2xl text-indigo-900 italic" value={editedMemberName} onChange={(e) => setEditedMemberName(e.target.value.toUpperCase())} />
                             <button onClick={handleUpdateMemberName} className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xl active:scale-90"><CheckCircle size={18}/></button>
                             <button onClick={() => setIsEditingMemberName(false)} className="p-2.5 bg-rose-500 text-white rounded-xl shadow-xl active:scale-90"><X size={18}/></button>
                          </div>
                        )}
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• TAHUN ${selectedMemberDetail.year}` : ''}</p>
                      </div>
                   </div>
                   <button onClick={() => setIsMemberDetailOpen(false)} className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={24}/></button>
                </div>
                <div className="p-8 md:p-10 overflow-y-auto no-scrollbar flex-1 space-y-8 bg-white">
                   <div className="flex justify-between items-center border-b-2 border-indigo-50 pb-4">
                      <h4 className="text-[10px] font-black uppercase text-indigo-950 tracking-widest flex items-center gap-3"><BookOpen size={18} className="text-indigo-600"/> Pinjaman Aktif</h4>
                      <button onClick={() => { setBorrowingMember(selectedMemberDetail); setSearchInLoan(''); setYearFilterInLoan(selectedMemberDetail.year || 'Semua'); setIsBorrowModalOpen(true); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition active:scale-95 border-b-4 border-indigo-900">
                        <Plus size={16}/> Daftar Pinjaman
                      </button>
                   </div>
                   <div className="space-y-4">
                      {getActiveLoans(selectedMemberDetail.name).length > 0 ? getActiveLoans(selectedMemberDetail.name).map(loan => (
                        <div key={loan.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                           <div className="flex-1 pr-4 overflow-hidden">
                              <p className="font-black text-indigo-950 text-[12px] uppercase truncate group-hover:text-indigo-600 transition-colors mb-1">{loan.bookTitle}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{loan.timestamp}</p>
                           </div>
                           <div className="flex gap-3">
                              <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 border-b-4 border-emerald-800 hover:bg-emerald-700 transition-all">Pulang</button>
                              <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"><AlertTriangle size={20}/></button>
                           </div>
                        </div>
                      )) : (
                        <div className="py-16 text-center">
                           <p className="text-[11px] font-black text-slate-300 uppercase italic tracking-widest">Tiada rekod pinjaman aktif dikesan.</p>
                        </div>
                      )}
                   </div>
                </div>
                <div className="p-8 md:p-10 bg-slate-50 border-t-2 border-slate-100 flex justify-end">
                   <button onClick={() => handleRemoveMember(selectedMemberDetail.id)} className="px-8 py-3.5 text-rose-600 border-2 border-rose-100 bg-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-lg active:scale-95"><Trash2 size={18}/> Padam Rekod Ahli</button>
                </div>
             </div>
          </div>
        )}

        {/* Borrow Modal for Bulk Selection */}
        {isBorrowModalOpen && borrowingMember && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-indigo-400 animate-in zoom-in duration-300">
                <div className="p-8 md:p-10 border-b-2 border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                   <div className="flex-1">
                      <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter mb-1 italic">Daftar Pukal Pinjaman</h3>
                      <p className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase w-fit shadow-lg tracking-widest">{borrowingMember.name}</p>
                   </div>
                   <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={24}/></button>
                </div>
                <div className="px-8 md:px-10 py-6 bg-slate-50 border-b-2 border-indigo-50 flex flex-col sm:flex-row gap-4">
                   <div className="relative flex-1 group">
                      <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                      <input type="text" placeholder="CARI TAJUK BUKU..." className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border-2 border-slate-100 font-black text-[11px] outline-none focus:border-indigo-600 shadow-inner group-focus-within:shadow-xl transition-all" value={searchInLoan} onChange={(e) => setSearchInLoan(e.target.value.toUpperCase())} />
                   </div>
                   <select className="px-6 py-4 bg-white rounded-2xl border-2 border-slate-100 font-black text-[11px] outline-none focus:border-indigo-600 shadow-inner" value={yearFilterInLoan} onChange={(e) => setYearFilterInLoan(e.target.value === 'Semua' ? 'Semua' : Number(e.target.value))}>
                      <option value="Semua">SEMUA TAHUN</option>
                      {YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}
                   </select>
                </div>
                <div className="p-8 md:p-10 overflow-y-auto no-scrollbar flex-1 bg-white">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {books.filter(b => (yearFilterInLoan === 'Semua' || b.year === yearFilterInLoan) && (searchInLoan === '' || b.title.includes(searchInLoan))).sort((a,b) => a.title.localeCompare(b.title)).map(book => {
                        const isSelected = selectedBooksToBorrow.has(book.id);
                        return (
                          <div key={book.id} onClick={() => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xl scale-[1.03] rotate-1' : 'bg-slate-50 border-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50'}`}>
                               <div className="overflow-hidden">
                                  <h4 className={`font-black text-[11px] uppercase truncate w-40 ${isSelected ? 'text-white' : 'text-indigo-950 group-hover:text-indigo-600'}`}>{book.title}</h4>
                                  <div className="flex gap-3 items-center mt-2">
                                    <p className={`text-[9px] uppercase font-black ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>TAHUN {book.year}</p>
                                    <p className={`text-[9px] uppercase font-black ${isSelected ? 'text-white' : 'text-emerald-600'}`}>STOK: {book.stock}</p>
                                  </div>
                               </div>
                               <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white text-indigo-600 border-white' : 'border-slate-200 text-transparent'}`}>
                                  <CheckCircle size={18} />
                               </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="p-8 md:p-10 bg-slate-50 border-t-2 border-indigo-50 flex items-center justify-between">
                   <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Terpilih</p>
                      <p className="text-2xl font-black text-indigo-950">{selectedBooksToBorrow.size} <span className="text-xs uppercase text-indigo-400">Buku</span></p>
                   </div>
                   <button onClick={() => { Array.from(selectedBooksToBorrow).forEach(id => handleAction(id, 'Pinjaman', borrowingMember.name, borrowingMember.type, 1, true)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); pushToCloud(true); }} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl uppercase text-[11px] border-b-8 border-indigo-900 active:scale-95 transition-all flex items-center gap-3" disabled={selectedBooksToBorrow.size === 0}>
                     <Save size={20} /> Sahkan Pinjaman ({selectedBooksToBorrow.size})
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Bottom Nav for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-100 px-8 py-4 flex justify-between z-40 shadow-[0_-20px_50px_rgba(30,27,75,0.15)] rounded-t-[2.5rem]">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-125 font-black drop-shadow-lg' : 'text-slate-400'}`}><BookOpen size={24} /><span className="text-[9px] uppercase font-black tracking-tighter">Inventori</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-125 font-black drop-shadow-lg' : 'text-slate-400'}`}><History size={24} /><span className="text-[9px] uppercase font-black tracking-tighter">Rekod</span></button>
           <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-indigo-600 scale-125 font-black drop-shadow-lg' : 'text-slate-400'}`}><UserCircle size={24} /><span className="text-[9px] uppercase font-black tracking-tighter">Profil</span></button>
           {isAdminAuthenticated && (<button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-indigo-600 scale-125 font-black drop-shadow-lg' : 'text-slate-400'}`}><LayoutDashboard size={24} /><span className="text-[9px] uppercase font-black tracking-tighter">Admin</span></button>)}
        </div>
      </main>
    </div>
  );
};

export default App;