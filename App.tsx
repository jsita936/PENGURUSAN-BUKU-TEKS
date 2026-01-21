import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  ArrowRight,
  Sparkles,
  Save,
  Printer,
  Share2,
  RefreshCw,
  LogOut,
  Wifi,
  Search,
  Wallet,
  ShieldCheck,
  CloudLightning,
  TrendingUp,
  ArrowUpCircle,
  RotateCcw,
  Package,
  Plus
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
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [guruNameInput, setGuruNameInput] = useState(''); 
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // --- UI States ---
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [searchInLoan, setSearchInLoan] = useState('');
  
  // --- Modal & Form States ---
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
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'error' | 'verifying'>('verifying');
  const [isInitialPullDone, setIsInitialPullDone] = useState(false);
  
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });
  const [isEditingMemberName, setIsEditingMemberName] = useState(false);
  const [editedMemberName, setEditedMemberName] = useState('');

  const lastSyncTimestamp = useRef<number>(0);
  const syncKeyRef = useRef<string | null>(localStorage.getItem('spbt_cloud_sync_key'));

  // --- Cloud Sync Actions ---
  const pushToCloud = async (silent = false) => {
    const key = syncKeyRef.current;
    if (!key) return;
    
    try {
      if (!silent) setIsSyncing(true);
      const v = Date.now();
      const payload = {
        s: adminSettings.schoolName,
        i: adminSettings.adminId,
        p: adminSettings.adminPass,
        n: adminSettings.adminName,
        r: true,
        b: books, 
        m: members,
        t: transactions.slice(0, 500),
        v: v 
      };
      
      await fetch(`https://api.keyvalue.xyz/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      lastSyncTimestamp.current = v;
      setSyncStatus('online');
    } catch (e) {
      setSyncStatus('error');
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const pullFromCloud = async (targetKey?: string, silent = false) => {
    const key = targetKey || syncKeyRef.current;
    if (!key) {
      setSyncStatus('offline');
      setIsInitialPullDone(true);
      return;
    }
    
    try {
      if (!silent) setIsSyncing(true);
      const response = await fetch(`https://api.keyvalue.xyz/${key}`, { cache: 'no-store' });
      if (!response.ok) throw new Error("Pull failed");
      const data = await response.json();
      
      if (data && data.v && data.v >= lastSyncTimestamp.current) {
        setAdminSettings({
          schoolName: data.s || '',
          adminId: data.i || '',
          adminPass: data.p || '',
          adminName: data.n || 'ADMIN',
          isRegistered: data.r ?? true
        });

        if (data.b) setBooks(data.b);
        if (data.m) setMembers(data.m);
        if (data.t) setTransactions(data.t);

        lastSyncTimestamp.current = data.v;
        syncKeyRef.current = key;
        localStorage.setItem('spbt_cloud_sync_key', key);
        setSyncStatus('online');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      if (!silent) setIsSyncing(false);
      setIsInitialPullDone(true);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const hash = window.location.hash;
    let keyToUse = null;
    if (hash.includes('cloud=')) {
      keyToUse = hash.split('cloud=')[1];
    } else {
      keyToUse = localStorage.getItem('spbt_cloud_sync_key');
    }

    if (keyToUse) {
      syncKeyRef.current = keyToUse;
      setSchoolCodeInput(keyToUse);
      pullFromCloud(keyToUse, true);
    } else {
      setIsInitialPullDone(true);
      setSyncStatus('offline');
    }

    const interval = setInterval(() => {
      if (syncKeyRef.current) pullFromCloud(undefined, true);
    }, 5000);

    const savedName = localStorage.getItem('spbt_user_name');
    const savedCode = localStorage.getItem('spbt_cloud_sync_key');
    if (savedName && savedCode) {
      setUserName(savedName);
      if (savedName === 'ADMIN') setIsAdminAuthenticated(true);
      setAuthView('main');
    }

    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleGuruLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCodeInput || !guruNameInput) {
      alert("Sila masukkan Kod Sekolah dan Nama Guru.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.keyvalue.xyz/${schoolCodeInput}`, { cache: 'no-store' });
      if (!response.ok) throw new Error("Kod Sekolah Tidak Sah");
      const data = await response.json();
      
      const gurus = (data.m || []).filter((m: any) => m.type === 'Guru');
      const found = gurus.find((g: any) => g.name.toUpperCase() === guruNameInput.toUpperCase());

      if (!found) {
        alert("PENGESAHAN GAGAL: Nama guru tidak didaftarkan dalam kod sekolah ini.");
        setIsSyncing(false);
        return;
      }

      setUserName(found.name);
      syncKeyRef.current = schoolCodeInput;
      if (rememberMe) {
        localStorage.setItem('spbt_user_name', found.name);
        localStorage.setItem('spbt_cloud_sync_key', schoolCodeInput);
      }
      setAuthView('main');
    } catch (err) {
      alert("Ralat: Kod Sekolah tidak wujud atau masalah rangkaian.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminIdInput === adminSettings.adminId && adminPasswordInput === adminSettings.adminPass) {
      setIsAdminAuthenticated(true);
      setUserName('ADMIN');
      if (rememberMe) {
        localStorage.setItem('spbt_user_name', 'ADMIN');
        localStorage.setItem('spbt_cloud_sync_key', syncKeyRef.current || '');
      }
      setAuthView('main');
      setActiveTab('admin');
    } else {
      alert("ID atau Kata Laluan Admin Salah!");
    }
  };

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
    setTimeout(() => pushToCloud(true), 100);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    const trans = transactions.find(t => t.id === transactionId);
    if (!trans) return;
    if (method === 'Buku') setBooks(prev => prev.map(b => b.id === trans.bookId ? { ...b, stock: b.stock + 1 } : b));
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } : t));
    pushToCloud(true);
  };

  const handleGenerateSyncLink = async () => {
    if (!adminSettings.schoolName || !adminSettings.adminId) {
      alert("Sila lengkapkan Profil Admin dahulu.");
      return;
    }
    const key = schoolCodeInput || btoa(unescape(encodeURIComponent(`${adminSettings.schoolName}_${adminSettings.adminId}`.toLowerCase().replace(/\s+/g, '')))).replace(/[/+=]/g, '').substring(0, 10);
    syncKeyRef.current = key;
    setSchoolCodeInput(key);
    localStorage.setItem('spbt_cloud_sync_key', key);
    setAdminSettings(prev => ({ ...prev, isRegistered: true }));
    await pushToCloud();
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

  const handleAddNewBook = () => {
    if (!newBook.title) return;
    const book: Book = {
      id: `book-${Math.random().toString(36).substr(2, 5)}`,
      title: newBook.title.toUpperCase(),
      year: newBook.year || 1,
      type: (newBook.type as BookType) || 'Buku Teks',
      stock: Number(newBook.stock) || 0,
      subject: 'AM',
      price: Number(newBook.price) || 0
    };
    setBooks(prev => [...prev, book]);
    setIsAddingBook(false);
    setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
    pushToCloud(true);
  };

  const handleUpdateBook = () => {
    if (!bookToEdit) return;
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? (bookToEdit as Book) : b));
    setIsEditingBook(false);
    setBookToEdit(null);
    pushToCloud(true);
  };

  const handleUpdateMemberName = () => {
    if (!selectedMemberDetail || !editedMemberName) return;
    const upperName = editedMemberName.toUpperCase();
    setMembers(prev => prev.map(m => m.id === selectedMemberDetail.id ? { ...m, name: upperName } : m));
    setSelectedMemberDetail(prev => prev ? { ...prev, name: upperName } : null);
    setIsEditingMemberName(false);
    pushToCloud(true);
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

  if (!isInitialPullDone) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-6 text-white text-center">
         <Library size={64} className="animate-bounce mb-6 text-indigo-400" />
         <h1 className="text-2xl font-black uppercase tracking-widest italic">E-SPBT PINTAR</h1>
         <p className="text-indigo-300 text-xs mt-2 uppercase font-bold tracking-widest">SINKRONASI AWAN...</p>
      </div>
    );
  }

  if (authView === 'landing') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white font-['Plus_Jakarta_Sans'] overflow-hidden relative text-center">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 blur-3xl rounded-full" />
        <div className="max-w-4xl w-full text-center space-y-10 animate-in fade-in duration-700 z-10">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border-4 border-indigo-400">
              <Library size={48} />
            </div>
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">E-SPBT PINTAR</h1>
              <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Sistem Pengurusan Buku Teks Digital</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto w-full pt-6">
            <button onClick={() => adminSettings.isRegistered ? setAuthView('admin_auth') : setAuthView('setup')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3.5rem] text-left hover:bg-white/20 transition group border-indigo-400/30 backdrop-blur-md shadow-2xl">
              <Lock size={32} className="mb-4 text-indigo-400" />
              <h3 className="text-2xl font-black uppercase text-white">{adminSettings.isRegistered ? 'Portal Admin' : 'Daftar Admin'}</h3>
              <p className="text-indigo-200 text-sm mt-1">Urus stok & pangkalan data cloud.</p>
              <div className="mt-10 flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">MASUK <ArrowRight size={16} className="group-hover:translate-x-2 transition" /></div>
            </button>
            <button onClick={() => setAuthView('guru_auth')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3.5rem] text-left hover:bg-white/20 transition group border-emerald-400/30 backdrop-blur-md shadow-2xl">
              <UserCircle size={32} className="mb-4 text-emerald-400" />
              <h3 className="text-2xl font-black uppercase text-white">Portal Guru</h3>
              <p className="text-indigo-200 text-sm mt-1">Hanya guru berdaftar dibenarkan.</p>
              <div className="mt-10 flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest">MASUK <ArrowRight size={16} className="group-hover:translate-x-2 transition" /></div>
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center border-b-[12px] border-indigo-600 animate-in zoom-in duration-300">
          <div className="mb-8 text-left">
             <h3 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter leading-tight italic">{isSetup ? 'DAFTAR SEKOLAH' : isGuru ? 'MASUK GURU' : 'AKSES ADMIN'}</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sila masukkan maklumat diperlukan</p>
          </div>
          <form onSubmit={isGuru ? handleGuruLogin : (isSetup ? (e) => { e.preventDefault(); setAdminSettings({...adminSettings, isRegistered: true}); setAuthView('admin_auth'); } : handleAdminAuth)} className="space-y-5">
            {isSetup ? (
              <div className="space-y-4">
                <input type="text" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="NAMA SEKOLAH" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                <input type="text" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="ID LOGIN ADMIN" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} />
                <input type="password" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none" placeholder="KATA LALUAN" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} />
              </div>
            ) : isGuru ? (
              <div className="space-y-4 text-left">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-600 uppercase ml-2">KOD SEKOLAH (DARI ADMIN)</label>
                    <input type="text" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="KOD" value={schoolCodeInput} onChange={(e) => setSchoolCodeInput(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-600 uppercase ml-2">NAMA GURU (SEPERTI DIDAFTRKAN)</label>
                    <input type="text" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="NAMA PENUH" value={guruNameInput} onChange={(e) => setGuruNameInput(e.target.value.toUpperCase())} />
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input type="text" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="ID ADMIN" value={adminIdInput} onChange={(e) => setAdminIdInput(e.target.value)} />
                <input type="password" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none" placeholder="KATA LALUAN" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} />
              </div>
            )}
            <div className="flex items-center gap-2 px-2 py-1">
               <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
               <label htmlFor="remember" className="text-[10px] font-black text-slate-500 uppercase cursor-pointer">Simpan maklumat log masuk</label>
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all uppercase shadow-xl border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0">PENGESAHAN MASUK</button>
            <button type="button" onClick={() => setAuthView('landing')} className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition text-center">Kembali</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f1f5f9] text-indigo-950 font-['Plus_Jakarta_Sans'] text-left">
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 shadow-2xl z-30 relative overflow-hidden text-left">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Library size={24} /></div>
          <div className="overflow-hidden">
            <h1 className="font-black text-md tracking-tighter uppercase italic text-left">E-SPBT PINTAR</h1>
            <p className="text-[7px] text-indigo-400 font-black uppercase tracking-[0.2em] truncate text-left">{adminSettings.schoolName || 'SISTEM BUKU'}</p>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-2 mt-4 text-left">
          {[ { id: 'inventory', icon: BookOpen, label: 'BILIK BUKU' }, { id: 'history', icon: History, label: 'LOG REKOD' }, { id: 'profile', icon: UserCircle, label: 'AKAUN SAYA' } ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white font-black shadow-xl' : 'text-indigo-200/40 hover:text-white hover:bg-white/5 font-bold'}`}>
              <item.icon size={20} /><span className="text-[10px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
          {isAdminAuthenticated && (
            <div className="pt-6 mt-6 border-t border-white/5">
              <button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-emerald-600 text-white font-black shadow-xl' : 'text-indigo-200/40 hover:text-white hover:bg-white/5 font-bold'}`}>
                <LayoutDashboard size={20} /><span className="text-[10px] uppercase tracking-widest">PANEL ADMIN</span>
              </button>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-white/5 bg-black/20 text-left">
          <p className="text-[9px] font-black uppercase mb-3 text-indigo-300 truncate italic">{userName}</p>
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black border border-rose-500/20 uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all text-center">LOG KELUAR</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden text-left">
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between shrink-0 shadow-sm z-20 text-left">
          <div className="flex items-center gap-4 text-left">
             <div className="md:hidden w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Library size={20} /></div>
             <div><h2 className="text-lg font-black text-indigo-900 uppercase tracking-tighter italic text-left">{activeTab === 'inventory' ? 'INVENTORI' : activeTab === 'admin' ? `ADMIN > ${adminSubTab.toUpperCase()}` : activeTab.toUpperCase()}</h2><p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">{adminSettings.schoolName || 'SISTEM SPBT'}</p></div>
          </div>
          <div className="flex items-center gap-3 text-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase ${syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}><Wifi size={12} className={syncStatus === 'online' ? 'animate-pulse' : ''} /><span>{syncStatus}</span></div>
            <button onClick={() => pullFromCloud(undefined, false)} className={`p-2.5 bg-white border-2 border-slate-100 rounded-xl shadow-sm ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}><RefreshCw size={18} /></button>
            <button onClick={handleLogout} className="md:hidden p-2.5 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-xl shadow-sm text-center"><LogOut size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 bg-[#f8fafc] no-scrollbar text-left">
          {activeTab === 'inventory' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between text-left">
                <div className="bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm flex gap-1">
                  <button onClick={() => setInventoryView('Guru')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>STAF GURU</button>
                  <button onClick={() => setInventoryView('Murid')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>PENGURUSAN MURID</button>
                </div>
                <div className="w-full lg:max-w-xs relative text-left"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="CARI JUDUL..." className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl border-2 border-slate-200 font-black text-[10px] outline-none focus:border-indigo-600 uppercase text-left" value={searchInLoan} onChange={(e) => setSearchInLoan(e.target.value.toUpperCase())} /></div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 text-left">{YEARS.map(y => ( <button key={y} onClick={() => setSelectedYear(y)} className={`min-w-[60px] py-3 rounded-xl font-black transition-all uppercase text-[10px] border-2 ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100'}`}>TAHUN {y}</button> ))}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
                {inventoryView === 'Guru' ? books.filter(b => b.year === selectedYear && b.title.includes(searchInLoan)).map(book => {
                    const hasBorrowed = getActiveLoans(userName).some(l => l.bookId === book.id);
                    return (
                      <div key={book.id} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between text-left">
                        <div className="text-left"><div className="flex justify-between items-start mb-4 text-left"><div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[10px] border border-indigo-100 uppercase text-center">{book.type}</div><span className="text-[10px] font-black text-emerald-600 text-right">RM{book.price.toFixed(2)}</span></div><h4 className="font-black text-indigo-950 text-[12px] uppercase h-10 overflow-hidden leading-tight mb-4 text-left">{book.title}</h4><div className="bg-slate-50 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-inner text-left"><p className="text-[9px] text-slate-400 font-black uppercase italic text-left">STOK</p><p className={`font-black text-xl ${book.stock < 15 ? 'text-rose-600 animate-pulse' : 'text-indigo-600'} text-right`}>{book.stock}</p></div></div>
                        <div className="grid grid-cols-2 gap-2 text-center text-left"><button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 transition border-b-4 border-indigo-800 text-center">PINJAM</button><button disabled={!hasBorrowed} onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border-b-4 ${hasBorrowed ? 'bg-emerald-600 text-white border-emerald-800 text-center' : 'bg-slate-100 text-slate-300 border-slate-200 text-center'}`}>PULANG</button></div>
                      </div>
                    );
                  }) : members.filter(m => m.type === 'Murid' && m.year === selectedYear && m.name.includes(searchInLoan)).sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                    <div key={student.id} onClick={() => { setSelectedMemberDetail(student); setEditedMemberName(student.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-white rounded-3xl border-2 border-slate-100 p-6 flex justify-between items-center group cursor-pointer hover:border-indigo-400 shadow-sm transition-all text-left"><div className="flex items-center gap-4 text-left"><div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg text-center">{student.name.charAt(0)}</div><div className="flex-1 overflow-hidden text-left"><h4 className="font-black text-indigo-950 uppercase text-[11px] truncate w-32 text-left">{student.name}</h4><p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter italic text-left">{getActiveLoans(student.name).length} AKTIF</p></div></div><ChevronRight size={16} className="text-slate-200 text-right" /></div>
                  ))
                }
              </div>
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-8 text-left">
              <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm text-left">
                  {[ { id: 'overview', label: 'RUMUSAN', icon: LayoutDashboard }, { id: 'manage', label: 'INVENTORI', icon: Package }, { id: 'members', label: 'AHLI/GURU', icon: UserPlus }, { id: 'damages', label: 'KES HILANG', icon: AlertTriangle }, { id: 'session', label: 'URUS SESI', icon: TrendingUp }, { id: 'system', label: 'SISTEM', icon: ShieldCheck } ].map(tab => (
                    <button key={tab.id} onClick={() => setAdminSubTab(tab.id as any)} className={`px-6 py-3 text-[10px] font-black rounded-xl transition-all uppercase flex items-center gap-2 whitespace-nowrap ${adminSubTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'} text-center`}><tab.icon size={16} />{tab.label}</button>
                  ))}
              </div>

              {adminSubTab === 'overview' && (
                <div className="space-y-6 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                     {[ { label: 'TOTAL STOK BUKU', val: books.reduce((acc, b) => acc + Number(b.stock), 0), icon: Package }, { label: 'PINJAMAN AKTIF', val: transactions.filter(t => t.action === 'Pinjaman').length, icon: BookOpen }, { label: 'KES ROSAK/HILANG', val: transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length, icon: AlertTriangle }, { label: 'JUMLAH AHLI', val: members.length, icon: UserCircle } ].map((card, i) => (
                       <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden group text-left"><div className={`absolute top-0 right-0 p-4 opacity-5 text-indigo-600 text-right`}><card.icon size={60} /></div><p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-[0.1em] italic text-left">{card.label}</p><p className={`text-4xl font-black text-indigo-900 leading-none tracking-tighter text-left`}>{card.val}</p></div>
                     ))}
                  </div>
                  <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden text-left"><div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-left"><div className={`w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 backdrop-blur-md ${isAiLoading ? 'animate-spin' : ''} text-center`}><Sparkles size={32} /></div><div className="flex-1 text-center md:text-left"><h3 className="text-2xl font-black uppercase italic text-left">ANALISA AI</h3><p className="text-indigo-200/50 font-bold uppercase text-[9px] tracking-widest mt-1 text-left">Dapatkan rumusan stok kritikal real-time.</p></div><button onClick={fetchAiInsight} disabled={isAiLoading} className="px-8 py-4 bg-white text-indigo-950 rounded-2xl font-black uppercase text-[10px] shadow-xl disabled:opacity-50 text-center">ANALISA</button></div>{aiInsight && <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl text-left"><p className="text-indigo-50/80 text-[11px] font-bold leading-relaxed whitespace-pre-wrap italic text-left">{aiInsight}</p></div>}</div>
                </div>
              )}

              {adminSubTab === 'manage' && (
                <div className="space-y-6 text-left">
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
                     <div><h3 className="text-xl font-black uppercase text-indigo-950 italic text-left">PENGURUSAN INVENTORI</h3><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 text-left">Urus buku & kemaskini stok secara inline</p></div>
                     {!isAddingBook && (
                        <button onClick={() => { setIsAddingBook(true); setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 }); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center gap-3 transition-all border-b-4 border-indigo-900 text-center">
                          <BookPlus size={20}/> DAFTAR BUKU BARU
                        </button>
                     )}
                  </div>

                  {/* Borang Inline Daftar Buku */}
                  {isAddingBook && (
                    <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md animate-in slide-in-from-top-4 text-left">
                       <div className="flex justify-between items-center mb-6 text-left"><h4 className="text-[11px] font-black uppercase text-indigo-950 italic text-left">Borang Buku Baru</h4><button onClick={() => setIsAddingBook(false)} className="p-2 text-slate-300 hover:text-rose-500 text-center"><X size={20} /></button></div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2">JUDUL BUKU</label><input type="text" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] outline-none focus:border-indigo-600 text-left" value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value.toUpperCase()})} /></div>
                          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2">TAHUN</label><select className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] outline-none text-left" value={newBook.year} onChange={(e) => setNewBook({...newBook, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}</select></div>
                          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2">KATEGORI</label><select className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] outline-none text-left" value={newBook.type} onChange={(e) => setNewBook({...newBook, type: e.target.value as BookType})}>{CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div>
                          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2">STOK</label><input type="number" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] text-left" value={newBook.stock} onChange={(e) => setNewBook({...newBook, stock: Number(e.target.value)})} /></div>
                          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-emerald-600 uppercase ml-2">HARGA (RM)</label><input type="number" step="0.01" className="w-full px-5 py-4 rounded-xl border-2 bg-emerald-50 text-[10px] border-emerald-100 text-left" value={newBook.price} onChange={(e) => setNewBook({...newBook, price: Number(e.target.value)})} /></div>
                       </div>
                       <button onClick={handleAddNewBook} className="mt-8 w-full py-5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800 text-center flex items-center justify-center gap-2"><Plus size={18}/> TAMBAH KE INVENTORI</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 text-left">
                    {books.sort((a,b) => a.year - b.year || a.title.localeCompare(b.title)).map(book => (
                      <div key={book.id} className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between hover:border-indigo-400 transition-all text-left">
                        <div className="flex-1 pr-4 mb-4 sm:mb-0 text-center sm:text-left flex items-center gap-6 text-left">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-lg text-slate-400 border border-slate-200 text-center">T{book.year}</div>
                          <div className="text-left">
                            <h4 className="font-black text-[11px] uppercase text-indigo-950 leading-tight text-left">{book.title}</h4>
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2 text-left">
                              <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase border border-indigo-100 text-center">{book.type}</span>
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 text-center">RM {book.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 text-right">
                          <div className="text-center w-14 text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase italic text-center">STOK</p>
                            <p className={`font-black text-2xl ${book.stock < 15 ? 'text-rose-600' : 'text-indigo-900'} text-center`}>{book.stock}</p>
                          </div>
                          <div className="flex gap-2 text-center">
                            <button onClick={() => { setBookToEdit({...book}); setIsEditingBook(true); }} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 text-center"><Edit2 size={18}/></button>
                            <button onClick={() => { if(confirm("Hapus?")) { setBooks(prev => prev.filter(b => b.id !== book.id)); pushToCloud(true); }}} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl shadow-sm border border-slate-100 text-center"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'members' && (
                <div className="space-y-6 text-left">
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
                      <div className="bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm flex gap-1">
                        <button onClick={() => setAdminMemberView('Guru')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${adminMemberView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} text-center`}>STAF GURU</button>
                        <button onClick={() => setAdminMemberView('Murid')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${adminMemberView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} text-center`}>URUS MURID</button>
                      </div>
                      {!isAddingMember && (
                        <button onClick={() => { setNewMember({ type: adminMemberView, year: adminMemberView === 'Murid' ? selectedMemberYear : undefined, name: '' }); setIsAddingMember(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center gap-3 transition-all border-b-4 border-indigo-900 text-center">
                          <UserPlus size={20}/> DAFTAR AHLI
                        </button>
                      )}
                   </div>
                   
                   {isAddingMember && (
                     <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md animate-in slide-in-from-top-4 text-left">
                        <div className="flex justify-between items-center mb-4 text-left"><h4 className="text-[11px] font-black uppercase text-indigo-950 italic text-left">Borang Pendaftaran {newMember.type}</h4><button onClick={() => setIsAddingMember(false)} className="p-2 text-slate-300 hover:text-rose-500 text-center"><X size={20} /></button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                           <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2">NAMA PENUH</label><input type="text" placeholder="MASUKKAN NAMA..." className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] outline-none focus:border-indigo-600 shadow-inner text-left" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value.toUpperCase()})} /></div>
                           {newMember.type === 'Murid' && (<div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2">TAHUN</label><div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-left">{YEARS.map(y => (<button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`px-4 py-2 rounded-lg font-black text-[10px] transition-all border-2 ${newMember.year === y ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400'} text-center`}>T{y}</button>))}</div></div>)}
                        </div>
                        <button onClick={handleAddMember} className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg border-b-4 border-indigo-800 text-center">SAHKAN PENDAFTARAN</button>
                     </div>
                   )}

                   {adminMemberView === 'Murid' && ( <div className="flex bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-2 text-left">{YEARS.map(y => ( <button key={y} onClick={() => setSelectedMemberYear(y)} className={`flex-1 min-w-[80px] py-3 rounded-xl font-black uppercase text-[10px] transition-all ${selectedMemberYear === y ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-indigo-50'} text-center`}>TAHUN {y}</button> ))}</div> )}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">{members.filter(m => m.type === adminMemberView && (adminMemberView === 'Guru' || m.year === selectedMemberYear)).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                        <div key={m.id} onClick={() => { setSelectedMemberDetail(m); setEditedMemberName(m.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-400 shadow-sm transition-all group text-left"><div className="flex items-center gap-4 text-left"><div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black text-xl text-center">{m.name.charAt(0)}</div><div className="overflow-hidden text-left"><h4 className="font-black text-[11px] uppercase text-indigo-950 truncate w-32 group-hover:text-indigo-600 text-left">{m.name}</h4><p className="text-[8px] font-black text-slate-400 uppercase mt-1 italic text-left">AKTIF</p></div></div><ChevronRight size={16} className="text-slate-200 text-right" /></div>
                      ))}</div>
                </div>
              )}

              {adminSubTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                  <div className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between border-b-[10px] border-indigo-950 text-left"><div><div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5 text-left"><div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 text-center"><CloudLightning size={24} /></div><div className="text-left"><h3 className="text-2xl font-black uppercase italic text-left">CLOUD</h3></div></div><p className="text-[11px] font-bold text-indigo-200/50 mb-8 uppercase italic text-left">Tetapkan Kod Sekolah secara manual untuk akses guru.</p></div><div className="space-y-4 text-center"><button onClick={handleGenerateSyncLink} disabled={isSyncing} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800 text-center"><Share2 size={18}/> {syncKeyRef.current ? 'KEMASKINI DATA CLOUD' : 'AKTIFKAN CLOUD'}</button>{syncKeyRef.current && <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center"><p className="text-[9px] font-black text-indigo-400 italic text-center">KOD AKTIF: {syncKeyRef.current}</p></div>}</div></div>
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-xl border-b-[10px] border-slate-200 text-left"><div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 text-left"><div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-center"><ShieldCheck size={24} /></div><div className="text-left"><h3 className="text-2xl font-black text-indigo-950 uppercase italic text-left">PROFIL & KOD</h3></div></div><div className="space-y-4 mb-8 text-left">
                        <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-600 uppercase ml-2 text-left">KOD SEKOLAH (BOLEH SET SENDIRI)</label><input type="text" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] outline-none focus:border-indigo-600 text-left" placeholder="KOD SEKOLAH" value={schoolCodeInput} onChange={(e) => setSchoolCodeInput(e.target.value)} /></div>
                        <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-600 uppercase ml-2 text-left">NAMA SEKOLAH</label><input type="text" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] outline-none text-left" placeholder="SEKOLAH" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} /></div>
                        <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-600 uppercase ml-2 text-left">ID ADMIN</label><input type="text" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] outline-none text-left" placeholder="ID ADMIN" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} /></div>
                        <div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-600 uppercase ml-2 text-left">KATA LALUAN</label><input type="password" title="password" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] outline-none text-left" placeholder="KATA LALUAN" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} /></div>
                    </div><button onClick={() => pushToCloud()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-900 text-center flex items-center justify-center gap-3 transition-all"><Save size={18} /> SIMPAN SEMUA TETAPAN</button></div>
                </div>
              )}

              {adminSubTab === 'session' && (
                <div className="max-w-xl text-left">
                   <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-xl border-b-[10px] border-indigo-200 space-y-8 text-left"><div className="flex items-center gap-4 text-indigo-950 border-b-2 border-slate-50 pb-6 text-left"><TrendingUp size={32} className="text-indigo-600 text-center"/><h3 className="text-xl font-black uppercase italic leading-none text-left">KAWALAN SESI SEKOLAH</h3></div><div className="space-y-4 text-center"><button onClick={() => { if (confirm("Semua murid akan naik kelas. Teruskan?")) { setMembers(prev => prev.map(m => m.type === 'Murid' && m.year ? { ...m, year: m.year + 1 } : m).filter(m => m.type === 'Guru' || (m.year && m.year <= 6))); pushToCloud(true); }}} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800 flex items-center justify-center gap-3 text-center"><ArrowUpCircle size={20}/> NAIK KELAS SEMUA MURID</button><button onClick={() => { if (confirm("Padam rekod transaksi?")) { setTransactions([]); pushToCloud(true); }}} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-rose-800 flex items-center justify-center gap-3 text-center"><RotateCcw size={20}/> PADAM REKOD TRANSAKSI</button></div></div>
                </div>
              )}

              {adminSubTab === 'damages' && (
                <div className="space-y-6 text-left">
                  <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-lg flex flex-col md:flex-row items-center gap-6 text-left"><div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner text-center"><Wallet size={32} /></div><div className="flex-1 text-center md:text-left"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic text-left">DENDA DIKUTIP</p><p className="text-4xl font-black text-emerald-600 text-left">RM {transactions.filter(t => t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Tunai').reduce((acc, t) => acc + (t.fineAmount || 0), 0).toFixed(2)}</p></div></div>
                  <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-lg text-left"><div className="overflow-x-auto text-left"><table className="w-full text-left"><thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b italic text-left"><tr><th className="px-6 py-4">NAMA AHLI</th><th className="px-6 py-4">BUKU</th><th className="px-6 py-4 text-center">AMAUN</th><th className="px-6 py-4 text-center">TINDAKAN</th></tr></thead><tbody className="divide-y text-[10px] font-bold text-indigo-950 bg-white text-left">{transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 text-left"><td className="px-6 py-4 uppercase font-black text-left">{t.userName}</td><td className="px-6 py-4 uppercase text-slate-500 text-left">{t.bookTitle}</td><td className="px-6 py-4 text-center text-rose-600">RM {t.fineAmount?.toFixed(2)}</td><td className="px-6 py-4 flex justify-center gap-2 text-center"><button onClick={() => { if(confirm("Tunai?")) handleResolveDamage(t.id, 'Tunai') }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase shadow-md text-center">TUNAI</button><button onClick={() => { if(confirm("Buku?")) handleResolveDamage(t.id, 'Buku') }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase shadow-md text-center">GANTI BUKU</button></td></tr>
                            ))}</tbody></table></div></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto space-y-8 text-left text-left">
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-10 shadow-xl text-center border-b-[12px] border-indigo-600 relative overflow-hidden group text-center"><div className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-xl rotate-3 border-2 border-white relative z-10 text-center">{userName.charAt(0)}</div><div className="relative z-10 text-center"><h3 className="text-3xl font-black text-[#0f172a] uppercase tracking-tighter mb-1 italic leading-none text-center">{userName}</h3><p className="text-[9px] font-black uppercase text-slate-400 mb-8 tracking-[0.3em] italic text-center">{isAdminAuthenticated ? 'ADMIN' : 'GURU'}</p></div><div className="grid grid-cols-2 gap-4 max-w-sm mx-auto relative z-10 text-center"><div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-100 shadow-sm text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-2 italic text-center">AKTIF</p><p className="text-3xl font-black text-indigo-600 leading-none text-center">{getActiveLoans(userName).length}</p></div><div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-slate-100 shadow-sm text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-2 italic text-center">AWAN</p><p className={`text-[10px] font-black ${syncStatus === 'online' ? 'text-emerald-600' : 'text-rose-600'} uppercase text-center`}>{syncStatus}</p></div></div></div>
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-lg overflow-hidden text-left"><div className="p-6 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between text-left"><h4 className="font-black text-indigo-950 uppercase text-xs italic text-left">REKOD PINJAMAN AKTIF ANDA</h4><span className="bg-indigo-100 px-3 py-1 rounded-full text-indigo-700 font-black text-[8px] uppercase text-center">{getActiveLoans(userName).length}</span></div><div className="p-6 space-y-4 text-left">{getActiveLoans(userName).map(loan => ( <div key={loan.id} className="p-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-400 transition-all text-left"><div className="flex-1 overflow-hidden pr-4 text-left"><p className="font-black text-indigo-950 text-[11px] uppercase truncate group-hover:text-indigo-600 text-left">{loan.bookTitle}</p><p className="text-[8px] font-black text-slate-400 italic mt-1 text-left">{loan.timestamp}</p></div><button onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg border-b-4 border-emerald-800 text-center">PULANGKAN</button></div> ))}{getActiveLoans(userName).length === 0 && ( <div className="text-center py-10 opacity-30 italic text-[10px] font-black text-center">Tiada rekod aktif</div> )}</div></div>
              <button onClick={handleLogout} className="md:hidden w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg border-b-4 border-rose-800 text-center">LOG KELUAR SISTEM</button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden text-left"><div className="p-8 border-b-2 border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 text-left"><div className="text-left"> <h3 className="text-2xl font-black text-indigo-900 uppercase italic text-left">LOG TRANSAKSI REAL-TIME</h3><p className="text-[9px] font-black text-slate-400 uppercase mt-1 text-left">Pangkalan data aktiviti sekolah</p></div><button onClick={() => window.print()} className="px-8 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-indigo-50 text-center"><Printer size={18} /> CETAK LAPORAN</button></div><div className="overflow-x-auto text-left"><table className="w-full text-left"><thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b italic text-left"><tr><th className="px-8 py-6">PEMINJAM</th><th className="px-8 py-6">BUKU</th><th className="px-8 py-6 text-center">STATUS</th><th className="px-8 py-6 text-right">MASA</th></tr></thead><tbody className="divide-y text-[10px] text-indigo-950 bg-white font-bold text-left">{transactions.map(t => ( <tr key={t.id} className="hover:bg-indigo-50/50 text-left"><td className="px-8 py-5 font-black uppercase text-left">{t.userName}</td><td className="px-8 py-5 uppercase truncate max-w-[200px] text-slate-500 text-left">{t.bookTitle}</td><td className="px-8 py-5 text-center"><span className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase border-2 ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 text-center' : 'bg-emerald-50 text-emerald-700 border-emerald-100 text-center'}`}>{t.action}</span></td><td className="px-8 py-5 text-slate-300 text-right italic text-right">{t.timestamp}</td></tr> ))}</tbody></table></div></div>
          )}
        </div>

        {/* --- MODALS --- */}
        {isEditingBook && bookToEdit && (
           <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 text-left"><div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border-b-[15px] border-indigo-600 text-left"><div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-slate-50 text-left"><h3 className="text-xl font-black uppercase italic text-indigo-950 text-left">EDIT DATA BUKU</h3><button onClick={() => setIsEditingBook(false)} className="p-2 text-slate-300 hover:text-rose-500 text-center"><X size={20} /></button></div><div className="space-y-6 text-left"><div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2 text-left">JUDUL</label><input type="text" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] outline-none text-left" value={bookToEdit.title} onChange={(e) => setBookToEdit({...bookToEdit, title: e.target.value.toUpperCase()})} /></div><div className="grid grid-cols-2 gap-4 text-left"><div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2 text-left">TAHUN</label><select className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] outline-none text-left" value={bookToEdit.year} onChange={(e) => setBookToEdit({...bookToEdit, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}</select></div><div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2 text-left">KATEGORI</label><select className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] outline-none text-left" value={bookToEdit.type} onChange={(e) => setBookToEdit({...bookToEdit, type: e.target.value as BookType})}>{CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4 text-left"><div className="space-y-1 text-left"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2 text-left">STOK</label><input type="number" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] text-left" value={bookToEdit.stock} onChange={(e) => setBookToEdit({...bookToEdit, stock: Number(e.target.value)})} /></div><div className="space-y-1 text-left"><label className="text-[9px] font-black text-emerald-600 uppercase ml-2 text-left">HARGA</label><input type="number" step="0.01" className="w-full px-5 py-4 rounded-xl border-2 bg-emerald-50 text-[10px] border-emerald-100 text-left" value={bookToEdit.price} onChange={(e) => setBookToEdit({...bookToEdit, price: Number(e.target.value)})} /></div></div><button onClick={handleUpdateBook} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800 text-center flex items-center justify-center gap-2"><Save size={20} /> KEMASKINI</button></div></div></div>
        )}

        {isMemberDetailOpen && selectedMemberDetail && (
           <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 text-left"><div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border-b-[15px] border-indigo-600 text-left"><div className="p-8 border-b bg-indigo-50/50 flex justify-between items-center text-left"><div className="flex items-center gap-4 text-left"><div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl text-center">{selectedMemberDetail.name.charAt(0)}</div><div className="text-left"><div className="flex items-center gap-2 text-left text-left">{!isEditingMemberName ? (<h3 className="text-xl font-black uppercase italic truncate max-w-[180px] text-left">{selectedMemberDetail.name}</h3>) : (<input type="text" className="bg-white border-2 border-indigo-300 px-3 py-1 rounded-lg font-black uppercase text-[10px] text-left" value={editedMemberName} onChange={(e) => setEditedMemberName(e.target.value.toUpperCase())} />)}<button onClick={() => isEditingMemberName ? handleUpdateMemberName() : setIsEditingMemberName(true)} className="p-2 text-indigo-400 text-center">{isEditingMemberName ? <CheckCircle size={18}/> : <Edit2 size={18}/>}</button></div><p className="text-[8px] font-black text-indigo-400 uppercase text-left">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• T${selectedMemberDetail.year}` : ''}</p></div></div><button onClick={() => setIsMemberDetailOpen(false)} className="p-2 text-slate-300 hover:text-rose-500 text-center"><X size={20} /></button></div><div className="p-8 overflow-y-auto max-h-[60vh] space-y-4 bg-white text-left text-left"><div className="flex justify-between items-center border-b pb-4 text-left"><h4 className="text-[10px] font-black uppercase italic text-left">Pinjaman Aktif</h4><button onClick={() => { setBorrowingMember(selectedMemberDetail); setIsBorrowModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase shadow-md text-center">TAMBAH</button></div><div className="space-y-3 text-left">{getActiveLoans(selectedMemberDetail.name).map(loan => (<div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl flex items-center justify-between text-left"><div className="flex-1 pr-4 text-left"><p className="font-black text-indigo-950 text-[10px] uppercase truncate text-left">{loan.bookTitle}</p></div><div className="flex gap-2 text-center"><button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-[8px] uppercase text-center">PULANG</button><button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-2 text-rose-500 bg-rose-50 rounded-lg text-center"><AlertTriangle size={16}/></button></div></div>))}</div></div><div className="p-6 bg-slate-50 border-t flex justify-end text-left"><button onClick={() => { if(confirm("Hapus?")) { setMembers(prev => prev.filter(m => m.id !== selectedMemberDetail.id)); setIsMemberDetailOpen(false); pushToCloud(); } }} className="text-rose-500 text-[8px] font-black uppercase flex items-center gap-2 hover:text-rose-700 text-center"><Trash2 size={16}/> PADAM AKAUN</button></div></div></div>
        )}

        {isBorrowModalOpen && borrowingMember && (
          <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 text-left"><div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col border-b-[15px] border-indigo-600 text-left"><div className="p-8 border-b flex justify-between items-center text-left"><div><h3 className="text-xl font-black uppercase italic text-left">Daftar Pinjaman</h3><div className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-lg mt-1 text-center">{borrowingMember.name}</div></div><button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="p-2 text-slate-300 hover:text-rose-500 text-center"><X size={24} /></button></div><div className="px-8 py-4 bg-slate-50 flex gap-4 text-left"><input type="text" placeholder="CARI..." className="flex-1 px-4 py-3 rounded-xl border font-black text-[10px] uppercase text-left" value={searchInLoan} onChange={(e) => setSearchInLoan(e.target.value.toUpperCase())} /><select className="px-4 py-3 rounded-xl border font-black text-[10px] text-left" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>{YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}</select></div><div className="p-8 overflow-y-auto max-h-[50vh] grid grid-cols-1 md:grid-cols-2 gap-3 text-left">{books.filter(b => (b.year === selectedYear) && (searchInLoan === '' || b.title.includes(searchInLoan))).map(book => { const isSelected = selectedBooksToBorrow.has(book.id); return (<div key={book.id} onClick={() => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center text-left ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-slate-50 hover:bg-indigo-50 text-left'}`}><div className="overflow-hidden text-left flex-1 text-left text-left"><h4 className="font-black text-[10px] uppercase truncate text-left">{book.title}</h4><p className="text-[8px] uppercase opacity-70 text-left">T{book.year} • STOK: {book.stock}</p></div>{isSelected && <CheckCircle size={16} className="text-right" />}</div>); })}</div><div className="p-8 border-t flex items-center justify-between text-left"><div className="text-[10px] font-black text-left">PILIHAN: {selectedBooksToBorrow.size} UNIT</div><button onClick={() => { Array.from(selectedBooksToBorrow).forEach(id => handleAction(id, 'Pinjaman', borrowingMember.name, borrowingMember.type, 1, true)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); pushToCloud(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg disabled:opacity-50 text-center" disabled={selectedBooksToBorrow.size === 0}>PINJAM SEKARANG</button></div></div></div>
        )}

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-100 px-8 py-4 flex justify-between z-40 rounded-t-[2rem] text-center">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 ${activeTab === 'inventory' ? 'text-indigo-600 font-black' : 'text-slate-300'} text-center`}><BookOpen size={24} /><span className="text-[8px] uppercase text-center">STOK</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600 font-black' : 'text-slate-300'} text-center`}><History size={24} /><span className="text-[8px] uppercase text-center">LOG</span></button>
           <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-indigo-600 font-black' : 'text-slate-300'} text-center`}><UserCircle size={24} /><span className="text-[8px] uppercase text-center">AKAUN</span></button>
           {isAdminAuthenticated && (<button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-emerald-600 font-black' : 'text-slate-300'} text-center`}><LayoutDashboard size={24} /><span className="text-[8px] uppercase text-center">ADMIN</span></button>)}
        </div>

        {activeTab === 'inventory' && (
          <button onClick={fetchAiInsight} className="fixed bottom-24 right-6 w-12 h-12 bg-indigo-600 text-white rounded-xl shadow-2xl flex items-center justify-center animate-bounce z-50 md:bottom-10 text-center"><Sparkles size={24} /></button>
        )}
      </main>
    </div>
  );
};

export default App;