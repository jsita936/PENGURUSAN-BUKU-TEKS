import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Book, 
  Transaction, 
  UserType, 
  TransactionStatus, 
  ActionType, 
  BookType, 
  Member, 
  AdminSettings, 
  ResolutionMethod, 
  ResolutionStatus 
} from './types';
import { INITIAL_BOOKS, YEARS } from './constants';
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
  Search,
  Wallet,
  ShieldCheck,
  Globe,
  ShieldAlert,
  Package,
  ArrowUpRight,
  Filter,
  MoreVertical
} from 'lucide-react';

type AuthView = 'landing' | 'guru_auth' | 'admin_auth' | 'setup' | 'main';

const App: React.FC = () => {
  // --- States Utama ---
  const [authView, setAuthView] = useState<AuthView>('landing');
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'admin' | 'profile'>('inventory');
  const [inventoryView, setInventoryView] = useState<'Guru' | 'Murid'>('Guru');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'inventori' | 'members' | 'damages' | 'system'>('overview');
  
  // --- Tetapan & Auth ---
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    schoolName: '', adminName: 'ADMIN', adminId: '', adminPass: '', isRegistered: false
  });
  const [userName, setUserName] = useState('');
  const [selectedGuruFromList, setSelectedGuruFromList] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // --- UI States ---
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'verifying'>('verifying');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
  
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });

  const syncKeyRef = useRef<string | null>(localStorage.getItem('spbt_cloud_sync_key'));
  const lastSyncTimestamp = useRef<number>(0);

  // --- Cloud Sync Logic ---
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
        r: adminSettings.isRegistered,
        b: books.map(b => [b.id, b.stock, b.price, b.title, b.year, b.type, b.subject]), 
        m: members.map(m => [m.id, m.name, m.type === 'Guru' ? 0 : 1, m.year]),
        t: transactions.slice(0, 500),
        v: v 
      };
      
      const response = await fetch(`https://api.keyvalue.xyz/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Sync Error");
      lastSyncTimestamp.current = v;
      setSyncStatus('online');
    } catch (e) {
      setSyncStatus('offline');
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const pullFromCloud = async (targetKey?: string, silent = false) => {
    const key = targetKey || syncKeyRef.current;
    if (!key) {
      setSyncStatus('offline');
      setIsInitialLoad(false);
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
          adminName: data.n || 'ADMIN',
          adminId: data.i || '',
          adminPass: data.p || '',
          isRegistered: data.r ?? true
        });

        if (data.b) {
          setBooks(data.b.map((db: any) => ({
            id: db[0], stock: db[1], price: db[2], title: db[3], year: db[4], type: db[5], subject: db[6]
          })));
        }

        if (data.m) {
          setMembers(data.m.map((am: any) => ({
            id: am[0], name: am[1], type: am[2] === 0 ? 'Guru' : 'Murid', year: am[3]
          })));
        }
        
        if (data.t) setTransactions(data.t);

        lastSyncTimestamp.current = data.v;
        syncKeyRef.current = key;
        localStorage.setItem('spbt_cloud_sync_key', key);
        setSyncStatus('online');
      }
    } catch (e) {
      setSyncStatus('offline');
    } finally {
      if (!silent) setIsSyncing(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    const keyFromHash = window.location.hash.includes('cloud=') ? window.location.hash.split('cloud=')[1] : null;
    const key = keyFromHash || localStorage.getItem('spbt_cloud_sync_key');
    
    if (key) {
      syncKeyRef.current = key;
      pullFromCloud(key, false).then(() => {
        const savedName = localStorage.getItem('spbt_user_name');
        if (savedName) {
           setUserName(savedName);
           if (savedName === 'ADMIN') setIsAdminAuthenticated(true);
           setAuthView('main');
        }
      });
      const interval = setInterval(() => pullFromCloud(key, true), 8000);
      return () => clearInterval(interval);
    } else {
      setIsInitialLoad(false);
    }
  }, []);

  // --- Handlers ---
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminIdInput === adminSettings.adminId && adminPasswordInput === adminSettings.adminPass) {
      setIsAdminAuthenticated(true);
      setUserName('ADMIN');
      localStorage.setItem('spbt_user_name', 'ADMIN');
      setAuthView('main');
      setActiveTab('admin');
    } else {
      alert("ID atau Kata Laluan Admin Salah!");
    }
  };

  const handleGuruLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuruFromList) {
      alert("Sila pilih nama anda.");
      return;
    }
    setUserName(selectedGuruFromList);
    localStorage.setItem('spbt_user_name', selectedGuruFromList);
    setAuthView('main');
  };

  const handleLogout = () => {
    if (confirm("Adakah anda pasti ingin log keluar?")) {
      localStorage.removeItem('spbt_user_name');
      setIsAdminAuthenticated(false);
      setUserName('');
      setAuthView('landing');
    }
  };

  const fetchAiInsight = async () => {
    setIsAiLoading(true);
    try {
      const insight = await getStockInsight(books, transactions);
      setAiInsight(insight || "Tiada analisa tersedia.");
    } catch (err) {
      setAiInsight("Ralat semasa mendapatkan analisa AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddNewBook = () => {
    if (!newBook.title) {
      alert("Sila isi judul buku.");
      return;
    }
    const book: Book = {
      id: Math.random().toString(36).substr(2, 9),
      title: newBook.title.toUpperCase(),
      year: newBook.year || 1,
      type: (newBook.type as BookType) || 'Buku Teks',
      stock: Number(newBook.stock) || 0,
      subject: 'LAIN',
      price: Number(newBook.price) || 0
    };
    setBooks(prev => [...prev, book]);
    setIsAddingBook(false);
    setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
    setTimeout(() => pushToCloud(true), 200);
  };

  const handleUpdateBook = () => {
    if (!bookToEdit) return;
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? (bookToEdit as Book) : b));
    setIsEditingBook(false);
    setBookToEdit(null);
    setTimeout(() => pushToCloud(true), 200);
  };

  const handleAddMember = () => {
    if (!newMember.name) {
      alert("Sila isi nama ahli.");
      return;
    }
    const member: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMember.name.toUpperCase(),
      type: (newMember.type as UserType) || 'Murid',
      year: newMember.year
    };
    setMembers(prev => [...prev, member]);
    setIsAddingMember(false);
    setNewMember({ name: '', type: 'Guru', year: 1 });
    setTimeout(() => pushToCloud(true), 200);
  };

  const getActiveLoans = useCallback((name: string) => {
    const userTransactions = transactions.filter(t => t.userName === name);
    const possession: Record<string, { count: number; lastTrans: Transaction }> = {};
    
    [...userTransactions].reverse().forEach(t => {
      if (!possession[t.bookId]) possession[t.bookId] = { count: 0, lastTrans: t };
      if (t.action === 'Pinjaman') possession[t.bookId].count += t.quantity;
      else if (t.action === 'Pemulangan' || t.action === 'Pulang Rosak/Hilang') possession[t.bookId].count -= t.quantity;
    });

    return Object.values(possession).filter(p => p.count > 0).map(p => p.lastTrans);
  }, [transactions]);

  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    if (action === 'Pinjaman' && book.stock < qty) {
      alert(`Stok ${book.title} tidak mencukupi.`);
      return;
    }
    
    let stockChange = (action === 'Pinjaman') ? -qty : (action === 'Pemulangan' ? qty : 0);
    let status: TransactionStatus = 'Berjaya';
    let resStatus: ResolutionStatus | undefined;
    if (action === 'Pulang Rosak/Hilang') { status = 'Rosak/Hilang'; resStatus = 'Tertunggak'; }

    const newTrans: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      bookId, bookTitle: book.title, userName: targetUser, userType: targetType, quantity: qty,
      timestamp: new Date().toLocaleString('ms-MY'), createdAt: Date.now(), action, status,
      resolutionStatus: resStatus, fineAmount: action === 'Pulang Rosak/Hilang' ? book.price : 0
    };

    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: Math.max(0, b.stock + stockChange) } : b));
    setTransactions(prev => [newTrans, ...prev]);
    setTimeout(() => pushToCloud(true), 200);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } : t
    ));
    pushToCloud(true);
  };

  const handleGenerateSyncLink = async () => {
    if (!adminSettings.schoolName || !adminSettings.adminId) {
      alert("Sila lengkapkan profil sekolah dahulu.");
      return;
    }
    let key = syncKeyRef.current;
    if (!key) {
      key = btoa(unescape(encodeURIComponent(`${adminSettings.schoolName}_${adminSettings.adminId}`.toLowerCase()))).replace(/[/+=]/g, '').substring(0, 10);
      syncKeyRef.current = key;
      localStorage.setItem('spbt_cloud_sync_key', key);
    }
    await pushToCloud();
    const shareUrl = `${window.location.origin}${window.location.pathname}#cloud=${key}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert("Pautan Cloud disalin! Berikan kepada guru lain."));
  };

  // --- UI Logic ---
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchYear = b.year === selectedYear;
      const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchYear && matchSearch;
    }).sort((a,b) => a.title.localeCompare(b.title));
  }, [books, selectedYear, searchQuery]);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-6 text-white font-black uppercase tracking-widest text-xs">
        <Library size={48} className="animate-bounce mb-6 text-indigo-400" />
        Sila Tunggu... Mengesahkan Data Cloud Sekolah...
      </div>
    );
  }

  // --- Auth Screens ---
  if (authView === 'landing') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full" />
        
        <div className="max-w-4xl w-full text-center space-y-12 z-10">
          <div className="space-y-6 animate-in fade-in duration-1000">
             <div className="w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(79,70,229,0.4)] border-4 border-white/10">
               <Library size={56} />
             </div>
             <div>
                <h1 className="text-7xl font-black tracking-tighter uppercase italic leading-none">E-SPBT PINTAR</h1>
                <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-xs mt-3">Sistem Pengurusan Buku Teks Versi 2.0</p>
             </div>
             <div className="flex items-center justify-center gap-3 bg-white/5 w-fit mx-auto px-5 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <p className="text-[10px] font-black uppercase tracking-widest">{syncStatus === 'online' ? (adminSettings.schoolName || 'CLOUD AKTIF') : 'MOD OFFLINE'}</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-12">
            <button 
              onClick={() => adminSettings.isRegistered ? setAuthView('admin_auth') : setAuthView('setup')} 
              className="bg-white/5 backdrop-blur-xl border-2 border-white/10 p-12 rounded-[3.5rem] text-left hover:bg-white/10 transition-all group shadow-2xl hover:border-indigo-500/50"
            >
              <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition">
                <Lock size={28} />
              </div>
              <h3 className="text-2xl font-black uppercase text-white">Portal Admin</h3>
              <p className="text-indigo-200/60 text-sm mt-2">Urus stok, daftar guru & kunci keselamatan pangkalan data.</p>
              <div className="mt-10 flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">
                MASUK <ArrowRight size={16} className="group-hover:translate-x-2 transition" />
              </div>
            </button>

            <button 
              onClick={() => setAuthView('guru_auth')} 
              className="bg-white/5 backdrop-blur-xl border-2 border-white/10 p-12 rounded-[3.5rem] text-left hover:bg-white/10 transition-all group shadow-2xl hover:border-emerald-500/50"
            >
              <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition">
                <UserCircle size={28} />
              </div>
              <h3 className="text-2xl font-black uppercase text-white">Log Masuk Guru</h3>
              <p className="text-indigo-200/60 text-sm mt-2">Pilih nama anda untuk mula meminjam atau memulangkan buku.</p>
              <div className="mt-10 flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest">
                MASUK <ArrowRight size={16} className="group-hover:translate-x-2 transition" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (['setup', 'admin_auth', 'guru_auth'].includes(authView)) {
    const isGuru = authView === 'guru_auth';
    const isSetup = authView === 'setup';
    const registeredGurus = members.filter(m => m.type === 'Guru').sort((a,b) => a.name.localeCompare(b.name));

    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.4)] w-full max-w-md border-b-[12px] border-indigo-600 animate-in zoom-in duration-300">
          <div className="text-center mb-10">
             <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-indigo-100">
               {isGuru ? <UserCircle size={32} /> : <ShieldCheck size={32} />}
             </div>
             <h3 className="text-3xl font-black text-[#0f172a] uppercase tracking-tighter leading-tight italic">
               {isSetup ? 'DAFTAR SEKOLAH' : isGuru ? 'LOG MASUK GURU' : 'PENGESAHAN ADMIN'}
             </h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Sila sahkan identiti anda di bawah</p>
          </div>

          <form onSubmit={isGuru ? handleGuruLogin : (isSetup ? (e) => { e.preventDefault(); setAdminSettings({...adminSettings, isRegistered: true}); setAuthView('admin_auth'); } : handleAdminAuth)} className="space-y-6">
            {isSetup ? (
              <div className="space-y-4">
                <div className="relative">
                   <label className="text-[8px] font-black text-indigo-400 uppercase absolute top-2 left-6">Nama Sekolah</label>
                   <input type="text" required className="w-full px-6 pt-7 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                </div>
                <div className="relative">
                   <label className="text-[8px] font-black text-indigo-400 uppercase absolute top-2 left-6">ID Admin Pilihan</label>
                   <input type="text" required className="w-full px-6 pt-7 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} />
                </div>
                <div className="relative">
                   <label className="text-[8px] font-black text-indigo-400 uppercase absolute top-2 left-6">Katalaluan</label>
                   <input type="password" required className="w-full px-6 pt-7 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black text-indigo-950 outline-none focus:border-indigo-600" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} />
                </div>
              </div>
            ) : isGuru ? (
              <div className="space-y-4">
                <div className="relative">
                   <label className="text-[10px] font-black text-indigo-400 uppercase absolute top-2 left-6">Pilih Nama Anda</label>
                   <select required className="w-full px-6 pt-7 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600 appearance-none shadow-inner" value={selectedGuruFromList} onChange={(e) => setSelectedGuruFromList(e.target.value)}>
                      <option value="">-- SILA PILIH --</option>
                      {registeredGurus.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                   </select>
                   <ChevronDown size={20} className="absolute right-6 top-[55%] text-indigo-300 pointer-events-none" />
                </div>
                {registeredGurus.length === 0 && (
                  <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center gap-4 animate-pulse">
                    <ShieldAlert className="text-rose-500 shrink-0" size={24} />
                    <p className="text-[10px] font-black text-rose-600 uppercase leading-relaxed italic">Amaran: Tiada guru berdaftar dikesan di Cloud. Sila hubungi Admin SPBT untuk daftar nama anda.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                   <label className="text-[8px] font-black text-indigo-400 uppercase absolute top-2 left-6">ID Pentadbir</label>
                   <input type="text" required className="w-full px-6 pt-7 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600" value={adminIdInput} onChange={(e) => setAdminIdInput(e.target.value)} />
                </div>
                <div className="relative">
                   <label className="text-[8px] font-black text-indigo-400 uppercase absolute top-2 left-6">Kata Laluan</label>
                   <input type="password" required className="w-full px-6 pt-7 pb-3 rounded-[1.5rem] border-2 bg-slate-50 font-black text-indigo-950 outline-none focus:border-indigo-600" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} />
                </div>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={isGuru && registeredGurus.length === 0}
              className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-indigo-700 transition-all uppercase shadow-[0_15px_30px_rgba(79,70,229,0.3)] disabled:opacity-30 disabled:cursor-not-allowed border-b-8 border-indigo-800 active:translate-y-1 active:border-b-0"
            >
              MASUK SISTEM
            </button>
            <button type="button" onClick={() => setAuthView('landing')} className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition">Kembali Ke Muka Depan</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f1f5f9] text-[#0f172a] overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* Sidebar Desktop */}
      <nav className="hidden md:flex w-80 bg-[#0f172a] text-white flex-col shrink-0 shadow-2xl z-30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full" />
        
        <div className="p-10 border-b border-white/5 flex items-center gap-4 relative">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Library size={28} />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-black text-lg tracking-tighter uppercase leading-none italic">E-SPBT PINTAR</h1>
            <p className="text-[8px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1 truncate">{adminSettings.schoolName || 'SISTEM BUKU'}</p>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-3 mt-6 relative">
          {[
            { id: 'inventory', icon: BookOpen, label: 'BILIK BUKU' },
            { id: 'history', icon: History, label: 'LOG REKOD' },
            { id: 'profile', icon: UserCircle, label: 'AKAUN SAYA' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all relative group ${activeTab === item.id ? 'bg-indigo-600 text-white font-black shadow-xl shadow-indigo-600/20 scale-[1.02]' : 'text-indigo-200/40 hover:text-white hover:bg-white/5 font-bold'}`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'animate-pulse' : ''} />
              <span className="text-[11px] uppercase tracking-widest">{item.label}</span>
              {activeTab === item.id && <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-full" />}
            </button>
          ))}

          {isAdminAuthenticated && (
            <div className="pt-8 mt-8 border-t border-white/5">
              <button 
                onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} 
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all group ${activeTab === 'admin' ? 'bg-emerald-600 text-white font-black shadow-xl shadow-emerald-600/20 scale-[1.02]' : 'text-indigo-200/40 hover:text-white hover:bg-white/5 font-bold'}`}
              >
                <LayoutDashboard size={22} />
                <span className="text-[11px] uppercase tracking-widest">PANEL ADMIN</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-md relative">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-300 font-black">{userName.charAt(0)}</div>
             <div className="overflow-hidden">
                <p className="text-[10px] font-black uppercase text-white truncate italic">{userName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest">{syncStatus}</p>
                </div>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full py-4 bg-rose-500/10 text-rose-400 rounded-2xl text-[10px] font-black border border-rose-500/20 uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-lg">LOG KELUAR</button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-200 px-8 md:px-12 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-5">
             <div className="md:hidden w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Library size={20} />
             </div>
             <div>
                <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tighter italic">
                  {activeTab === 'inventory' ? 'INVENTORI BUKU' : activeTab === 'admin' ? `PENTADBIR > ${adminSubTab.toUpperCase()}` : activeTab.toUpperCase()}
                </h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Sekolah Kebangsaan Pintar SPBT</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-full">
               <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{syncStatus === 'online' ? 'Cloud Online' : 'Cloud Offline'}</span>
            </div>
            <button onClick={() => pullFromCloud(undefined, false)} className={`p-3.5 bg-white border-2 border-slate-100 rounded-2xl transition-all shadow-sm ${isSyncing ? 'animate-spin border-indigo-600 text-indigo-600' : 'text-slate-400 hover:border-indigo-600 hover:text-indigo-600'}`} title="Penyelarasan Manual"><RefreshCw size={20} /></button>
            
            {/* Fix: Added Logout button for mobile users in header */}
            <button onClick={handleLogout} className="md:hidden p-3.5 bg-rose-50 text-rose-600 border-2 border-rose-100 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" title="Log Keluar">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 bg-[#f8fafc] scroll-smooth no-scrollbar">
          {activeTab === 'inventory' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="bg-white p-2 rounded-[2rem] border-2 border-slate-200 shadow-sm flex gap-2">
                  <button onClick={() => setInventoryView('Guru')} className={`px-10 py-4 rounded-2xl font-black text-[11px] uppercase transition-all ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>STAF GURU</button>
                  <button onClick={() => setInventoryView('Murid')} className={`px-10 py-4 rounded-2xl font-black text-[11px] uppercase transition-all ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>PENGURUSAN MURID</button>
                </div>

                <div className="w-full lg:max-w-md relative group">
                   <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition" />
                   <input 
                    type="text" 
                    placeholder="CARI JUDUL BUKU..." 
                    className="w-full pl-14 pr-8 py-5 bg-white rounded-[1.8rem] border-2 border-slate-200 font-black text-[11px] outline-none focus:border-indigo-600 shadow-sm focus:shadow-xl transition-all uppercase"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 bg-white/50 p-4 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  {YEARS.map(y => (
                    <button 
                      key={y} 
                      onClick={() => setSelectedYear(y)} 
                      className={`min-w-[70px] h-[70px] shrink-0 rounded-[1.5rem] font-black transition-all uppercase text-[11px] flex flex-col items-center justify-center border-2 ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-xl shadow-indigo-600/20 scale-110 rotate-2' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                      <span className="text-[8px] opacity-60">TAHUN</span>
                      <span className="text-lg">{y}</span>
                    </button>
                  ))}
              </div>

              {inventoryView === 'Guru' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredBooks.map(book => {
                    const hasBorrowed = getActiveLoans(userName).some(l => l.bookId === book.id);
                    return (
                      <div key={book.id} className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm hover:shadow-2xl hover:border-indigo-400 transition-all group relative flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-6">
                             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs border-2 border-indigo-100">T{book.year}</div>
                             <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">RM{book.price.toFixed(2)}</span>
                          </div>
                          <h4 className="font-black text-indigo-950 text-[13px] uppercase h-12 overflow-hidden leading-tight group-hover:text-indigo-600 mb-6">{book.title}</h4>
                          <div className="bg-slate-50 rounded-3xl p-5 mb-8 flex justify-between items-center shadow-inner">
                             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">STOK</p>
                             <p className={`font-black text-2xl ${book.stock < 15 ? 'text-rose-600 animate-pulse' : 'text-indigo-600'}`}>{book.stock}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-700 transition shadow-lg border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0">PINJAM</button>
                          <button disabled={!hasBorrowed} onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg border-b-4 ${hasBorrowed ? 'bg-emerald-600 text-white border-emerald-800' : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'}`}>PULANG</button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredBooks.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-200">
                       <Package size={48} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-sm font-black text-slate-300 uppercase italic tracking-[0.2em]">Tiada buku dijumpai untuk Tahun {selectedYear}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {members.filter(m => m.type === 'Murid' && m.year === selectedYear).sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                    <div 
                      key={student.id} 
                      onClick={() => { setSelectedMemberDetail(student); setIsMemberDetailOpen(true); }} 
                      className="bg-white rounded-[3rem] border-2 border-slate-100 p-8 flex justify-between items-center group cursor-pointer hover:border-indigo-400 hover:shadow-2xl transition-all shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-150 transition-all duration-700" />
                      
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-600/20 group-hover:rotate-6 transition-all">{student.name.charAt(0)}</div>
                        <div className="flex-1 overflow-hidden text-left">
                          <h4 className="font-black text-indigo-950 uppercase text-[12px] truncate w-40 group-hover:text-indigo-600">{student.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <BookOpen size={12} className="text-slate-400" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">{getActiveLoans(student.name).length} PINJAMAN AKTIF</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm z-10">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  ))}
                  {members.filter(m => m.type === 'Murid' && m.year === selectedYear).length === 0 && (
                    <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-200">
                       <UserCircle size={48} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-sm font-black text-slate-300 uppercase italic tracking-[0.2em]">Belum ada murid didaftarkan</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex overflow-x-auto gap-3 no-scrollbar bg-white p-3 rounded-[2.2rem] border-2 shadow-xl shadow-slate-200/50 border-slate-100">
                  {[
                    { id: 'overview', label: 'RUMUSAN', icon: LayoutDashboard },
                    { id: 'inventori', label: 'INVENTORI BUKU', icon: Package },
                    { id: 'members', label: 'AHLI & GURU', icon: UserPlus },
                    { id: 'damages', label: 'REKOD HILANG', icon: AlertTriangle },
                    { id: 'system', label: 'SISTEM CLOUD', icon: ShieldCheck }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setAdminSubTab(tab.id as any)} 
                      className={`px-8 py-4 text-[11px] font-black rounded-2xl transition-all uppercase flex items-center gap-3 whitespace-nowrap ${adminSubTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105 rotate-1' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                    </button>
                  ))}
              </div>

              {adminSubTab === 'overview' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in zoom-in duration-500">
                     {[
                       { label: 'TOTAL STOK BUKU', val: books.reduce((acc, b) => acc + Number(b.stock), 0), color: 'indigo', icon: Package },
                       { label: 'PINJAMAN AKTIF', val: transactions.filter(t => t.action === 'Pinjaman').length, color: 'emerald', icon: BookOpen },
                       { label: 'KES ROSAK/HILANG', val: transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length, color: 'rose', icon: AlertTriangle },
                       { label: 'JUMLAH AHLI', val: members.length, color: 'amber', icon: UserCircle }
                     ].map((card, i) => (
                       <div key={i} className={`bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group`}>
                         <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-${card.color}-600`}><card.icon size={80} /></div>
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] italic">{card.label}</p>
                         <p className={`text-5xl font-black text-${card.color === 'indigo' ? 'indigo-600' : card.color === 'emerald' ? 'emerald-600' : card.color === 'rose' ? 'rose-600' : 'amber-600'} leading-none tracking-tighter`}>{card.val}</p>
                       </div>
                     ))}
                  </div>

                  <div className="bg-[#0f172a] p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 to-transparent" />
                     <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className={`w-28 h-28 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-indigo-400 shadow-2xl backdrop-blur-md ${isAiLoading ? 'animate-spin' : ''}`}>
                          <Sparkles size={48} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                           <h3 className="text-3xl font-black uppercase tracking-tighter italic">ANALISA PINTAR AI</h3>
                           <p className="text-indigo-200/50 font-bold uppercase text-[10px] tracking-widest mt-2">Dapatkan rumusan stok & tindakan kritikal daripada sistem Gemini.</p>
                        </div>
                        <button 
                          onClick={fetchAiInsight} 
                          disabled={isAiLoading}
                          className="px-10 py-5 bg-white text-indigo-950 rounded-3xl font-black uppercase text-xs hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                        >
                          MULA ANALISA SEKARANG
                        </button>
                     </div>
                     {aiInsight && (
                       <div className="mt-12 p-10 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl animate-in slide-in-from-bottom-10">
                          <div className="flex items-center gap-3 text-indigo-400 font-black uppercase text-[11px] mb-6 tracking-widest">
                            <Sparkles size={20} /> RUMUSAN AI UNTUK ANDA:
                          </div>
                          <p className="text-indigo-50/80 text-sm font-bold leading-relaxed whitespace-pre-wrap italic text-left">{aiInsight}</p>
                       </div>
                     )}
                  </div>
                </div>
              )}

              {adminSubTab === 'inventori' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-10">
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                     <div className="text-left">
                        <h3 className="text-2xl font-black uppercase text-indigo-950 tracking-tighter italic leading-none">PENGURUSAN INVENTORI</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Urus buku teks, buku aktiviti & rujukan</p>
                     </div>
                     <button 
                      onClick={() => { setIsAddingBook(true); setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 }); }} 
                      className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] shadow-2xl flex items-center gap-4 hover:bg-indigo-700 transition-all border-b-8 border-indigo-900 active:translate-y-1 active:border-b-0"
                     >
                        <BookPlus size={24}/> DAFTAR BUKU BARU
                     </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {books.sort((a,b) => a.year - b.year || a.title.localeCompare(b.title)).map(book => (
                      <div key={book.id} className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between group hover:border-indigo-400 hover:shadow-2xl transition-all shadow-sm">
                         <div className="flex-1 pr-6 mb-6 sm:mb-0 text-center sm:text-left flex items-center gap-8">
                            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center font-black text-xl text-slate-400 border-2 border-slate-200">T{book.year}</div>
                            <div>
                               <h4 className="font-black text-sm uppercase text-indigo-950 group-hover:text-indigo-600 leading-tight">{book.title}</h4>
                               <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-3">
                                 <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">HARGA: RM {book.price.toFixed(2)}</span>
                                 <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase border border-slate-100">{book.type.toUpperCase()}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-10">
                            <div className="text-center w-20">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest italic">STOK</p>
                               <p className={`font-black text-3xl ${book.stock < 15 ? 'text-rose-600' : 'text-indigo-900'}`}>{book.stock}</p>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => { setBookToEdit({...book}); setIsEditingBook(true); }} className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-slate-100"><Edit2 size={22}/></button>
                              <button onClick={() => { if(confirm("Hapus buku ini secara kekal?")) { setBooks(prev => prev.filter(b => b.id !== book.id)); pushToCloud(true); }}} className="p-4 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100"><Trash2 size={22}/></button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'members' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-10">
                   <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
                      <div className="bg-white p-2 rounded-[2rem] border-2 border-slate-200 shadow-sm flex gap-2">
                        <button onClick={() => setInventoryView('Guru')} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>STAF GURU</button>
                        <button onClick={() => setInventoryView('Murid')} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>SENARAI MURID</button>
                      </div>
                      <button 
                        onClick={() => { setNewMember({ type: inventoryView, year: inventoryView === 'Murid' ? selectedYear : undefined, name: '' }); setIsAddingMember(true); }} 
                        className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] flex items-center gap-4 shadow-2xl hover:bg-indigo-700 transition-all border-b-8 border-indigo-900 active:translate-y-1 active:border-b-0"
                      >
                        <UserPlus size={24}/> DAFTAR AHLI BARU
                      </button>
                   </div>
                   
                   {inventoryView === 'Murid' && (
                      <div className="flex bg-white p-3 rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-3">
                        {YEARS.map(y => (
                          <button 
                            key={y} 
                            onClick={() => setSelectedYear(y)} 
                            className={`flex-1 min-w-[100px] py-4 rounded-2xl font-black uppercase text-[11px] transition-all ${selectedYear === y ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-indigo-950 hover:bg-indigo-50'}`}
                          >
                            TAHUN {y}
                          </button>
                        ))}
                      </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {members.filter(m => m.type === inventoryView && (inventoryView === 'Guru' || m.year === selectedYear)).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                        <div 
                          key={m.id} 
                          onClick={() => { setSelectedMemberDetail(m); setIsMemberDetailOpen(true); }} 
                          className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-2xl transition-all shadow-sm group relative overflow-hidden"
                        >
                           <div className="flex items-center gap-5 relative z-10">
                              <div className="w-16 h-16 bg-indigo-50 text-indigo-700 rounded-[1.5rem] flex items-center justify-center font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">{m.name.charAt(0)}</div>
                              <div className="text-left overflow-hidden">
                                <h4 className="font-black text-[12px] uppercase text-indigo-950 truncate w-32 group-hover:text-indigo-600">{m.name}</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">BERDAFTAR</p>
                              </div>
                           </div>
                           <ChevronRight size={22} className="text-slate-200 group-hover:text-indigo-600 transition relative z-10" />
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {adminSubTab === 'damages' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-10">
                  <div className="bg-white rounded-[4rem] p-12 border-2 border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-10">
                    <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-[2.5rem] flex items-center justify-center shadow-inner"><Wallet size={48} /></div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 italic">JUMLAH DENDA DIKUTIP (TUNAI)</p>
                      <p className="text-6xl font-black text-emerald-600 leading-tight tracking-tighter">RM {transactions.filter(t => t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Tunai').reduce((acc, t) => acc + (t.fineAmount || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b tracking-widest italic">
                            <tr><th className="px-10 py-8">NAMA AHLI</th><th className="px-10 py-8">JUDUL BUKU</th><th className="px-10 py-8">AMAUN GANTI</th><th className="px-10 py-8 text-center">TINDAKAN</th></tr>
                        </thead>
                        <tbody className="divide-y text-[12px] font-bold text-indigo-950 bg-white">
                            {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-10 py-8 uppercase font-black">{t.userName}</td>
                                <td className="px-10 py-8 uppercase text-slate-500">{t.bookTitle}</td>
                                <td className="px-10 py-8 text-rose-600 font-black">RM {t.fineAmount?.toFixed(2)}</td>
                                <td className="px-10 py-8 flex justify-center gap-3">
                                  <button onClick={() => { if(confirm("Terima bayaran tunai?")) handleResolveDamage(t.id, 'Tunai') }} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg border-b-4 border-emerald-800">TUNAI</button>
                                  <button onClick={() => { if(confirm("Buku telah diganti baru?")) handleResolveDamage(t.id, 'Buku') }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg border-b-4 border-indigo-800">GANTI BUKU</button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length === 0 && (
                        <div className="p-32 text-center text-[12px] font-black text-slate-200 uppercase tracking-widest italic">TIADA KES TERTUNGGAK</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {adminSubTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-10">
                  <div className="bg-[#0f172a] rounded-[4rem] p-12 text-white shadow-2xl flex flex-col justify-between border-b-[15px] border-indigo-950 group">
                    <div>
                      <div className="flex items-center gap-5 mb-10 pb-10 border-b border-white/5">
                        <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400"><Globe size={32} /></div>
                        <div>
                          <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">KAWALAN CLOUD</h3>
                          <p className="text-[10px] font-black text-indigo-300 opacity-50 uppercase tracking-widest mt-2">Penyelarasan Data Sekolah</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-indigo-200/50 mb-12 uppercase leading-relaxed tracking-widest italic text-left">Gunakan pautan ini untuk membenarkan semua guru berkongsi pangkalan data yang sama secara automatik.</p>
                    </div>
                    <div className="space-y-6">
                      <button 
                        onClick={handleGenerateSyncLink} 
                        disabled={isSyncing} 
                        className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl flex items-center justify-center gap-4 transition-all hover:bg-indigo-500 active:translate-y-1 border-b-8 border-indigo-800"
                      >
                        <Share2 size={24}/> {localStorage.getItem('spbt_cloud_sync_key') ? 'SALIN PAUTAN KONGSI' : 'AKTIFKAN CLOUD ONLINE'}
                      </button>
                      {localStorage.getItem('spbt_cloud_sync_key') && (
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] opacity-40">KEY AKTIF: {localStorage.getItem('spbt_cloud_sync_key')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-[4rem] border-2 border-slate-100 p-12 shadow-2xl border-b-[15px] border-slate-200">
                    <div className="flex items-center gap-5 mb-10 pb-10 border-b border-slate-50 text-left">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><ShieldCheck size={32} /></div>
                      <div>
                        <h3 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter italic leading-none">PROFIL ADMIN</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Tetapan Kredential Penuh</p>
                      </div>
                    </div>
                    <div className="space-y-6 mb-12 text-left">
                       <div className="relative">
                          <label className="text-[9px] font-black text-slate-400 uppercase absolute left-6 top-3 tracking-widest">NAMA PENUH SEKOLAH</label>
                          <input type="text" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none shadow-inner" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                       </div>
                       <div className="relative">
                          <label className="text-[9px] font-black text-slate-400 uppercase absolute left-6 top-3 tracking-widest">ID LOGIN ADMIN</label>
                          <input type="text" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none shadow-inner" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} />
                       </div>
                       <div className="relative">
                          <label className="text-[9px] font-black text-slate-400 uppercase absolute left-6 top-3 tracking-widest">KATA LALUAN</label>
                          <input type="text" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none shadow-inner" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} />
                       </div>
                    </div>
                    <button onClick={() => { pushToCloud(); alert("Profil sekolah telah diselaraskan ke Cloud!"); }} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl hover:bg-indigo-700 active:translate-y-1 border-b-8 border-indigo-900 flex items-center justify-center gap-4 transition-all">
                       <Save size={24} /> SIMPAN TETAPAN
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700 text-left">
              <div className="bg-white rounded-[4rem] border-2 border-slate-100 p-14 shadow-2xl text-center border-b-[15px] border-indigo-600 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700" />
                <div className="w-28 h-28 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center text-5xl font-black mx-auto mb-10 shadow-2xl shadow-indigo-600/20 rotate-3 border-4 border-white relative z-10">{userName.charAt(0)}</div>
                <div className="relative z-10">
                   <h3 className="text-4xl font-black text-[#0f172a] uppercase tracking-tighter mb-2 italic leading-none">{userName}</h3>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-12 tracking-[0.4em] italic">{isAdminAuthenticated ? 'ADMIN SISTEM SPBT' : 'GURU BERDAFTAR'}</p>
                </div>
                <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto relative z-10">
                    <div className="bg-[#f8fafc] p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest italic">PINJAMAN ANDA</p>
                      <p className="text-4xl font-black text-indigo-600 leading-none">{getActiveLoans(userName).length}</p>
                    </div>
                    <div className="bg-[#f8fafc] p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest italic">HUBUNGAN DATA</p>
                      <p className={`text-[12px] font-black ${syncStatus === 'online' ? 'text-emerald-600' : 'text-rose-600'} leading-none uppercase tracking-widest`}>{syncStatus}</p>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-[4rem] border-2 border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20"><BookOpen size={24}/></div>
                    <h4 className="font-black text-indigo-950 uppercase text-md tracking-tighter italic">SENARAI PINJAMAN AKTIF ANDA</h4>
                  </div>
                  <span className="bg-indigo-100 px-5 py-2 rounded-full text-indigo-700 font-black text-[10px] uppercase shadow-sm border border-indigo-200">{getActiveLoans(userName).length} BUKU</span>
                </div>
                <div className="p-10 space-y-6">
                  {getActiveLoans(userName).map(loan => (
                    <div key={loan.id} className="p-6 bg-white border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-between shadow-sm hover:border-indigo-400 transition-all group">
                       <div className="flex-1 overflow-hidden pr-6 text-left">
                          <p className="font-black text-indigo-950 text-[14px] uppercase truncate leading-tight mb-2 group-hover:text-indigo-600">{loan.bookTitle}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{loan.timestamp}</p>
                       </div>
                       <button onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl border-b-6 border-emerald-800 active:translate-y-1 active:border-b-0 transition-all">PULANG</button>
                    </div>
                  ))}
                  {getActiveLoans(userName).length === 0 && (
                    <div className="text-center py-24">
                       <Package size={48} className="mx-auto text-slate-100 mb-6" />
                       <p className="text-[11px] font-black text-slate-300 uppercase italic tracking-[0.3em]">TIADA PINJAMAN AKTIF DIKESAN</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Fix: Added Logout button for mobile users at bottom of Profile tab */}
              <div className="md:hidden">
                <button 
                  onClick={handleLogout}
                  className="w-full py-7 bg-rose-500 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl flex items-center justify-center gap-4 hover:bg-rose-600 active:translate-y-1 border-b-8 border-rose-800 transition-all"
                >
                  <LogOut size={24} /> LOG KELUAR SISTEM SEKARANG
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[4rem] border-2 border-slate-100 shadow-2xl overflow-hidden animate-in fade-in duration-1000 text-left">
               <div className="p-10 md:p-14 border-b-2 border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div>
                    <h3 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter italic leading-none">LOG TRANSAKSI</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Rekod keluar masuk buku teks sekolah</p>
                  </div>
                  <button onClick={() => window.print()} className="px-10 py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-[2rem] text-[11px] font-black uppercase flex items-center gap-4 shadow-xl hover:bg-indigo-50 transition-all active:scale-95"><Printer size={22} /> CETAK LAPORAN</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b tracking-widest italic">
                     <tr><th className="px-12 py-10">PEMINJAM</th><th className="px-12 py-10">BUKU</th><th className="px-12 py-10 text-center">STATUS</th><th className="px-12 py-10 text-right">TARIKH & MASA</th></tr>
                   </thead>
                   <tbody className="divide-y-2 divide-slate-50 text-[12px] text-indigo-950 bg-white font-bold">
                     {transactions.map(t => (
                       <tr key={t.id} className="hover:bg-indigo-50/50 transition-colors group">
                         <td className="px-12 py-10 font-black text-indigo-900 uppercase">{t.userName}</td>
                         <td className="px-12 py-10 uppercase truncate max-w-[250px] text-slate-500 group-hover:text-indigo-600 transition">{t.bookTitle}</td>
                         <td className="px-12 py-10 text-center">
                            <span className={`px-6 py-2 rounded-full text-[9px] font-black uppercase border-2 ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span>
                         </td>
                         <td className="px-12 py-10 font-black text-slate-300 text-right uppercase italic tracking-tighter">{t.timestamp}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {transactions.length === 0 && <p className="p-40 text-center text-[13px] font-black text-slate-200 uppercase tracking-[0.4em] italic">REKOD MASIH KOSONG</p>}
               </div>
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {(isAddingBook || isEditingBook) && (
           <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl border-b-[20px] border-indigo-600 animate-in zoom-in duration-300 text-left">
                 <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-50">
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-indigo-950 italic">{isAddingBook ? 'DAFTAR BUKU BARU' : 'EDIT MAKLUMAT BUKU'}</h3>
                   <button onClick={() => {setIsAddingBook(false); setIsEditingBook(false);}} className="p-3 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all active:scale-90"><X size={24} /></button>
                 </div>
                 <div className="space-y-8">
                    <div className="relative">
                      <label className="text-[9px] font-black text-indigo-400 uppercase absolute left-6 top-3">JUDUL BUKU PENUH</label>
                      <input type="text" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black uppercase outline-none focus:border-indigo-600 shadow-inner" value={isAddingBook ? newBook.title : (bookToEdit?.title || '')} onChange={(e) => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="relative">
                          <label className="text-[9px] font-black text-indigo-400 uppercase absolute left-6 top-3">TAHUN / DARJAH</label>
                          <select className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-indigo-600 shadow-inner" value={isAddingBook ? newBook.year : (bookToEdit?.year || 1)} onChange={(e) => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>
                             {YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}
                          </select>
                       </div>
                       <div className="relative">
                          <label className="text-[9px] font-black text-indigo-400 uppercase absolute left-6 top-3">STOK PERMULAAN</label>
                          <input type="number" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-indigo-600 shadow-inner" value={isAddingBook ? newBook.stock : (bookToEdit?.stock || 0)} onChange={(e) => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} />
                       </div>
                    </div>
                    <div className="relative">
                       <label className="text-[9px] font-black text-emerald-600 uppercase absolute left-6 top-3 tracking-widest">HARGA RM (NILAI GANTI)</label>
                       <input type="number" step="0.01" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-emerald-50 text-emerald-900 font-black outline-none focus:border-emerald-500 shadow-inner" value={isAddingBook ? newBook.price : (bookToEdit?.price || 0)} onChange={(e) => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} />
                    </div>
                    <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase shadow-2xl hover:bg-indigo-700 border-b-8 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-4">
                      <Save size={24} /> SIMPAN KE INVENTORI
                    </button>
                 </div>
              </div>
           </div>
        )}

        {isAddingMember && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl border-b-[20px] border-indigo-600 animate-in zoom-in duration-300 text-left">
                <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-50">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-indigo-950 italic">DAFTAR {newMember.type} BARU</h3>
                  <button onClick={() => setIsAddingMember(false)} className="p-3 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all active:scale-90"><X size={24} /></button>
                </div>
                <div className="space-y-8">
                   <div className="relative">
                      <label className="text-[9px] font-black text-indigo-400 uppercase absolute left-6 top-3">NAMA PENUH AHLI</label>
                      <input type="text" className="w-full px-7 pt-9 pb-4 rounded-[2rem] border-2 bg-slate-50 font-black uppercase outline-none focus:border-indigo-600 shadow-inner" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value.toUpperCase()})} />
                   </div>
                   {newMember.type === 'Murid' && (
                     <div className="grid grid-cols-3 gap-3">
                       {YEARS.map(y => (
                          <button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`py-5 rounded-2xl font-black border-2 transition-all ${newMember.year === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-xl scale-105 rotate-3' : 'bg-slate-50 border-slate-100 text-indigo-950 hover:border-indigo-200'}`}>T{y}</button>
                       ))}
                     </div>
                   )}
                   <button onClick={handleAddMember} className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase shadow-2xl hover:bg-indigo-700 border-b-8 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all">PENGESAHAN PENDAFTARAN</button>
                </div>
             </div>
          </div>
        )}

        {isMemberDetailOpen && selectedMemberDetail && (
           <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-b-[20px] border-indigo-600 animate-in zoom-in duration-300 text-left">
                 <div className="p-10 border-b bg-indigo-50/50 flex justify-between items-center relative">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-2xl rotate-3 border-4 border-white relative z-10">{selectedMemberDetail.name.charAt(0)}</div>
                       <div className="relative z-10">
                          <h3 className="text-2xl font-black text-indigo-950 uppercase italic leading-tight truncate max-w-[220px]">{selectedMemberDetail.name}</h3>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• T${selectedMemberDetail.year}` : ''}</p>
                       </div>
                    </div>
                    <button onClick={() => setIsMemberDetailOpen(false)} className="p-3 hover:bg-rose-50 text-slate-300 rounded-2xl transition-all active:scale-90"><X size={24} /></button>
                 </div>
                 <div className="p-10 overflow-y-auto flex-1 space-y-8 bg-white no-scrollbar">
                    <div className="flex justify-between items-center border-b-2 border-slate-50 pb-6">
                       <h4 className="text-[11px] font-black uppercase text-indigo-950 tracking-widest flex items-center gap-3"><BookOpen size={20} className="text-indigo-400" /> PINJAMAN AKTIF AHLI</h4>
                       <button onClick={() => { setBorrowingMember(selectedMemberDetail); setIsBorrowModalOpen(true); }} className="px-7 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl border-b-4 border-indigo-800 active:scale-95 transition-all">TAMBAH PINJAMAN</button>
                    </div>
                    <div className="space-y-5">
                       {getActiveLoans(selectedMemberDetail.name).map(loan => (
                         <div key={loan.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-between group hover:border-indigo-400 transition-all shadow-sm">
                            <div className="flex-1 pr-6 overflow-hidden">
                               <p className="font-black text-indigo-950 text-[13px] uppercase truncate group-hover:text-indigo-600 leading-tight mb-2">{loan.bookTitle}</p>
                               <p className="text-[8px] font-black text-slate-400 tracking-[0.2em] italic uppercase">{loan.timestamp}</p>
                            </div>
                            <div className="flex gap-3">
                               <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-7 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase shadow-lg border-b-4 border-emerald-800 active:scale-95 transition-all">PULANG</button>
                               <button onClick={() => { if(confirm("Laporkan buku ini sebagai Rosak atau Hilang?")) handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type); }} className="p-3.5 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm"><AlertTriangle size={22}/></button>
                            </div>
                         </div>
                       ))}
                       {getActiveLoans(selectedMemberDetail.name).length === 0 && <p className="text-center py-16 text-[11px] font-black text-slate-300 uppercase italic tracking-[0.3em]">TIADA PINJAMAN AKTIF</p>}
                    </div>
                 </div>
                 <div className="p-10 bg-slate-50 border-t-2 border-slate-100 flex justify-end">
                    <button onClick={() => { if(confirm("Padam akaun ahli ini secara kekal?")) { setMembers(prev => prev.filter(m => m.id !== selectedMemberDetail.id)); setIsMemberDetailOpen(false); pushToCloud(); } }} className="text-rose-500 font-black uppercase text-[10px] flex items-center gap-3 hover:bg-rose-500 hover:text-white px-6 py-3 rounded-2xl transition-all border-2 border-rose-100 active:scale-95"><Trash2 size={18}/> HAPUS AKAUN</button>
                 </div>
              </div>
           </div>
        )}

        {isBorrowModalOpen && borrowingMember && (
          <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-b-[20px] border-indigo-600 animate-in zoom-in duration-300 text-left">
                <div className="p-10 border-b bg-indigo-50/50 flex justify-between items-center">
                   <div>
                      <h3 className="text-3xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none mb-3">DAFTAR PINJAMAN PUKAL</h3>
                      <div className="px-6 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase w-fit shadow-2xl tracking-[0.2em]">{borrowingMember.name}</div>
                   </div>
                   <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="p-3 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"><X size={32} className="text-slate-300" /></button>
                </div>
                
                <div className="px-10 py-8 bg-slate-50 border-b-2 border-indigo-100 flex gap-6">
                   <div className="relative flex-1 group">
                      <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition" />
                      <input type="text" placeholder="CARI TAJUK BUKU..." className="w-full pl-16 pr-8 py-5 bg-white rounded-[2rem] border-2 border-slate-100 font-black text-[12px] outline-none focus:border-indigo-600 shadow-inner group-focus-within:shadow-xl transition-all uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                   </div>
                   <div className="flex gap-2">
                     {YEARS.map(y => (
                       <button key={y} onClick={() => setSelectedYear(y)} className={`w-14 h-14 rounded-2xl font-black text-xs transition-all border-2 ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>T{y}</button>
                     ))}
                   </div>
                </div>

                <div className="p-10 overflow-y-auto flex-1 bg-white no-scrollbar">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {books.filter(b => b.year === selectedYear && b.title.toLowerCase().includes(searchQuery.toLowerCase())).sort((a,b) => a.title.localeCompare(b.title)).map(book => {
                        const isSelected = selectedBooksToBorrow.has(book.id);
                        return (
                          <div 
                            key={book.id} 
                            onClick={() => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} 
                            className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xl scale-[1.05] rotate-1' : 'bg-slate-50 border-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                          >
                               <div className="overflow-hidden text-left flex-1">
                                  <h4 className={`font-black text-[12px] uppercase truncate w-48 ${isSelected ? 'text-white' : 'text-indigo-950 group-hover:text-indigo-600'} leading-tight`}>{book.title}</h4>
                                  <div className="flex gap-4 items-center mt-2.5">
                                    <p className={`text-[9px] uppercase font-black tracking-widest ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>TAHUN {book.year}</p>
                                    <p className={`text-[9px] uppercase font-black tracking-widest ${isSelected ? 'text-white' : 'text-emerald-600'}`}>STOK: {book.stock}</p>
                                  </div>
                               </div>
                               <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-white text-indigo-600 border-white rotate-[360deg]' : 'border-slate-200 text-transparent'}`}>
                                  <CheckCircle size={24} />
                               </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
                
                <div className="p-10 bg-slate-50 border-t-2 border-indigo-100 flex items-center justify-between">
                   <div className="text-left">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 italic">BUKU DIPILIH</p>
                      <p className="text-4xl font-black text-indigo-950">{selectedBooksToBorrow.size} <span className="text-sm uppercase text-indigo-400">UNIT</span></p>
                   </div>
                   <button 
                    onClick={() => { Array.from(selectedBooksToBorrow).forEach(id => handleAction(id, 'Pinjaman', borrowingMember.name, borrowingMember.type, 1)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); pushToCloud(true); }} 
                    className="px-12 py-6 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl uppercase text-[12px] border-b-8 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all flex items-center gap-4" 
                    disabled={selectedBooksToBorrow.size === 0}
                   >
                     <Save size={24} /> SAHKAN PINJAMAN SEKARANG
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Bottom Nav Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-100 px-10 py-5 flex justify-between z-40 shadow-[0_-20px_50px_rgba(30,27,75,0.15)] rounded-t-[3.5rem]">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-125 font-black drop-shadow-xl' : 'text-slate-300'}`}><BookOpen size={28} /><span className="text-[9px] uppercase font-black tracking-widest">STOK</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-125 font-black drop-shadow-xl' : 'text-slate-300'}`}><History size={28} /><span className="text-[9px] uppercase font-black tracking-widest">LOG</span></button>
           <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'profile' ? 'text-indigo-600 scale-125 font-black drop-shadow-xl' : 'text-slate-300'}`}><UserCircle size={28} /><span className="text-[9px] uppercase font-black tracking-widest">PROFIL</span></button>
           {isAdminAuthenticated && (<button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'admin' ? 'text-emerald-600 scale-125 font-black drop-shadow-xl' : 'text-slate-300'}`}><LayoutDashboard size={28} /><span className="text-[9px] uppercase font-black tracking-widest">ADMIN</span></button>)}
        </div>
      </main>
    </div>
  );
};

export default App;