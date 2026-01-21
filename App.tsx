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
  ShieldCheck
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
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1])); 
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
      if (!silent) alert("Penyelarasan Berjaya!");
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
           alert("Data berjaya ditarik!");
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

  // --- Real-time Sync Effect ---
  useEffect(() => {
    const key = localStorage.getItem('spbt_cloud_sync_key');
    if (key) {
      const interval = setInterval(() => {
        pullFromCloud(key, true);
      }, 5000); // Poll every 5 seconds for live updates
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
    
    // Auto Push
    isInternalUpdate.current = false;
    pushToCloud(true);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    const trans = transactions.find(t => t.id === transactionId);
    if (!trans) return;
    if (method === 'Buku') setBooks(prev => prev.map(b => b.id === trans.bookId ? { ...b, stock: b.stock + 1 } : b));
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } : t));
    alert(`Kerosakan Selesai.`);
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
    if (confirm("AMARAN: Semua murid akan dinaikkan 1 tahun kelas. Murid Tahun 6 akan dikeluarkan dari sistem. Teruskan?")) {
      setMembers(prev => prev.map(m => {
        if (m.type === 'Murid' && m.year) return { ...m, year: m.year + 1 };
        return m;
      }).filter(m => m.type === 'Guru' || (m.year && m.year <= 6)));
      alert("Proses Naik Kelas Selesai.");
      pushToCloud(true);
    }
  };

  const handleResetData = () => {
    if (confirm("AMARAN: Padam semua data transaksi dan ahli? Stok buku akan dikekalkan.")) {
      setTransactions([]);
      setMembers([{ id: '1', name: 'PENYELARAS SPBT', type: 'Guru' }]);
      alert("Pangkalan Data Dikosongkan.");
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
    if (confirm("Padam buku ini dari inventori?")) {
      setBooks(prev => prev.filter(b => b.id !== id));
      pushToCloud(true);
    }
  };

  const handleRemoveMember = (id: string) => {
    if (confirm("Padam ahli ini? Rekod pinjaman akan kekal dalam log.")) {
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
      alert("Sila lengkapkan Profil Admin dahulu.");
      return;
    }
    const key = btoa(unescape(encodeURIComponent(`${adminSettings.schoolName}_${adminSettings.adminId}`.toLowerCase().replace(/\s+/g, '')))).replace(/[/+=]/g, '').substring(0, 10);
    syncKeyRef.current = key;
    localStorage.setItem('spbt_cloud_sync_key', key);
    await pushToCloud();
    const shareUrl = `${window.location.origin}${window.location.pathname}#cloud=${key}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert("Pautan Real-time Sync disalin! Hantar kepada guru lain."));
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

  // --- Initial Load Effect ---
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

  // --- UI Render ---
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
            <button onClick={() => adminSettings.isRegistered ? setAuthView('admin_auth') : setAuthView('setup')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3rem] text-left hover:bg-white/20 transition group border-indigo-400/30">
              <Lock size={32} className="mb-4 text-indigo-400" />
              <h3 className="text-2xl font-black uppercase text-white">Portal Admin</h3>
              <p className="text-indigo-200 text-sm">Kawalan stok, urus ahli & Cloud.</p>
              <ArrowRight className="mt-8 text-indigo-400 group-hover:translate-x-2 transition" />
            </button>
            <button onClick={() => setAuthView('guru_auth')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3rem] text-left hover:bg-white/20 transition group border-emerald-400/30">
              <UserCircle size={32} className="mb-4 text-emerald-400" />
              <h3 className="text-2xl font-black uppercase text-white">Log Masuk Guru</h3>
              <p className="text-indigo-200 text-sm">Pinjaman layan diri & profil.</p>
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
            {isSetup ? 'Daftar Admin' : isGuru ? 'Masuk Guru' : 'Akses Admin'}
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
            <input type="text" required className="w-full px-6 py-4 rounded-3xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder={isGuru ? "NAMA PENUH GURU" : "ID ADMIN"} value={isGuru ? tempName : (isSetup ? adminSettings.adminId : adminIdInput)} onChange={(e) => isGuru ? setTempName(e.target.value) : (isSetup ? setAdminSettings({...adminSettings, adminId: e.target.value}) : setAdminIdInput(e.target.value))} />
            {!isGuru && <input type="password" required className="w-full px-6 py-4 rounded-3xl border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none" placeholder="KATA LALUAN" value={isSetup ? adminSettings.adminPass : adminPasswordInput} onChange={(e) => isSetup ? setAdminSettings({...adminSettings, adminPass: e.target.value}) : setAdminPasswordInput(e.target.value)} />}
            <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-indigo-700 transition uppercase shadow-xl">Masuk</button>
            <button type="button" onClick={() => setAuthView('landing')} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Kembali</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-indigo-950">
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 shadow-xl z-20">
        <div className="p-8 border-b border-white/10 flex items-center gap-4">
          <Library size={32} className="text-indigo-400" />
          <div className="overflow-hidden"><h1 className="font-black text-sm tracking-tighter uppercase leading-tight">E-SPBT PINTAR</h1><p className="text-[9px] text-indigo-300 font-bold uppercase truncate">{adminSettings.schoolName}</p></div>
        </div>
        <div className="flex-1 p-6 space-y-2 mt-4">
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-950 font-black shadow-lg' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><BookOpen size={20} /> Bilik Buku</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white text-indigo-950 font-black shadow-lg' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><History size={20} /> Log Rekod</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-950 font-black shadow-lg' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><UserCircle size={20} /> Profil Saya</button>
          {isAdminAuthenticated && (
            <button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`w-full flex items-center gap-4 px-5 py-4 mt-8 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-950 font-black shadow-lg' : 'text-indigo-200 hover:bg-white/5 font-bold'}`}><LayoutDashboard size={20} /> Panel Admin</button>
          )}
        </div>
        <div className="p-6 border-t border-white/5 bg-black/20 text-center">
          <p className="text-[10px] font-black uppercase mb-4 text-indigo-200 truncate">{userName}</p>
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/20 text-rose-300 rounded-xl text-[10px] font-black border border-rose-500/30 uppercase hover:bg-rose-600 transition">Log Keluar</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-black text-indigo-900 uppercase tracking-tighter">{activeTab.toUpperCase()}</h2>
             <div className={`px-2 py-1 rounded-full flex items-center gap-1 border ${syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                {syncStatus === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span className="text-[8px] font-black uppercase tracking-widest">{syncStatus === 'online' ? 'LIVE' : 'OFFLINE'}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => pullFromCloud(undefined, false)} className={`p-2 rounded-xl border-2 transition-all ${isSyncing ? 'animate-spin border-indigo-600 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-indigo-600'}`}><RefreshCw size={18} /></button>
            <button onClick={handleLogout} className="md:hidden p-2.5 bg-rose-50 text-rose-600 rounded-xl"><LogOut size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 md:p-10 pb-24 bg-slate-50">
          {activeTab === 'inventory' && (
            <div className="space-y-6 md:space-y-8">
              <div className="bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm flex gap-2 w-fit">
                <button onClick={() => setInventoryView('Guru')} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Guru</button>
                <button onClick={() => setInventoryView('Murid')} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Murid</button>
              </div>

              <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`flex-1 min-w-[80px] py-3 rounded-xl font-black transition-all uppercase text-[10px] ${selectedYear === y ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>T{y}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryView === 'Guru' ? (
                  books.filter(b => b.year === selectedYear).map(book => {
                    const hasBorrowed = getActiveLoans(userName).some(l => l.bookId === book.id);
                    return (
                      <div key={book.id} className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-sm group">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-black text-indigo-950 text-[11px] uppercase h-10 overflow-hidden group-hover:text-indigo-600">{book.title}</h4>
                           <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">RM{book.price.toFixed(2)}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-3 italic">Stok: <span className={book.stock < 20 ? 'text-rose-600' : 'text-indigo-600'}>{book.stock}</span></p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 transition">Pinjam</button>
                          <button disabled={!hasBorrowed} onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} className={`py-2.5 rounded-xl text-[9px] font-black uppercase ${hasBorrowed ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-300'}`}>Pulang</button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  members.filter(m => m.type === 'Murid' && m.year === selectedYear).sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                    <div key={student.id} onClick={() => { setSelectedMemberDetail(student); setIsMemberDetailOpen(true); }} className="bg-white rounded-3xl border-2 border-slate-100 p-5 flex justify-between items-center group cursor-pointer hover:border-indigo-400 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">{student.name.charAt(0)}</div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-black text-indigo-950 uppercase text-[10px] truncate max-w-[140px]">{student.name}</h4>
                          <p className="text-[8px] font-bold text-slate-500">{getActiveLoans(student.name).length} Pinjaman Aktif</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  ))
                )}
                {inventoryView === 'Murid' && members.filter(m => m.type === 'Murid' && m.year === selectedYear).length === 0 && (
                   <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black uppercase text-[10px]">Tiada rekod murid Tahun {selectedYear} ditemui.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-2 rounded-2xl border-2 shadow-sm border-slate-200">
                  {['overview', 'manage', 'members', 'damages', 'session', 'system'].map(tab => (
                    <button key={tab} onClick={() => setAdminSubTab(tab as any)} className={`px-6 py-2.5 text-[9px] font-black rounded-lg transition-all uppercase ${adminSubTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {tab === 'manage' ? 'Inventori' : tab === 'damages' ? 'Kerosakan' : tab === 'session' ? 'Urus Sesi' : tab === 'system' ? 'Sistem & Kunci' : tab.toUpperCase()}
                    </button>
                  ))}
              </div>

              {adminSubTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                   <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Total Stok</p><p className="text-3xl font-black text-indigo-900 leading-none">{books.reduce((acc, b) => acc + Number(b.stock), 0)}</p></div>
                   <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Pinjaman</p><p className="text-3xl font-black text-emerald-600 leading-none">{transactions.filter(t => t.action === 'Pinjaman').length}</p></div>
                   <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Rosak/Hilang</p><p className="text-3xl font-black text-rose-600 leading-none">{transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length}</p></div>
                   <button onClick={fetchAiInsight} className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-center items-center gap-2">
                     <Sparkles size={24} className={isAiLoading ? 'animate-spin' : ''} />
                     <span className="font-black text-xs uppercase">AI Insight</span>
                   </button>
                   {aiInsight && <div className="col-span-full bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 text-indigo-950 text-xs font-bold leading-relaxed whitespace-pre-wrap">{aiInsight}</div>}
                </div>
              )}

              {adminSubTab === 'manage' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-black uppercase text-indigo-950">Pengurusan Buku</h3>
                     <button onClick={() => { setIsAddingBook(true); setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 }); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] shadow-lg flex items-center gap-2"><BookPlus size={18}/> Tambah Buku</button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {books.sort((a,b) => a.year - b.year || a.title.localeCompare(b.title)).map(book => (
                      <div key={book.id} className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex items-center justify-between hover:border-indigo-400 group">
                         <div className="flex-1 pr-4">
                           <h4 className="font-black text-[10px] uppercase text-indigo-950">{book.title}</h4>
                           <div className="flex items-center gap-3 mt-1">
                             <span className="text-[8px] font-bold text-slate-500">TAHUN {book.year}</span>
                             <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">RM {book.price.toFixed(2)}</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-center w-12"><p className={`font-black text-lg ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-700'}`}>{book.stock}</p></div>
                            <div className="flex gap-2">
                              <button onClick={() => { setBookToEdit({...book}); setIsEditingBook(true); }} className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl"><Edit2 size={18}/></button>
                              <button onClick={() => handleRemoveBook(book.id)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-xl"><Trash2 size={18}/></button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'members' && (
                <div className="space-y-6">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="bg-white p-1 rounded-xl border-2 border-slate-200 flex shadow-sm">
                        <button onClick={() => setAdminMemberView('Guru')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${adminMemberView === 'Guru' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Guru</button>
                        <button onClick={() => setAdminMemberView('Murid')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${adminMemberView === 'Murid' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Murid</button>
                      </div>
                      <button onClick={() => { setNewMember({ type: adminMemberView, year: adminMemberView === 'Murid' ? selectedMemberYear : undefined, name: '' }); setIsAddingMember(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-md hover:bg-indigo-700 transition-all"><UserPlus size={18}/> Daftar Ahli Baru</button>
                   </div>

                   {adminMemberView === 'Murid' && (
                      <div className="flex bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm overflow-x-auto no-scrollbar mb-4">
                        {YEARS.map(y => (
                          <button key={y} onClick={() => setSelectedMemberYear(y)} className={`flex-1 min-w-[70px] py-3 rounded-xl font-black uppercase text-[10px] transition-all ${selectedMemberYear === y ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-900'}`}>T{y}</button>
                        ))}
                      </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {members.filter(m => m.type === adminMemberView && (adminMemberView === 'Guru' || m.year === selectedMemberYear)).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                        <div key={m.id} onClick={() => { setSelectedMemberDetail(m); setEditedMemberName(m.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-400 shadow-sm transition-all group">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">{m.name.charAt(0)}</div>
                              <h4 className="font-black text-[10px] uppercase text-indigo-950 truncate max-w-[150px]">{m.name}</h4>
                           </div>
                           <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      ))}
                      {members.filter(m => m.type === adminMemberView && (adminMemberView === 'Guru' || m.year === selectedMemberYear)).length === 0 && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black uppercase text-[10px]">Tiada ahli didaftarkan di sini.</div>
                      )}
                   </div>
                </div>
              )}

              {adminSubTab === 'damages' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase text-indigo-950">Kerosakan & Kehilangan</h3>
                  <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-500 border-b">
                          <tr><th className="px-6 py-4">Ahli</th><th className="px-6 py-4">Buku</th><th className="px-6 py-4">Ganti (RM)</th><th className="px-6 py-4">Aksi</th></tr>
                       </thead>
                       <tbody className="divide-y text-[10px] font-bold text-indigo-950">
                          {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').map(t => (
                            <tr key={t.id}>
                              <td className="px-6 py-4 uppercase">{t.userName}</td>
                              <td className="px-6 py-4 uppercase truncate max-w-[150px]">{t.bookTitle}</td>
                              <td className="px-6 py-4 text-rose-600">RM{t.fineAmount?.toFixed(2)}</td>
                              <td className="px-6 py-4 flex gap-2">
                                <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] uppercase font-black">Tunai</button>
                                <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[8px] uppercase font-black">Buku</button>
                              </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                    {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length === 0 && (
                      <div className="p-10 text-center text-[10px] font-black text-slate-300 uppercase italic">Tiada kerosakan tertunggak.</div>
                    )}
                  </div>
                </div>
              )}

              {adminSubTab === 'session' && (
                <div className="max-w-xl">
                   <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-xl border-b-8 border-indigo-200 space-y-8">
                      <div className="flex items-center gap-4 text-indigo-950"><TrendingUp size={32} className="text-indigo-600"/><h3 className="text-xl font-black uppercase tracking-tighter">Kawalan Sesi Sekolah</h3></div>
                      <div className="space-y-4">
                         <button onClick={handlePromoteStudents} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800 hover:bg-indigo-700 transition flex items-center justify-center gap-3"><ArrowUpCircle size={20}/> Naik Kelas (Semua Murid)</button>
                         <button onClick={handleResetData} className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black uppercase text-[10px] shadow-sm hover:bg-rose-700 transition flex items-center justify-center gap-3"><RotateCcw size={20}/> Padam Rekod & Log Ahli</button>
                      </div>
                   </div>
                </div>
              )}

              {adminSubTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Cloud Sync Section */}
                  <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-sm border-b-8 border-emerald-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                        <CloudLightning size={28} className="text-emerald-600" />
                        <h3 className="text-xl font-black text-indigo-950 uppercase tracking-tighter">Cloud Sync & Real-time</h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mb-6 uppercase leading-relaxed">Aktifkan real-time sync untuk membolehkan semua guru dan admin melihat kemaskini stok dan pinjaman secara langsung di peranti masing-masing.</p>
                    </div>
                    <div>
                      <button onClick={handleGenerateSyncLink} disabled={isSyncing} className={`w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 transition-all ${isSyncing ? 'opacity-50' : ''}`}>
                        <Share2 size={20}/> Jana Kunci Pautan Sync
                      </button>
                      {localStorage.getItem('spbt_cloud_sync_key') && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Kunci Cloud</p>
                            <code className="text-[10px] font-bold text-indigo-600 break-all">{localStorage.getItem('spbt_cloud_sync_key')}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Credentials Section */}
                  <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-sm border-b-8 border-indigo-200">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                      <ShieldCheck size={28} className="text-indigo-600" />
                      <h3 className="text-xl font-black text-indigo-950 uppercase tracking-tighter">Sunting Akses Admin</h3>
                    </div>
                    <div className="space-y-4 mb-6">
                      <div className="relative">
                        <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">ID ADMIN (Kini)</label>
                        <input type="text" className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} />
                      </div>
                      <div className="relative">
                        <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">KATA LALUAN (Kini)</label>
                        <input type="text" className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} />
                      </div>
                      <div className="relative">
                        <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">NAMA SEKOLAH</label>
                        <input type="text" className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <button onClick={() => { pushToCloud(); alert("Kredential Berjaya Disimpan!"); }} className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase text-[10px] hover:bg-indigo-50 transition shadow-sm active:scale-95 flex items-center justify-center gap-2">
                       <Save size={18} /> Simpan Perubahan Akses
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-xl text-center border-b-8 border-indigo-500">
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-xl border-4 border-white">{userName.charAt(0)}</div>
                <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter mb-1 leading-none">{userName}</h3>
                <p className="text-[9px] font-black uppercase text-slate-500 mb-8 italic">{isAdminAuthenticated ? 'AKSES PENTADBIR' : 'GURU BERDAFTAR'}</p>
              </div>
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 bg-slate-50 border-b flex items-center gap-3"><BookOpen size={16} className="text-indigo-600"/><h4 className="font-black text-indigo-950 uppercase text-xs">Pinjaman Anda</h4></div>
                <div className="p-6 space-y-4">
                  {getActiveLoans(userName).map(loan => (
                    <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-indigo-400 transition-all">
                       <div className="flex-1 overflow-hidden pr-3"><p className="font-black text-indigo-950 text-xs uppercase truncate leading-tight">{loan.bookTitle}</p><p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{loan.timestamp}</p></div>
                       <button onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg border-b-2 border-emerald-800">Pulang</button>
                    </div>
                  ))}
                  {getActiveLoans(userName).length === 0 && <p className="text-center py-6 text-[9px] font-black text-slate-300 uppercase italic">Tiada pinjaman aktif.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
               <div className="p-6 md:p-8 border-b bg-slate-50 flex items-center justify-between"><h3 className="text-base md:text-lg font-black text-indigo-900 uppercase tracking-tighter">Rekod Transaksi</h3><button onClick={() => window.print()} className="p-2 md:px-4 md:py-2 bg-white border-2 border-slate-200 text-indigo-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 active:scale-95 shadow-sm"><Printer size={16} /><span>Cetak</span></button></div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-500 border-b tracking-widest">
                     <tr><th className="px-6 md:px-8 py-5">Ahli</th><th className="px-6 md:px-8 py-5">Buku</th><th className="px-6 md:px-8 py-5">Aksi</th><th className="px-6 md:px-8 py-5">Masa</th></tr>
                   </thead>
                   <tbody className="divide-y text-[10px] md:text-xs text-indigo-950 bg-white">
                     {transactions.map(t => (
                       <tr key={t.id} className="hover:bg-indigo-50/30 transition duration-300"><td className="px-6 md:px-8 py-5 font-black text-indigo-900 uppercase">{t.userName}</td><td className="px-6 md:px-8 py-5 font-bold text-slate-700 uppercase truncate max-w-[120px] md:max-w-[200px]">{t.bookTitle}</td><td className="px-6 md:px-8 py-5"><span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span></td><td className="px-6 md:px-8 py-5 font-bold text-slate-400 text-[8px] md:text-[9px]">{t.timestamp}</td></tr>
                     ))}
                   </tbody>
                 </table>
                 {transactions.length === 0 && <div className="p-10 text-center text-[10px] font-black text-slate-300 uppercase italic">Tiada rekod.</div>}
               </div>
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {/* Modal Daftar/Edit Buku */}
        {(isAddingBook || isEditingBook) && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl border-4 border-indigo-400 animate-in zoom-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-indigo-950">{isAddingBook ? 'Daftar Buku' : 'Edit Buku'}</h3>
                  <button onClick={() => {setIsAddingBook(false); setIsEditingBook(false);}} className="text-slate-400 hover:text-rose-500 transition"><X size={24}/></button>
                </div>
                <div className="space-y-4">
                   <div className="relative">
                      <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">Judul Buku</label>
                      <input type="text" className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.title : (bookToEdit?.title || '')} onChange={(e) => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">Tahun</label>
                        <select className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black text-indigo-950 outline-none" value={isAddingBook ? newBook.year : (bookToEdit?.year || 1)} onChange={(e) => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>
                          {YEARS.map(y => <option key={y} value={y}>Thn {y}</option>)}
                        </select>
                      </div>
                      <div className="relative">
                        <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">Stok</label>
                        <input type="number" className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black text-indigo-950 outline-none" value={isAddingBook ? newBook.stock : (bookToEdit?.stock || 0)} onChange={(e) => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} />
                      </div>
                   </div>
                   <div className="relative bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-100">
                      <div className="flex items-center gap-2 mb-1"><DollarSign size={14} className="text-emerald-600" /><label className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Harga (RM)</label></div>
                      <input type="number" step="0.01" className="w-full bg-transparent font-black text-lg text-emerald-950 outline-none" value={isAddingBook ? newBook.price : (bookToEdit?.price || 0)} onChange={(e) => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} />
                   </div>
                   <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800">Sahkan & Simpan</button>
                </div>
             </div>
          </div>
        )}

        {/* Modal Ahli Baru */}
        {isAddingMember && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border-4 border-indigo-400 animate-in zoom-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-indigo-950">Daftar {newMember.type}</h3>
                  <button onClick={() => setIsAddingMember(false)} className="text-slate-400 hover:text-rose-500 transition"><X size={24}/></button>
                </div>
                <div className="space-y-4">
                   <div className="relative">
                      <label className="text-[8px] font-black uppercase text-indigo-400 absolute left-5 top-2 tracking-widest">Nama Penuh</label>
                      <input type="text" placeholder="HURUF BESAR" className="w-full px-5 pt-6 pb-2 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value.toUpperCase()})} />
                   </div>
                   {newMember.type === 'Murid' && (
                     <div className="grid grid-cols-3 gap-2">
                       {YEARS.map(y => (
                         <button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`py-3 rounded-lg font-black text-[9px] uppercase transition-all ${newMember.year === y ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 border-2 border-slate-100 text-indigo-950'}`}>Thn {y}</button>
                       ))}
                     </div>
                   )}
                   <button onClick={handleAddMember} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl border-b-4 border-indigo-800 transition-all">Daftar Sekarang</button>
                </div>
             </div>
          </div>
        )}

        {/* Member Detail Modal */}
        {isMemberDetailOpen && selectedMemberDetail && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-indigo-400 animate-in zoom-in">
                <div className="p-6 md:p-8 border-b-2 border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md border-2 border-white">{selectedMemberDetail.name.charAt(0)}</div>
                      <div className="flex-1">
                        {!isEditingMemberName ? (
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-indigo-950 uppercase truncate max-w-[150px]">{selectedMemberDetail.name}</h3>
                            <button onClick={() => { setEditedMemberName(selectedMemberDetail.name); setIsEditingMemberName(true); }} className="text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <input type="text" className="bg-white border-2 border-indigo-300 px-3 py-1 rounded-lg font-black uppercase text-xs outline-none w-32 shadow-inner text-indigo-900" value={editedMemberName} onChange={(e) => setEditedMemberName(e.target.value.toUpperCase())} />
                             <button onClick={handleUpdateMemberName} className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm"><CheckCircle size={14}/></button>
                          </div>
                        )}
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• T${selectedMemberDetail.year}` : ''}</p>
                      </div>
                   </div>
                   <button onClick={() => setIsMemberDetailOpen(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto no-scrollbar flex-1 space-y-6 bg-white">
                   <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                      <h4 className="text-[9px] font-black uppercase text-indigo-900 tracking-widest flex items-center gap-1.5"><BookOpen size={14}/> Pinjaman Aktif</h4>
                      <button onClick={() => { setBorrowingMember(selectedMemberDetail); setSearchInLoan(''); setYearFilterInLoan(selectedMemberDetail.year || 'Semua'); setIsBorrowModalOpen(true); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[8px] flex items-center gap-1 shadow-md hover:bg-indigo-700 transition">
                        <Plus size={12}/> Daftar Pinjaman
                      </button>
                   </div>
                   <div className="space-y-2.5">
                      {getActiveLoans(selectedMemberDetail.name).length > 0 ? getActiveLoans(selectedMemberDetail.name).map(loan => (
                        <div key={loan.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                           <div className="flex-1 pr-3 overflow-hidden"><p className="font-black text-indigo-950 text-[10px] uppercase truncate group-hover:text-indigo-600">{loan.bookTitle}</p><p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{loan.timestamp}</p></div>
                           <div className="flex gap-2">
                              <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase shadow-md active:scale-95 border-b-2 border-emerald-800">Pulang</button>
                              <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><AlertTriangle size={16}/></button>
                           </div>
                        </div>
                      )) : <p className="text-center py-6 text-[9px] font-black text-slate-300 uppercase italic">Tiada rekod pinjaman aktif.</p>}
                   </div>
                </div>
                <div className="p-6 md:p-8 bg-slate-50 border-t-2 border-slate-100 flex justify-end">
                   <button onClick={() => handleRemoveMember(selectedMemberDetail.id)} className="px-5 py-2.5 text-rose-600 border border-rose-100 rounded-xl font-black uppercase text-[9px] flex items-center gap-2 hover:bg-rose-600 hover:text-white transition shadow-sm"><Trash2 size={14}/> Padam Ahli</button>
                </div>
             </div>
          </div>
        )}

        {/* Borrow Modal for Bulk Selection */}
        {isBorrowModalOpen && borrowingMember && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-indigo-400 animate-in zoom-in">
                <div className="p-6 md:p-8 border-b-2 border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                   <div className="flex-1"><h3 className="text-lg font-black text-indigo-950 uppercase tracking-tighter">Daftar Rekod Pinjaman</h3><p className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase w-fit mt-1">{borrowingMember.name}</p></div>
                   <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="text-slate-400 hover:text-rose-500 transition"><X size={24}/></button>
                </div>
                <div className="px-6 md:px-8 py-4 bg-slate-50 border-b flex flex-col sm:flex-row gap-3">
                   <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Cari tajuk buku..." className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 font-bold text-xs outline-none focus:border-indigo-600" value={searchInLoan} onChange={(e) => setSearchInLoan(e.target.value.toUpperCase())} /></div>
                   <select className="px-4 py-2 bg-white rounded-xl border border-slate-200 font-bold text-xs outline-none focus:border-indigo-600" value={yearFilterInLoan} onChange={(e) => setYearFilterInLoan(e.target.value === 'Semua' ? 'Semua' : Number(e.target.value))}>
                      <option value="Semua">Semua Tahun</option>
                      {YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}
                   </select>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto no-scrollbar flex-1 bg-white">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {books.filter(b => (yearFilterInLoan === 'Semua' || b.year === yearFilterInLoan) && (searchInLoan === '' || b.title.includes(searchInLoan))).map(book => {
                        const isSelected = selectedBooksToBorrow.has(book.id);
                        return (
                          <div key={book.id} onClick={() => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-indigo-50 hover:border-indigo-400'}`}>
                               <div className="overflow-hidden"><h4 className={`font-black text-[10px] uppercase truncate w-32 ${isSelected ? 'text-white' : 'text-indigo-950'}`}>{book.title}</h4><div className="flex gap-2 items-center mt-1"><p className={`text-[8px] uppercase font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>Stok: {book.stock}</p><p className={`text-[8px] uppercase font-black ${isSelected ? 'text-white' : 'text-emerald-600'}`}>RM{book.price.toFixed(2)}</p></div></div>
                               {isSelected && <CheckCircle size={16} className="text-white" />}
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="p-6 md:p-8 bg-slate-50 border-t-2 border-slate-100"><button onClick={() => { Array.from(selectedBooksToBorrow).forEach(id => handleAction(id, 'Pinjaman', borrowingMember.name, borrowingMember.type, 1, true)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); pushToCloud(true); }} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] border-b-4 border-indigo-800 active:scale-95 transition-all" disabled={selectedBooksToBorrow.size === 0}>Sahkan Pinjaman ({selectedBooksToBorrow.size} Buku)</button></div>
             </div>
          </div>
        )}

        {/* Bottom Nav for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 px-8 py-4 flex justify-between z-30 shadow-[0_-10px_30px_rgba(30,27,75,0.1)]">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><BookOpen size={22} /><span className="text-[8px] uppercase tracking-tighter">Bilik Buku</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><History size={22} /><span className="text-[8px] uppercase tracking-tighter">Log Rekod</span></button>
           <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><UserCircle size={22} /><span className="text-[8px] uppercase tracking-tighter">Profil</span></button>
           {isAdminAuthenticated && (<button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'admin' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><LayoutDashboard size={22} /><span className="text-[8px] uppercase tracking-tighter">Admin</span></button>)}
        </div>
      </main>
    </div>
  );
};

export default App;