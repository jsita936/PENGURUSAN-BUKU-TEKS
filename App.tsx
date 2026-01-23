import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Edit2,
  X,
  BookPlus,
  UserPlus,
  Sparkles,
  Save,
  Printer,
  Package,
  Plus,
  Search,
  Wallet,
  Settings,
  TrendingUp,
  ArrowUpCircle,
  RotateCcw,
  Lock,
  ShieldCheck,
  LogOut,
  School,
  CheckCircle,
  FileText
} from 'lucide-react';

const MONTHS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun", 
  "Julai", "Ogos", "September", "Oktober", "November", "Disember"
];

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('spbt_books');
    return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('spbt_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('spbt_members');
    return saved ? JSON.parse(saved) : [];
  });
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('spbt_settings');
    return saved ? JSON.parse(saved) : { 
      schoolName: '', 
      adminName: 'ADMIN UTAMA', 
      adminId: '', 
      adminPass: '', 
      isRegistered: false 
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('spbt_is_logged_in') === 'true';
  });
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regId, setRegId] = useState('');
  const [regPass, setRegPass] = useState('');

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'members' | 'damages' | 'history' | 'session' | 'settings'>('overview');
  const [inventoryType, setInventoryType] = useState<BookType>('Buku Teks');
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [memberTypeView, setMemberTypeView] = useState<UserType>('Guru');
  const [memberYearView, setMemberYearView] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth());
  const [damageFilterStatus, setDamageFilterStatus] = useState<'Semua' | 'Tertunggak' | 'Selesai'>('Semua');

  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [isMemberDetailOpen, setIsMemberDetailOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowFilterYear, setBorrowFilterYear] = useState<number>(1);
  const [selectedBooksToBorrow, setSelectedBooksToBorrow] = useState<Set<string>>(new Set());
  const [isPrintFormOpen, setIsPrintFormOpen] = useState(false);
  const [isPrintDamageReportOpen, setIsPrintDamageReportOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [editableFormData, setEditableFormData] = useState<Record<string, { serial: string, receivedDate: string, returnDate: string, status: string }>>({});

  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', code: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });

  useEffect(() => localStorage.setItem('spbt_books', JSON.stringify(books)), [books]);
  useEffect(() => localStorage.setItem('spbt_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('spbt_members', JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem('spbt_settings', JSON.stringify(adminSettings)), [adminSettings]);

  useEffect(() => {
    if (isPrintFormOpen && selectedMemberDetail) {
      const initial: typeof editableFormData = {};
      books.filter(b => b.year === selectedMemberDetail.year).forEach(b => {
        const pinjam = transactions.find(t => t.bookId === b.id && t.userName === selectedMemberDetail.name && t.action === 'Pinjaman');
        const pulang = transactions.find(t => t.bookId === b.id && t.userName === selectedMemberDetail.name && (t.action === 'Pemulangan' || t.action === 'Pulang Rosak/Hilang'));
        const isDamaged = pulang?.action === 'Pulang Rosak/Hilang';
        
        initial[b.id] = {
          serial: '',
          receivedDate: pinjam?.timestamp.split(',')[0] || '',
          returnDate: pulang?.timestamp.split(',')[0] || '',
          status: pulang ? (isDamaged ? 'ROSAK/HILANG' : 'BAIK') : ''
        };
      });
      setEditableFormData(initial);
    }
  }, [isPrintFormOpen, selectedMemberDetail, books, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.createdAt);
      return date.getMonth() === historyMonth;
    });
  }, [transactions, historyMonth]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSchool || !regId || !regPass) return alert("Sila lengkapkan semua maklumat.");
    setAdminSettings({ ...adminSettings, schoolName: regSchool.toUpperCase(), adminId: regId, adminPass: regPass, isRegistered: true });
    alert("Pendaftaran Berjaya!");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId === adminSettings.adminId && loginPass === adminSettings.adminPass) {
      setIsAuthenticated(true);
      localStorage.setItem('spbt_is_logged_in', 'true');
    } else {
      alert("ID atau Kata Laluan Salah!");
    }
  };

  const handleLogout = () => {
    if (confirm("Log keluar?")) {
      setIsAuthenticated(false);
      localStorage.removeItem('spbt_is_logged_in');
    }
  };

  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    if (action === 'Pinjaman' && book.stock < qty) return alert("Stok tidak mencukupi!");

    let stockChange = 0;
    if (action === 'Pinjaman') stockChange = -qty;
    else if (action === 'Pemulangan') stockChange = book.type === 'Buku Aktiviti' ? 0 : qty;
    else if (action === 'Pulang Rosak/Hilang') stockChange = 0;

    let status: TransactionStatus = action === 'Pulang Rosak/Hilang' ? 'Rosak/Hilang' : 'Berjaya';
    let resStatus: ResolutionStatus | undefined = action === 'Pulang Rosak/Hilang' ? 'Tertunggak' : undefined;

    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: b.stock + stockChange } : b));
    setTransactions(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      bookId, bookTitle: book.title, userName: targetUser, userType: targetType, quantity: qty,
      timestamp: new Date().toLocaleString('ms-MY'), createdAt: Date.now(), action, status,
      resolutionStatus: resStatus, fineAmount: action === 'Pulang Rosak/Hilang' ? book.price : 0
    }, ...prev]);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    const trans = transactions.find(t => t.id === transactionId);
    if (!trans) return;
    if (method === 'Buku') setBooks(prev => prev.map(b => b.id === trans.bookId ? { ...b, stock: b.stock + 1 } : b));
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } : t));
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

  const fetchAiInsight = async () => {
    setIsAiLoading(true);
    const insight = await getStockInsight(books, transactions);
    setAiInsight(insight || "Gagal mendapatkan analisa.");
    setIsAiLoading(false);
  };

  const handleAddNewBook = () => {
    if (!newBook.title) return alert("Sila masukkan tajuk buku.");
    const book: Book = {
      id: Math.random().toString(36).substr(2, 9),
      title: newBook.title!.toUpperCase(),
      code: (newBook.code || '').toUpperCase(),
      year: newBook.year || 1,
      type: newBook.type || 'Buku Teks',
      stock: newBook.stock || 0,
      subject: 'MANUAL',
      price: newBook.price || 0
    };
    setBooks(prev => [...prev, book]);
    setNewBook({ title: '', code: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
    setIsAddingBook(false);
  };

  const handleUpdateBook = () => {
    if (!bookToEdit || !bookToEdit.title) return;
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? bookToEdit : b));
    setIsEditingBook(false);
    setBookToEdit(null);
  };

  const handleAddMember = () => {
    if (!newMember.name) return alert("Sila masukkan nama ahli.");
    const member: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMember.name!.toUpperCase(),
      type: newMember.type || 'Guru',
      year: newMember.type === 'Murid' ? newMember.year : undefined
    };
    setMembers(prev => [...prev, member]);
    setNewMember({ name: '', type: 'Guru', year: 1 });
    setIsAddingMember(false);
  };

  const handleUpdateMember = () => {
    if (!memberToEdit || !memberToEdit.name) return;
    const oldName = members.find(m => m.id === memberToEdit.id)?.name;
    const newName = memberToEdit.name.toUpperCase();
    if (oldName && oldName !== newName) {
      setTransactions(prev => prev.map(t => t.userName === oldName ? { ...t, userName: newName } : t));
    }
    setMembers(prev => prev.map(m => m.id === memberToEdit.id ? { ...memberToEdit, name: newName } : m));
    if (selectedMemberDetail?.id === memberToEdit.id) {
       setSelectedMemberDetail({ ...memberToEdit, name: newName });
    }
    setIsEditingMember(false);
    setMemberToEdit(null);
  };

  const handleUpdateAdminSettings = () => {
    if (confirm("PENGESAHAN: Adakah anda pasti mahu mengemaskini tetapan keselamatan admin?")) {
      localStorage.setItem('spbt_settings', JSON.stringify(adminSettings));
      alert("Tetapan keselamatan telah berjaya dikemaskini.");
    }
  };

  const handleSessionPromotion = () => {
    if(confirm("PENGESAHAN: Adakah anda pasti mahu memulakan sesi baru? Semua murid akan dinaikkan 1 tahun.")) {
      setMembers(prev => prev.map(m => {
        if (m.type === 'Murid' && m.year) return { ...m, year: m.year + 1 };
        return m;
      }).filter(m => m.type === 'Guru' || (m.year && m.year <= 6)));
      alert("Proses naik kelas selesai.");
    }
  };

  const handleSessionReset = () => {
    if(confirm("AMARAN: Adakah anda pasti mahu memadam semua rekod ahli?")) {
      setMembers([]);
      setTransactions([]);
      alert("Semua rekod ahli dipadamkan.");
    }
  };

  if (!adminSettings.isRegistered) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-['Plus_Jakarta_Sans']">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border-b-[12px] border-emerald-600">
          <div className="mb-8 text-center text-indigo-950">
            <School size={48} className="mx-auto mb-4 text-emerald-600" />
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">Mula Guna E-SPBT</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Pendaftaran Pentadbir Sekolah</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4 text-indigo-950">
            <input type="text" placeholder="NAMA SEKOLAH" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black uppercase" value={regSchool} onChange={e => setRegSchool(e.target.value)} />
            <input type="text" placeholder="ID ADMIN" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black" value={regId} onChange={e => setRegId(e.target.value)} />
            <input type="password" placeholder="KATA LALUAN" required className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black" value={regPass} onChange={e => setRegPass(e.target.value)} />
            <button className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase shadow-xl">Daftar Sekarang</button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-['Plus_Jakarta_Sans']">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-600">
          <div className="mb-8 text-center text-indigo-950">
            <Lock size={48} className="mx-auto mb-4 text-indigo-600" />
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">Log Masuk Admin</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{adminSettings.schoolName}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-indigo-950">
            <input type="text" placeholder="ID ADMIN" className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black text-indigo-950" value={loginId} onChange={e => setLoginId(e.target.value)} />
            <input type="password" placeholder="KATA LALUAN" className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 font-black text-indigo-950" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            <button className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase shadow-xl">Masuk Sistem</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f1f5f9] text-indigo-950 font-['Plus_Jakarta_Sans']">
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 shadow-2xl z-30 no-print">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Library size={24} /></div>
          <div>
            <h1 className="font-black text-md tracking-tighter uppercase italic text-white">E-SPBT PINTAR</h1>
            <p className="text-[7px] text-indigo-400 font-black uppercase tracking-[0.2em] truncate">{adminSettings.schoolName}</p>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-2 mt-4">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'RUMUSAN' },
            { id: 'inventory', icon: Package, label: 'INVENTORI' },
            { id: 'members', icon: UserCircle, label: 'URUS AHLI' },
            { id: 'damages', icon: AlertTriangle, label: 'KOS GANTI' },
            { id: 'history', icon: History, label: 'LOG REKOD' },
            { id: 'session', icon: TrendingUp, label: 'URUS SESI' },
            { id: 'settings', icon: Settings, label: 'TETAPAN' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white font-black shadow-xl scale-105' : 'text-indigo-200/40 hover:text-white hover:bg-white/5 font-bold'}`}>
              <item.icon size={20} /><span className="text-[10px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-6 border-t border-white/5">
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black border border-rose-500/20 uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <LogOut size={14} /> KELUAR SISTEM
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
        <header className="h-20 bg-white border-b px-6 md:px-10 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Library size={20} /></div>
            <div><h2 className="text-lg font-black text-indigo-900 uppercase italic tracking-tighter">{activeTab.toUpperCase()}</h2><p className="text-[8px] font-black text-slate-400 uppercase">{adminSettings.schoolName}</p></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 bg-[#f8fafc] no-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'STOK BUKU', val: books.reduce((a, b) => a + b.stock, 0), icon: Package, color: 'text-indigo-600' },
                  { label: 'AKTIF PINJAM', val: transactions.filter(t => t.action === 'Pinjaman').length, icon: BookOpen, color: 'text-blue-600' },
                  { label: 'KES ROSAK', val: transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length, icon: AlertTriangle, color: 'text-rose-600' },
                  { label: 'JUMLAH AHLI', val: members.length, icon: UserCircle, color: 'text-emerald-600' }
                ].map((c, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 right-0 p-4 opacity-5 ${c.color}`}><c.icon size={64} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">{c.label}</p>
                    <p className={`text-4xl font-black ${c.color}`}>{c.val}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-xl flex items-center gap-6">
                <div className={`w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center ${isAiLoading ? 'animate-spin' : ''}`}><Sparkles size={32} /></div>
                <div className="flex-1"><h3 className="text-xl font-black uppercase italic">Analisa AI Gemini</h3><p className="text-indigo-200/50 text-[10px] uppercase">Status stok dan cadangan tindakan</p></div>
                <button onClick={fetchAiInsight} disabled={isAiLoading} className="px-6 py-3 bg-white text-indigo-950 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-100 transition-colors">JANA ANALISA</button>
              </div>
              {aiInsight && <div className="p-6 bg-white border-2 border-indigo-100 rounded-[2rem] shadow-md animate-in slide-in-from-top-4"><div className="prose prose-slate max-w-none text-[11px] font-bold leading-relaxed whitespace-pre-wrap italic">{aiInsight}</div></div>}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="bg-white p-1.5 rounded-2xl border shadow-sm flex gap-1">
                  {['Buku Teks', 'Buku Aktiviti'].map(type => (
                    <button key={type} onClick={() => setInventoryType(type as BookType)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{type}</button>
                  ))}
                </div>
                <button onClick={() => { setIsAddingBook(true); setNewBook({ type: inventoryType, year: selectedYear, code: '' }); }} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-indigo-900 flex items-center gap-2"><BookPlus size={18}/> TAMBAH BUKU</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`min-w-[80px] py-3 rounded-xl font-black text-[10px] border-2 uppercase transition-all ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>TAHUN {y}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.filter(b => b.year === selectedYear && b.type === inventoryType).map(book => (
                  <div key={book.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:border-indigo-400 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-emerald-600">RM {book.price.toFixed(2)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setBookToEdit(book); setIsEditingBook(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                        <button onClick={() => { if(confirm("Padam buku ini?")) setBooks(prev => prev.filter(b => b.id !== book.id)); }} className="p-2 text-rose-400 hover:text-rose-600"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    <h4 className="font-black text-[12px] uppercase leading-tight h-10 overflow-hidden text-indigo-950 mb-1">{book.title}</h4>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg w-fit text-[9px] font-black uppercase mb-4">{book.code || 'TIADA KOD'}</div>
                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase">STOK:</span>
                      <span className={`text-2xl font-black ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-950'}`}>{book.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="bg-white p-1.5 rounded-2xl border shadow-sm flex gap-1">
                  {['Guru', 'Murid'].map(type => (
                    <button key={type} onClick={() => setMemberTypeView(type as UserType)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${memberTypeView === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{type}</button>
                  ))}
                </div>
                <button onClick={() => setIsAddingMember(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-indigo-900 flex items-center gap-2"><UserPlus size={18}/> TAMBAH AHLI</button>
              </div>
              {memberTypeView === 'Murid' && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {YEARS.map(y => (
                    <button key={y} onClick={() => setMemberYearView(y)} className={`min-w-[80px] py-3 rounded-xl font-black text-[10px] border-2 uppercase transition-all ${memberYearView === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white text-slate-400'}`}>TAHUN {y}</button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="CARI NAMA AHLI..." className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl border font-black text-[10px] uppercase focus:border-indigo-600" value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {members.filter(m => m.type === memberTypeView && (memberTypeView === 'Guru' || m.year === memberYearView) && (searchQuery === '' || m.name.includes(searchQuery))).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                  <div key={m.id} onClick={() => { setSelectedMemberDetail(m); setIsMemberDetailOpen(true); }} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black text-xl shrink-0">{m.name.charAt(0)}</div>
                      <div className="overflow-hidden"><h4 className="font-black text-[11px] uppercase truncate w-32 group-hover:text-indigo-600">{m.name}</h4><p className="text-[8px] font-black text-slate-600 uppercase italic mt-1">{getActiveLoans(m.name).length} PINJAMAN AKTIF</p></div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-wrap gap-2 no-scrollbar no-print">
                 {MONTHS.map((m, idx) => (
                   <button key={m} onClick={() => setHistoryMonth(idx)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${historyMonth === idx ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{m}</button>
                 ))}
              </div>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl print-area">
                 <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <div><h3 className="text-2xl font-black text-indigo-900 uppercase italic leading-tight">LOG TRANSAKSI: {MONTHS[historyMonth].toUpperCase()}</h3><p className="text-[9px] font-black text-slate-400 uppercase italic mt-1">Laporan bulanan arkib sekolah</p></div>
                    <button onClick={() => window.print()} className="no-print px-6 py-3 bg-white border border-indigo-100 text-indigo-600 rounded-xl font-black text-[10px] uppercase shadow-md flex items-center gap-2 hover:bg-indigo-50 transition-colors"><Printer size={16}/> CETAK BULAN INI</button>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-600 border-b">
                       <tr><th className="px-8 py-6">PENGGUNA</th><th className="px-8 py-6">JUDUL BUKU</th><th className="px-8 py-6 text-center">JENIS REKOD</th><th className="px-8 py-6 text-right">TARIKH/MASA</th></tr>
                     </thead>
                     <tbody className="divide-y text-[10px] font-bold">
                       {filteredTransactions.map(t => (
                         <tr key={t.id} className="hover:bg-slate-50">
                           <td className="px-8 py-5 uppercase text-indigo-950 font-black">{t.userName} <span className="opacity-70 text-[8px] text-indigo-700">({t.userType})</span></td>
                           <td className="px-8 py-5 uppercase text-slate-900 truncate max-w-[200px]">{t.bookTitle}</td>
                           <td className="px-8 py-5 text-center"><span className={`px-4 py-1 rounded-lg text-[8px] font-black uppercase border ${t.action === 'Pinjaman' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>{t.action}</span></td>
                           <td className="px-8 py-5 text-slate-700 text-right italic">{t.timestamp}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'damages' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-white p-8 rounded-3xl border shadow-lg flex items-center gap-6">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner"><Wallet size={32} /></div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">DENDA TERKUTIP (TUNAI)</p>
                    <p className="text-4xl font-black text-emerald-600">RM {transactions.filter(t => t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Tunai').reduce((acc, t) => acc + (t.fineAmount || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={() => setIsPrintDamageReportOpen(true)} className="px-10 py-8 bg-indigo-600 text-white rounded-[2rem] font-black text-[12px] uppercase shadow-xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-700 transition-all"><Printer size={32}/>CETAK LAPORAN PEMFAILAN</button>
              </div>
              <div className="flex gap-2">
                {['Semua', 'Tertunggak', 'Selesai'].map((s: any) => (
                  <button key={s} onClick={() => setDamageFilterStatus(s)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${damageFilterStatus === s ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{s}</button>
                ))}
              </div>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-600 border-b">
                    <tr><th className="px-8 py-6">NAMA AHLI</th><th className="px-8 py-6">JUDUL BUKU</th><th className="px-8 py-6 text-center">NILAI GANTI</th><th className="px-8 py-6 text-right">TINDAKAN / STATUS</th></tr>
                  </thead>
                  <tbody className="divide-y text-[10px] font-bold">
                    {transactions.filter(t => t.status === 'Rosak/Hilang' && (damageFilterStatus === 'Semua' || t.resolutionStatus === damageFilterStatus)).map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-8 py-5 uppercase text-indigo-950 font-black">{t.userName}</td>
                        <td className="px-8 py-5 uppercase text-slate-900">{t.bookTitle}</td>
                        <td className="px-8 py-5 text-center text-rose-700 font-black">RM {t.fineAmount?.toFixed(2)}</td>
                        <td className="px-8 py-5 text-right flex justify-end gap-2">
                          {t.resolutionStatus === 'Tertunggak' ? (
                            <>
                              <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[8px] uppercase hover:bg-emerald-700 shadow-sm font-black transition-transform active:scale-90">TUNAI</button>
                              <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[8px] uppercase hover:bg-indigo-700 shadow-sm font-black transition-transform active:scale-90">GANTI BUKU</button>
                            </>
                          ) : (
                            <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[8px] uppercase font-black border border-slate-200">SELESAI ({t.resolutionMethod})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'session' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-white p-10 rounded-[3rem] border-b-[12px] border-indigo-600 shadow-xl text-center">
                <TrendingUp size={64} className="mx-auto text-indigo-600 mb-6" />
                <h3 className="text-2xl font-black uppercase italic text-indigo-950 leading-tight">Pengurusan Sesi Sekolah</h3>
                <div className="space-y-4 mt-10">
                  <button onClick={handleSessionPromotion} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"><ArrowUpCircle size={20}/> PROSES NAIK KELAS</button>
                  <button onClick={handleSessionReset} className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[11px] border border-rose-100 shadow-sm flex items-center justify-center gap-3 transition-transform active:scale-95"><RotateCcw size={20}/> PADAM SEMUA REKOD AHLI</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-white p-10 rounded-[3rem] border shadow-xl">
                <div className="flex items-center gap-4 border-b pb-6 mb-8 text-indigo-950"><ShieldCheck className="text-indigo-600" size={32} /><h3 className="text-2xl font-black uppercase italic">Keselamatan Admin</h3></div>
                <div className="space-y-4">
                  <input type="text" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black text-indigo-950 transition-all outline-none focus:border-indigo-600" value={adminSettings.adminId} onChange={e => setAdminSettings({ ...adminSettings, adminId: e.target.value })} />
                  <input type="text" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black text-indigo-950 transition-all outline-none focus:border-indigo-600" value={adminSettings.adminPass} onChange={e => setAdminSettings({ ...adminSettings, adminPass: e.target.value })} />
                  <input type="text" className="w-full px-6 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-indigo-950 transition-all outline-none focus:border-indigo-600" value={adminSettings.schoolName} onChange={e => setAdminSettings({ ...adminSettings, schoolName: e.target.value.toUpperCase() })} />
                  <button onClick={handleUpdateAdminSettings} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-lg flex items-center justify-center gap-2 mt-4 transition-transform active:scale-95"><Save size={18}/> KEMASKINI TETAPAN</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- PRINTABLE AREAS --- */}

      {isPrintDamageReportOpen && (
        <div className="fixed inset-0 bg-white z-[600] flex flex-col overflow-y-auto no-scrollbar print-area" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="p-4 border-b flex justify-between items-center bg-rose-700 text-white no-print">
            <div className="flex items-center gap-4 text-white"><FileText size={20} /><h3 className="text-sm font-black uppercase italic">Prapapar Laporan Kos Ganti</h3></div>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="px-6 py-2 bg-white text-rose-700 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 transition-transform active:scale-95"><Printer size={14}/> CETAK SEKARANG</button>
               <button onClick={() => setIsPrintDamageReportOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={24}/></button>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-5xl mx-auto p-12 bg-white text-black print:p-0 print:max-w-none">
             <div className="border-b-4 border-black pb-4 mb-10 text-center text-black">
                <h2 className="text-lg font-bold uppercase tracking-tight">{adminSettings.schoolName}</h2>
                <h1 className="text-2xl font-black uppercase underline mt-2">REKOD ARKIB & TUNGGAKAN KEROSAKAN BUKU TEKS</h1>
                <p className="text-[10px] font-bold uppercase mt-2 italic">DIJANA PADA: {new Date().toLocaleDateString('ms-MY')} • OLEH: PENTADBIR SPBT</p>
             </div>

             {YEARS.map(y => {
               const yearTrans = transactions.filter(t => {
                 const member = members.find(m => m.name === t.userName);
                 return t.status === 'Rosak/Hilang' && member?.year === y;
               });
               if (yearTrans.length === 0) return null;
               const studentGroups: { [key: string]: Transaction[] } = {};
               yearTrans.forEach(t => {
                 if (!studentGroups[t.userName]) studentGroups[t.userName] = [];
                 studentGroups[t.userName].push(t);
               });
               return (
                 <div key={y} className="mb-12">
                   <div className="bg-white p-3 border-4 border-black mb-4">
                     <h3 className="text-lg font-black uppercase tracking-widest text-black">PENGGUNA TAHUN {y}</h3>
                   </div>
                   {Object.entries(studentGroups).map(([studentName, transList]) => {
                     const pendingTotal = transList.filter(t => t.resolutionStatus === 'Tertunggak').reduce((acc, curr) => acc + (curr.fineAmount || 0), 0);
                     return (
                       <div key={studentName} className="mb-10 border-2 border-black p-4 bg-white print:break-inside-avoid text-black">
                         <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1">
                           <h4 className="text-sm font-black uppercase">NAMA: {studentName}</h4>
                           <span className="text-[10px] font-black italic uppercase">{pendingTotal > 0 ? 'STATUS: TUNGGAKAN' : 'STATUS: SELESAI'}</span>
                         </div>
                         <table className="w-full border-collapse border-2 border-black text-[9px] text-black">
                           <thead>
                             <tr>
                               <th className="border-2 border-black p-1 w-8 text-center uppercase font-black">BIL</th>
                               <th className="border-2 border-black p-1 text-left uppercase font-black">JUDUL BUKU</th>
                               <th className="border-2 border-black p-1 w-20 text-center uppercase font-black">KOD</th>
                               <th className="border-2 border-black p-1 w-24 text-center uppercase font-black">KOS (RM)</th>
                               <th className="border-2 border-black p-1 w-32 text-center uppercase font-black">STATUS</th>
                             </tr>
                           </thead>
                           <tbody>
                             {transList.map((t, idx) => {
                               const isPending = t.resolutionStatus === 'Tertunggak';
                               return (
                                 <tr key={t.id} className={isPending ? 'text-red-600 font-bold' : 'text-black'}>
                                   <td className="border-2 border-black p-1 text-center">{idx + 1}</td>
                                   <td className="border-2 border-black p-1 uppercase">{t.bookTitle}</td>
                                   <td className="border-2 border-black p-1 text-center">{books.find(b => b.id === t.bookId)?.code || '-'}</td>
                                   <td className="border-2 border-black p-1 text-center">{t.fineAmount?.toFixed(2)}</td>
                                   <td className="border-2 border-black p-1 text-center uppercase text-[8px]">{t.resolutionStatus === 'Selesai' ? 'LUNAS' : 'TERTUNGGAK'}</td>
                                 </tr>
                               );
                             })}
                             <tr>
                               <td colSpan={3} className="border-2 border-black p-2 text-right font-black uppercase text-[10px]">JUMLAH TUNGGAKAN:</td>
                               <td className="border-2 border-black p-2 text-center font-black bg-white text-red-600 text-[10px]">RM {pendingTotal.toFixed(2)}</td>
                               <td className="border-2 border-black p-2 text-center text-slate-400 italic">-----------------</td>
                             </tr>
                           </tbody>
                         </table>
                       </div>
                     );
                   })}
                 </div>
               );
             })}
             <div className="mt-20 grid grid-cols-2 gap-20 text-center text-black">
                <div className="print:break-inside-avoid">
                   <p className="text-[11px] font-black underline mb-16 uppercase">Disediakan Oleh:</p>
                   <p className="border-t-2 border-black pt-2 text-[11px] uppercase font-black">GURU UNIT SPBT</p>
                </div>
                <div className="print:break-inside-avoid">
                   <p className="text-[11px] font-black underline mb-16 uppercase">Disahkan Oleh:</p>
                   <p className="border-t-2 border-black pt-2 text-[11px] uppercase font-black">PENTADBIR SEKOLAH</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {isPrintFormOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col overflow-y-auto no-scrollbar print-area" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="p-4 border-b flex justify-between items-center bg-indigo-950 text-white no-print">
            <div className="flex items-center gap-4 text-white"><FileText size={20} /><h3 className="text-sm font-black uppercase italic">Prapapar Borang Peminjaman</h3></div>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-600 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 transition-transform active:scale-95 text-white"><Printer size={14}/> CETAK SEKARANG</button>
               <button onClick={() => setIsPrintFormOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={24}/></button>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-5xl mx-auto p-12 bg-white text-black print:p-0 print:max-w-none">
             <div className="border-b-2 border-black pb-4 mb-8 text-center text-black">
                <h2 className="text-lg font-bold uppercase">{adminSettings.schoolName}</h2>
                <h1 className="text-xl font-black uppercase underline">REKOD PENERIMAAN & PEMULANGAN BUKU TEKS</h1>
                <h3 className="text-md font-bold uppercase mt-1">MURID TAHUN {selectedMemberDetail.year}</h3>
             </div>
             <div className="grid grid-cols-2 gap-8 mb-8 text-black">
                <div className="flex gap-2 items-center"><span className="font-bold uppercase text-xs">NAMA MURID:</span><span className="border-b-2 border-black flex-1 uppercase text-sm font-bold pb-0.5">{selectedMemberDetail.name}</span></div>
                <div className="flex gap-2 items-center"><span className="font-bold uppercase text-xs">SESI:</span><span className="border-b-2 border-black flex-1 uppercase text-sm font-bold pb-0.5">{new Date().getFullYear()} / {new Date().getFullYear() + 1}</span></div>
             </div>
             <table className="w-full border-collapse border-2 border-black text-[9px] text-black bg-transparent">
                <thead>
                  <tr className="bg-white">
                    <th className="border-2 border-black p-1 w-6 text-center uppercase font-black">BIL</th>
                    <th className="border-2 border-black p-1 w-16 text-center uppercase font-black">KOD BUKU</th>
                    <th className="border-2 border-black p-1 text-left uppercase font-black">NAMA BUKU</th>
                    <th className="border-2 border-black p-1 w-14 text-center uppercase font-black">RM</th>
                    <th className="border-2 border-black p-1 w-20 text-center uppercase font-black">NO SIRI</th>
                    <th className="border-2 border-black p-1 w-20 text-center uppercase font-black">TERIMA</th>
                    <th className="border-2 border-black p-1 w-20 text-center uppercase font-black">PULANG</th>
                    <th className="border-2 border-black p-1 text-center uppercase font-black">CATATAN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td colSpan={8} className="border-2 border-black px-4 py-1.5 font-black text-center uppercase text-[10px]">BAHAGIAN 1: BUKU TEKS</td>
                  </tr>
                  {books.filter(b => b.year === selectedMemberDetail.year && b.type === 'Buku Teks').map((b, idx) => {
                    const data = editableFormData[b.id] || { serial: '', receivedDate: '', returnDate: '', status: '' };
                    const isDamaged = data.status.toUpperCase().includes('ROSAK') || data.status.toUpperCase().includes('HILANG');
                    return (
                      <tr key={b.id} className={`${isDamaged ? 'text-red-600' : 'text-black'} bg-white`}>
                        <td className="border-2 border-black p-1 text-center font-bold">{idx + 1}.</td>
                        <td className="border-2 border-black p-1 text-center font-black">{b.code}</td>
                        <td className="border-2 border-black p-1 font-bold uppercase">{b.title}</td>
                        <td className="border-2 border-black p-1 text-center font-bold">{b.price.toFixed(2)}</td>
                        <td className="border-2 border-black p-0 bg-transparent">
                          <input type="text" value={data.serial} onChange={e => setEditableFormData({...editableFormData, [b.id]: {...data, serial: e.target.value.toUpperCase()}})} className={`w-full h-full text-center font-black text-[10px] outline-none bg-transparent uppercase ${isDamaged ? 'text-red-600' : 'text-black'}`} style={{ color: isDamaged ? 'red' : 'black' }} />
                        </td>
                        <td className="border-2 border-black p-0 bg-transparent">
                          <input type="text" value={data.receivedDate} onChange={e => setEditableFormData({...editableFormData, [b.id]: {...data, receivedDate: e.target.value}})} className={`w-full h-full text-center font-bold text-[10px] outline-none bg-transparent ${isDamaged ? 'text-red-600' : 'text-black'}`} style={{ color: isDamaged ? 'red' : 'black' }} />
                        </td>
                        <td className="border-2 border-black p-0 bg-transparent">
                          <input type="text" value={data.returnDate} onChange={e => setEditableFormData({...editableFormData, [b.id]: {...data, returnDate: e.target.value}})} className={`w-full h-full text-center font-bold text-[10px] outline-none bg-transparent ${isDamaged ? 'text-red-600' : 'text-black'}`} style={{ color: isDamaged ? 'red' : 'black' }} />
                        </td>
                        <td className="border-2 border-black p-0 bg-transparent">
                          <input type="text" value={data.status} onChange={e => setEditableFormData({...editableFormData, [b.id]: {...data, status: e.target.value.toUpperCase()}})} className={`w-full h-full text-center font-black text-[7px] outline-none bg-transparent uppercase ${isDamaged ? 'text-red-600' : 'text-black'}`} style={{ color: isDamaged ? 'red' : 'black' }} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-white">
                    <td colSpan={8} className="border-2 border-black px-4 py-1.5 font-black text-center uppercase text-[10px]">BAHAGIAN 2: BUKU AKTIVITI</td>
                  </tr>
                  {books.filter(b => b.year === selectedMemberDetail.year && b.type === 'Buku Aktiviti').map((b, idx) => {
                    const data = editableFormData[b.id] || { serial: '', receivedDate: '', returnDate: '', status: '' };
                    return (
                      <tr key={b.id} className="text-black bg-white">
                        <td className="border-2 border-black p-1 text-center font-bold">{idx + 1}.</td>
                        <td className="border-2 border-black p-1 text-center font-black">{b.code}</td>
                        <td className="border-2 border-black p-1 font-bold uppercase">{b.title}</td>
                        <td className="border-2 border-black p-1 text-center font-bold">{b.price.toFixed(2)}</td>
                        <td className="border-2 border-black p-0 bg-transparent">
                          <input type="text" value={data.serial} onChange={e => setEditableFormData({...editableFormData, [b.id]: {...data, serial: e.target.value.toUpperCase()}})} className="w-full h-full text-center font-black text-[10px] outline-none bg-transparent uppercase" />
                        </td>
                        <td className="border-2 border-black p-0 bg-transparent">
                          <input type="text" value={data.receivedDate} onChange={e => setEditableFormData({...editableFormData, [b.id]: {...data, receivedDate: e.target.value}})} className="w-full h-full text-center font-bold text-[10px] outline-none bg-transparent" />
                        </td>
                        <td className="border-2 border-black p-1 text-center italic text-[7px]">KEGUNAAN</td>
                        <td className="border-2 border-black p-1"></td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
             <div className="mt-16 grid grid-cols-2 gap-12 text-center text-black print:break-inside-avoid">
                <div>
                   <p className="text-[11px] font-black underline mb-10">Tandatangan Murid / Penjaga</p>
                   <p className="border-t-2 border-black pt-2 text-[11px] uppercase font-black text-black">Tarikh: ..............................</p>
                </div>
                <div>
                   <p className="text-[11px] font-black underline mb-10">Tandatangan Guru SPBT</p>
                   <p className="border-t-2 border-black pt-2 text-[11px] uppercase font-black text-black">Cap Sekolah</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {isMemberDetailOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[15px] border-indigo-600 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b bg-indigo-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0">{selectedMemberDetail.name.charAt(0)}</div>
                <div><h3 className="text-xl font-black uppercase italic leading-none">{selectedMemberDetail.name}</h3><p className="text-[9px] font-black text-indigo-400 uppercase mt-2">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• TAHUN ${selectedMemberDetail.year}` : ''}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setMemberToEdit({ ...selectedMemberDetail }); setIsEditingMember(true); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Edit2 size={20} /></button>
                <button onClick={() => setIsMemberDetailOpen(false)} className="p-2 text-slate-300 hover:text-rose-500"><X size={20} /></button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-4 no-scrollbar">
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => { setBorrowFilterYear(selectedMemberDetail.year || 1); setIsBorrowModalOpen(true); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"><Plus size={14}/> PINJAM BARU</button>
                 {selectedMemberDetail.type === 'Murid' && (
                   <button onClick={() => setIsPrintFormOpen(true)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"><FileText size={14}/> CETAK BORANG</button>
                 )}
              </div>
              <div className="border-t pt-4">
                <h4 className="text-[10px] font-black uppercase italic mb-4">Pinjaman Aktif</h4>
                <div className="space-y-3">
                  {getActiveLoans(selectedMemberDetail.name).map(loan => (
                    <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between group animate-in slide-in-from-right-4">
                      <p className="font-black text-indigo-950 text-[10px] uppercase truncate flex-1 pr-4">{loan.bookTitle}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-[8px] uppercase transition-colors hover:bg-emerald-700 shadow-sm">PULANG</button>
                        <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-500 hover:text-white transition-colors shadow-sm"><AlertTriangle size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {getActiveLoans(selectedMemberDetail.name).length === 0 && <p className="text-center py-10 opacity-40 text-[10px] font-black italic text-indigo-950 uppercase">Tiada pinjaman aktif.</p>}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              <button onClick={() => { if(confirm("Padam ahli?")) { setMembers(prev => prev.filter(m => m.id !== selectedMemberDetail.id)); setIsMemberDetailOpen(false); }}} className="text-rose-500 text-[9px] font-black uppercase flex items-center gap-2 hover:text-rose-700 transition-all font-black"><Trash2 size={16}/> PADAM AHLI</button>
              <button onClick={() => setIsMemberDetailOpen(false)} className="px-6 py-3 bg-white border rounded-xl text-[9px] font-black uppercase shadow-sm text-indigo-950">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      {isAddingMember && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-b-[15px] border-indigo-600">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic text-indigo-950 leading-tight">Daftar Ahli Baru</h3>
              <button onClick={() => setIsAddingMember(false)} className="p-2 text-slate-300 hover:text-rose-500"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                {['Guru', 'Murid'].map(t => (
                  <button key={t} onClick={() => setNewMember({...newMember, type: t as UserType})} className={`flex-1 py-3 rounded-lg font-black text-[9px] uppercase transition-all ${newMember.type === t ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{t}</button>
                ))}
              </div>
              <input type="text" placeholder="NAMA PENUH" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] text-indigo-950 outline-none focus:border-indigo-600" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value.toUpperCase()})} />
              {newMember.type === 'Murid' && (
                <div className="flex gap-2">
                  {YEARS.map(y => <button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] transition-all ${newMember.year === y ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-500'}`}>{y}</button>)}
                </div>
              )}
              <button onClick={handleAddMember} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl border-b-4 border-indigo-800 flex items-center justify-center gap-2 transition-transform active:scale-95"><UserPlus size={18}/> DAFTARKAN AHLI</button>
            </div>
          </div>
        </div>
      )}

      {isEditingMember && memberToEdit && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-b-[15px] border-indigo-600">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic text-indigo-950 leading-tight">Edit Maklumat Ahli</h3>
              <button onClick={() => { setIsEditingMember(false); setMemberToEdit(null); }} className="p-2 text-slate-300 hover:text-rose-500"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <input type="text" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] text-indigo-950 outline-none focus:border-indigo-600" value={memberToEdit.name} onChange={e => setMemberToEdit({...memberToEdit, name: e.target.value.toUpperCase()})} />
              {memberToEdit.type === 'Murid' && (
                <div className="flex gap-2">
                  {YEARS.map(y => <button key={y} onClick={() => setMemberToEdit({...memberToEdit, year: y})} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] ${memberToEdit.year === y ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-500'}`}>{y}</button>)}
                </div>
              )}
              <button onClick={handleUpdateMember} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl border-b-4 border-indigo-800 flex items-center justify-center gap-2 transition-transform active:scale-95"><Save size={18}/> KEMASKINI MAKLUMAT</button>
            </div>
          </div>
        </div>
      )}

      {(isAddingBook || isEditingBook) && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-b-[15px] border-indigo-600">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic text-indigo-950 leading-tight">{isAddingBook ? 'Daftar Buku Baru' : 'Edit Maklumat Buku'}</h3>
              <button onClick={() => { setIsAddingBook(false); setIsEditingBook(false); }} className="p-2 text-slate-300 hover:text-rose-500"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <input type="text" placeholder="KOD BUKU" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] text-indigo-950 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.code : bookToEdit?.code} onChange={e => isAddingBook ? setNewBook({...newBook, code: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, code: e.target.value.toUpperCase()})} />
              <input type="text" placeholder="JUDUL BUKU" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black uppercase text-[10px] text-indigo-950 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.title : bookToEdit?.title} onChange={e => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] text-indigo-950 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.year : bookToEdit?.year} onChange={e => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}</select>
                <input type="number" step="0.01" placeholder="HARGA (RM)" className="w-full px-5 py-4 rounded-xl border-2 bg-emerald-50 font-black text-[10px] text-emerald-900 outline-none focus:border-emerald-600" value={isAddingBook ? newBook.price : bookToEdit?.price} onChange={e => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} />
              </div>
              <input type="number" placeholder="STOK AWAL" className="w-full px-5 py-4 rounded-xl border-2 bg-slate-50 font-black text-[10px] text-indigo-950 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.stock : bookToEdit?.stock} onChange={e => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} />
              <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl border-b-4 border-indigo-800 flex items-center justify-center gap-2 transition-transform active:scale-95"><Save size={18}/> SIMPAN REKOD</button>
            </div>
          </div>
        </div>
      )}

      {isBorrowModalOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col border-b-[15px] border-indigo-600 text-indigo-950 animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center">
              <div><h3 className="text-xl font-black uppercase italic leading-tight">Pilih Buku Pinjaman</h3><p className="text-[9px] font-black text-indigo-600 uppercase mt-1">{selectedMemberDetail.name}</p></div>
              <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="p-2 text-slate-300 hover:text-rose-500"><X size={24} /></button>
            </div>
            <div className="px-8 pt-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setBorrowFilterYear(y)} className={`min-w-[70px] py-2.5 rounded-lg font-black text-[9px] border-2 uppercase transition-all ${borrowFilterYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-slate-50 text-slate-400'}`}>TAHUN {y}</button>
                ))}
              </div>
            </div>
            <div className="p-8 pt-4 overflow-y-auto max-h-[45vh] grid grid-cols-1 md:grid-cols-2 gap-3 no-scrollbar">
              {books.filter(b => b.year === borrowFilterYear).map(book => {
                const isSelected = selectedBooksToBorrow.has(book.id);
                const isAlreadyBorrowed = getActiveLoans(selectedMemberDetail.name).some(l => l.bookId === book.id);
                const isOutOfStock = book.stock <= 0;
                return (
                  <div key={book.id} onClick={isAlreadyBorrowed || isOutOfStock ? undefined : () => {
                      const s = new Set(selectedBooksToBorrow);
                      s.has(book.id) ? s.delete(book.id) : s.add(book.id);
                      setSelectedBooksToBorrow(s);
                    }} 
                    className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center ${isAlreadyBorrowed ? 'bg-slate-100 opacity-60 grayscale' : isOutOfStock ? 'opacity-50' : isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white cursor-pointer hover:border-indigo-300'}`}>
                    <div className="overflow-hidden flex-1"><h4 className="font-black text-[10px] uppercase truncate">{book.title}</h4><p className="text-[8px] font-black uppercase mt-1 opacity-70">{book.code} • {isAlreadyBorrowed ? 'SUDAH DIPINJAM' : `STOK: ${book.stock}`}</p></div>
                    {isSelected && <CheckCircle size={16}/>}{isAlreadyBorrowed && <Lock size={14} />}
                  </div>
                );
              })}
            </div>
            <div className="p-8 border-t flex items-center justify-between bg-slate-50">
              <span className="text-[11px] font-black uppercase italic tracking-widest">{selectedBooksToBorrow.size} UNIT DIPILIH</span>
              <button onClick={() => { Array.from(selectedBooksToBorrow).forEach((id: any) => handleAction(id, 'Pinjaman', selectedMemberDetail.name, selectedMemberDetail.type, 1)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase shadow-xl border-b-4 border-indigo-900 transition-transform active:scale-95 disabled:opacity-50" disabled={selectedBooksToBorrow.size === 0}>SAHKAN PINJAMAN</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;