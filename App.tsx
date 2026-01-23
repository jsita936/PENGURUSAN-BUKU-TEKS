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
  Sparkles,
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
  School,
  CheckCircle,
  FileText,
  RefreshCw
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

  const [persistentForms, setPersistentForms] = useState<Record<string, Record<string, any>>>(() => {
    const saved = localStorage.getItem('spbt_persistent_forms');
    return saved ? JSON.parse(saved) : {};
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

  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', code: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });
  const [isMemberDetailOpen, setIsMemberDetailOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowFilterYear, setBorrowFilterYear] = useState<number>(1);
  const [selectedBooksToBorrow, setSelectedBooksToBorrow] = useState<Set<string>>(new Set());
  const [isPrintFormOpen, setIsPrintFormOpen] = useState(false);
  const [isPrintDamageReportOpen, setIsPrintDamageReportOpen] = useState(false);
  const [isPrintHistoryOpen, setIsPrintHistoryOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [editableFormData, setEditableFormData] = useState<Record<string, { serial: string, receivedDate: string, returnDate: string, status: string }>>({});

  useEffect(() => localStorage.setItem('spbt_books', JSON.stringify(books)), [books]);
  useEffect(() => localStorage.setItem('spbt_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('spbt_members', JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem('spbt_settings', JSON.stringify(adminSettings)), [adminSettings]);
  useEffect(() => localStorage.setItem('spbt_persistent_forms', JSON.stringify(persistentForms)), [persistentForms]);

  useEffect(() => {
    if (selectedMemberDetail) {
      const memberKey = selectedMemberDetail.id;
      const savedData = persistentForms[memberKey] || {};
      const initial: typeof editableFormData = {};
      books.filter(b => b.year === selectedMemberDetail.year).forEach(b => {
        if (savedData[b.id]) {
          initial[b.id] = savedData[b.id];
        } else {
          const pinjam = transactions.find(t => t.bookId === b.id && t.userName === selectedMemberDetail.name && t.action === 'Pinjaman');
          const pulang = transactions.find(t => t.bookId === b.id && t.userName === selectedMemberDetail.name && (t.action === 'Pemulangan' || t.action === 'Pulang Rosak/Hilang'));
          initial[b.id] = {
            serial: '',
            receivedDate: pinjam?.timestamp.split(',')[0] || '',
            returnDate: pulang?.timestamp.split(',')[0] || '',
            status: pulang ? (pulang.action === 'Pulang Rosak/Hilang' ? 'ROSAK/HILANG' : 'BAIK') : ''
          };
        }
      });
      setEditableFormData(initial);
    }
  }, [selectedMemberDetail, books, transactions, persistentForms]);

  const handleUpdateFormData = (bookId: string, field: string, value: string) => {
    if (!selectedMemberDetail) return;
    const memberId = selectedMemberDetail.id;
    setEditableFormData(prev => {
      const updatedEntry = { ...prev[bookId], [field]: value };
      const newState = { ...prev, [bookId]: updatedEntry };
      setPersistentForms(oldForms => ({ ...oldForms, [memberId]: newState }));
      return newState;
    });
  };

  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    if (action === 'Pinjaman' && book.stock < qty) return alert("Stok tidak mencukupi!");

    let stockChange = 0;
    if (action === 'Pinjaman') stockChange = -qty;
    else if (action === 'Pemulangan') stockChange = book.type === 'Buku Aktiviti' ? 0 : qty;
    else if (action === 'Pulang Rosak/Hilang') stockChange = 0;

    const timestamp = new Date().toLocaleString('ms-MY');
    const dateOnly = timestamp.split(',')[0];

    const member = members.find(m => m.name === targetUser);
    if (member) {
      setPersistentForms(prev => {
        const currentMemberForm = prev[member.id] || {};
        const bookData = currentMemberForm[bookId] || { serial: '', receivedDate: '', returnDate: '', status: '' };
        let updatedBookForm = { ...bookData };
        if (action === 'Pinjaman') {
          updatedBookForm.receivedDate = dateOnly;
          updatedBookForm.returnDate = '';
          updatedBookForm.status = '';
        } else {
          updatedBookForm.returnDate = dateOnly;
          updatedBookForm.status = action === 'Pulang Rosak/Hilang' ? 'ROSAK/HILANG' : 'BAIK';
        }
        return { 
          ...prev, 
          [member.id]: { ...currentMemberForm, [bookId]: updatedBookForm } 
        };
      });
    }

    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: b.stock + stockChange } : b));
    setTransactions(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      bookId, bookTitle: book.title, userName: targetUser, userType: targetType, quantity: qty,
      timestamp, createdAt: Date.now(), action, status: action === 'Pulang Rosak/Hilang' ? 'Rosak/Hilang' : 'Berjaya',
      resolutionStatus: action === 'Pulang Rosak/Hilang' ? 'Tertunggak' : undefined, fineAmount: action === 'Pulang Rosak/Hilang' ? book.price : 0
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

  const getTotalInventoryForYear = (year: number | undefined) => {
    if (!year) return 0;
    return books.filter(b => b.year === year).length;
  };

  const handleResetHistory = () => {
    if (confirm("AMARAN: Padam semua log rekod transaksi?")) {
      setTransactions([]);
      alert("Log rekod dikosongkan.");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSchool || !regId || !regPass) return alert("Lengkapkan maklumat.");
    setAdminSettings({ ...adminSettings, schoolName: regSchool.toUpperCase(), adminId: regId, adminPass: regPass, isRegistered: true });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId === adminSettings.adminId && loginPass === adminSettings.adminPass) {
      setIsAuthenticated(true);
      localStorage.setItem('spbt_is_logged_in', 'true');
    } else alert("ID atau Kata Laluan Salah!");
  };

  const handleLogout = () => {
    if (confirm("Log keluar dari sistem?")) {
      setIsAuthenticated(false);
      localStorage.removeItem('spbt_is_logged_in');
    }
  };

  const handleSessionPromotion = () => {
    if (confirm("Adakah anda pasti untuk menaikkan tahun semua murid? Murid Tahun 6 akan dipadamkan dari sistem.")) {
      setMembers(prev => prev.map(m => {
        if (m.type === 'Murid' && m.year) {
          if (m.year < 6) return { ...m, year: m.year + 1 };
          return null;
        }
        return m;
      }).filter(Boolean) as Member[]);
      alert("Proses selesai.");
    }
  };

  const handleSessionReset = () => {
    if (confirm("AMARAN: Ini akan memadamkan SEMUA data ahli. Teruskan?")) {
      setMembers([]);
      setPersistentForms({});
      alert("Data dipadam.");
    }
  };

  const fetchAiInsight = async () => {
    setIsAiLoading(true);
    const insight = await getStockInsight(books, transactions);
    setAiInsight(insight);
    setIsAiLoading(false);
  };

  const handleAddNewBook = () => {
    if (!newBook.title) return;
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
    if (!bookToEdit) return;
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? bookToEdit : b));
    setIsEditingBook(false);
  };

  const handleAddMember = () => {
    if (!newMember.name) return;
    const member: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMember.name!.toUpperCase(),
      type: newMember.type || 'Guru',
      year: newMember.type === 'Murid' ? newMember.year : undefined
    };
    setMembers(prev => [...prev, member]);
    setIsAddingMember(false);
  };

  const handleUpdateMember = () => {
    if (!memberToEdit) return;
    setMembers(prev => prev.map(m => m.id === memberToEdit.id ? { ...memberToEdit, name: memberToEdit.name.toUpperCase() } : m));
    setIsEditingMember(false);
  };

  if (!adminSettings.isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-indigo-300 flex items-center justify-center p-6 text-indigo-950">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-600">
          <div className="mb-8 text-center">
            <School size={64} className="mx-auto mb-4 text-indigo-600" />
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Pendaftaran</h1>
          </div>
          <form onSubmit={handleRegister} className="space-y-4 font-bold">
            <input type="text" placeholder="NAMA SEKOLAH" className="w-full p-5 border-2 rounded-2xl uppercase bg-slate-50 outline-none" value={regSchool} onChange={e => setRegSchool(e.target.value)} />
            <input type="text" placeholder="ID ADMIN" className="w-full p-5 border-2 rounded-2xl bg-slate-50 outline-none" value={regId} onChange={e => setRegId(e.target.value)} />
            <input type="password" placeholder="KATA LALUAN" className="w-full p-5 border-2 rounded-2xl bg-slate-50 outline-none" value={regPass} onChange={e => setRegPass(e.target.value)} />
            <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase shadow-xl font-black">Daftar</button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-200 flex items-center justify-center p-6 text-indigo-950">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-900">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock size={40} className="text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Log Masuk</h1>
            <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">{adminSettings.schoolName}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 font-bold">
            <input type="text" placeholder="ID PENGGUNA" className="w-full p-5 border-2 rounded-2xl bg-slate-50 outline-none" value={loginId} onChange={e => setLoginId(e.target.value)} />
            <input type="password" placeholder="KATA LALUAN" className="w-full p-5 border-2 rounded-2xl bg-slate-50 outline-none" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase shadow-xl font-black">Masuk Sistem</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f1f5f9] text-indigo-950">
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 no-print">
        <div className="p-8 border-b border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Library size={24} /></div>
          <div><h1 className="font-black text-md tracking-tighter uppercase italic">E-SPBT PINTAR</h1><p className="text-[7px] text-indigo-400 font-black uppercase tracking-widest">{adminSettings.schoolName}</p></div>
        </div>
        <div className="flex-1 p-6 space-y-2">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'RUMUSAN' },
            { id: 'inventory', icon: Package, label: 'INVENTORI' },
            { id: 'members', icon: UserCircle, label: 'URUS AHLI' },
            { id: 'damages', icon: AlertTriangle, label: 'KOS GANTI' },
            { id: 'history', icon: History, label: 'LOG REKOD' },
            { id: 'session', icon: TrendingUp, label: 'URUS SESI' },
            { id: 'settings', icon: Settings, label: 'TETAPAN' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white font-black shadow-xl' : 'text-indigo-200/40 hover:text-white hover:bg-white/5 font-bold'}`}>
              <item.icon size={20} /><span className="text-[10px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-6 border-t border-white/10">
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black border border-rose-500/20 uppercase hover:bg-rose-500 hover:text-white transition-all">KELUAR</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden no-print">
        <header className="h-20 bg-white border-b px-6 flex items-center justify-between shadow-sm z-20">
          <h2 className="text-lg font-black text-indigo-900 uppercase italic tracking-tighter">{activeTab.toUpperCase()}</h2>
          <div className="text-[9px] font-black uppercase text-slate-400">{adminSettings.schoolName}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-[#f8fafc]">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'STOK BUKU', val: books.reduce((a, b) => a + b.stock, 0), icon: Package, color: 'text-indigo-600' },
                  { label: 'AKTIF PINJAM', val: transactions.filter(t => t.action === 'Pinjaman').length, icon: BookOpen, color: 'text-blue-600' },
                  { label: 'KES ROSAK', val: transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length, icon: AlertTriangle, color: 'text-rose-600' },
                  { label: 'JUMLAH AHLI', val: members.length, icon: UserCircle, color: 'text-emerald-600' }
                ].map((c, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{c.label}</p>
                    <p className={`text-4xl font-black ${c.color}`}>{c.val}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white flex items-center gap-6">
                <Sparkles size={32} className={isAiLoading ? 'animate-spin' : ''} />
                <div className="flex-1"><h3 className="text-xl font-black uppercase italic">Analisa AI Gemini</h3><p className="text-[9px] text-indigo-300">Data & Trend Terkini Sekolah</p></div>
                <button onClick={fetchAiInsight} disabled={isAiLoading} className="px-6 py-3 bg-white text-indigo-950 rounded-xl font-black text-[10px] uppercase shadow-lg">JANA</button>
              </div>
              {aiInsight && <div className="p-6 bg-white border-2 border-indigo-100 rounded-[2rem] text-[11px] font-bold text-indigo-950 leading-relaxed whitespace-pre-wrap italic shadow-sm">{aiInsight}</div>}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm">
                  {['Buku Teks', 'Buku Aktiviti'].map(type => (
                    <button key={type} onClick={() => setInventoryType(type as BookType)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>{type}</button>
                  ))}
                </div>
                <button onClick={() => { setIsAddingBook(true); setNewBook({ ...newBook, type: inventoryType, year: selectedYear }); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-indigo-700"><Plus size={18}/> TAMBAH BUKU</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {YEARS.map(y => <button key={y} onClick={() => setSelectedYear(y)} className={`min-w-[80px] py-3 rounded-xl font-black text-[10px] border-2 uppercase transition-all ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400'}`}>TAHUN {y}</button>)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.filter(b => b.year === selectedYear && b.type === inventoryType).map(book => (
                  <div key={book.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:border-indigo-400 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-emerald-600">RM {book.price.toFixed(2)}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setBookToEdit(book); setIsEditingBook(true); }} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                        <button onClick={() => { if(confirm("Padam buku ini?")) setBooks(prev => prev.filter(b => b.id !== book.id))}} className="text-rose-400 hover:text-rose-600"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    <h4 className="font-black text-[11px] uppercase mb-1 h-8 overflow-hidden text-indigo-950">{book.title}</h4>
                    <p className="text-[9px] font-black text-indigo-600 bg-indigo-50 w-fit px-3 py-1 rounded-lg uppercase mb-4">{book.code}</p>
                    <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center"><span className="text-[8px] font-black text-slate-500 uppercase">STOK:</span><span className={`text-xl font-black ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-950'}`}>{book.stock}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm">
                  {['Guru', 'Murid'].map(type => (
                    <button key={type} onClick={() => setMemberTypeView(type as UserType)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${memberTypeView === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>{type}</button>
                  ))}
                </div>
                <button onClick={() => setIsAddingMember(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg"><Plus size={18}/></button>
              </div>
              {memberTypeView === 'Murid' && <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">{YEARS.map(y => <button key={y} onClick={() => setMemberYearView(y)} className={`min-w-[70px] py-3 rounded-xl font-black text-[10px] border-2 transition-all ${memberYearView === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400'}`}>TAHUN {y}</button>)}</div>}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="CARI NAMA AHLI..." className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl border font-black text-[10px] uppercase text-indigo-950 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {members.filter(m => m.type === memberTypeView && (memberTypeView === 'Guru' || m.year === memberYearView) && (searchQuery === '' || m.name.includes(searchQuery))).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                  <div key={m.id} onClick={() => { setSelectedMemberDetail(m); setIsMemberDetailOpen(true); }} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black">{m.name.charAt(0)}</div>
                      <div className="overflow-hidden">
                        <h4 className="font-black text-[10px] uppercase truncate w-32 text-indigo-950">{m.name}</h4>
                        <p className="text-[8px] font-black text-slate-400 mt-1 uppercase italic">{getActiveLoans(m.name).length} / {getTotalInventoryForYear(m.year)} PINJAMAN</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between gap-4">
                <div className="bg-white p-2 rounded-2xl border flex flex-wrap gap-1">
                   {MONTHS.map((m, idx) => (
                     <button key={m} onClick={() => setHistoryMonth(idx)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${historyMonth === idx ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{m}</button>
                   ))}
                </div>
                <button onClick={handleResetHistory} className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase border border-rose-100 flex items-center gap-2"><RefreshCw size={16}/> RESET</button>
              </div>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl">
                 <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-indigo-900 uppercase italic">LOG {MONTHS[historyMonth].toUpperCase()}</h3>
                    <button onClick={() => setIsPrintHistoryOpen(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg transition-transform active:scale-95"><Printer size={16}/> CETAK</button>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-600 border-b">
                       <tr><th className="px-8 py-6">PENGGUNA</th><th className="px-8 py-6">JUDUL BUKU</th><th className="px-8 py-6 text-center">TINDAKAN</th><th className="px-8 py-6 text-right">TARIKH</th></tr>
                     </thead>
                     <tbody className="divide-y text-[10px] font-bold">
                       {transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).map(t => (
                         <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors">
                           <td className="px-8 py-5 uppercase font-black text-indigo-950">{t.userName}</td>
                           <td className="px-8 py-5 uppercase truncate max-w-[200px] text-indigo-900">{t.bookTitle}</td>
                           <td className="px-8 py-5 text-center">
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${t.action === 'Pinjaman' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                               {t.action}
                             </span>
                           </td>
                           <td className="px-8 py-5 text-right italic text-slate-500 font-medium">{t.timestamp}</td>
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
                    <p className="text-[9px] font-black text-slate-400 uppercase">DENDA TERKUTIP (TUNAI)</p>
                    <p className="text-4xl font-black text-emerald-600">RM {transactions.filter(t => t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Tunai').reduce((acc, t) => acc + (t.fineAmount || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={() => setIsPrintDamageReportOpen(true)} className="px-8 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[12px] uppercase shadow-xl flex items-center gap-4 hover:bg-indigo-700 transition-all"><Printer size={32}/>CETAK LAPORAN</button>
              </div>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black border-b text-slate-600">
                    <tr><th className="px-8 py-6">NAMA AHLI</th><th className="px-8 py-6">JUDUL BUKU</th><th className="px-8 py-6 text-center">NILAI</th><th className="px-8 py-6 text-right">STATUS</th></tr>
                  </thead>
                  <tbody className="divide-y text-[10px] font-bold">
                    {transactions.filter(t => t.status === 'Rosak/Hilang').map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 uppercase font-black text-indigo-950">{t.userName}</td>
                        <td className="px-8 py-5 uppercase truncate max-w-[200px] text-indigo-900">{t.bookTitle}</td>
                        <td className="px-8 py-5 text-center text-rose-700 font-black">RM {t.fineAmount?.toFixed(2)}</td>
                        <td className="px-8 py-5 text-right flex justify-end gap-2">
                          {t.resolutionStatus === 'Tertunggak' ? (
                            <>
                              <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] uppercase font-black shadow-sm">TUNAI</button>
                              <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[8px] uppercase font-black shadow-sm">BUKU</button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] uppercase font-black border">LUNAS</span>
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
            <div className="max-w-xl mx-auto py-10">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center border-b-[12px] border-indigo-600">
                <TrendingUp size={64} className="mx-auto text-indigo-600 mb-6" />
                <h3 className="text-2xl font-black uppercase italic mb-8 text-indigo-950">Pengurusan Sesi</h3>
                <div className="space-y-4">
                  <button onClick={handleSessionPromotion} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-3 hover:bg-indigo-700"><ArrowUpCircle size={20}/> NAIK KELAS</button>
                  <button onClick={handleSessionReset} className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[11px] border border-rose-100 flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white transition-all"><RotateCcw size={20}/> RESET SEMUA AHLI</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto py-10">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-indigo-100">
                <h3 className="text-xl font-black uppercase italic mb-8 border-b pb-4 text-indigo-950">Tetapan Pentadbir</h3>
                <div className="space-y-6 font-bold">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 mb-2 block font-black">ID PENGGUNA</label>
                    <input type="text" className="w-full p-4 border-2 rounded-xl text-indigo-950 bg-slate-50 focus:border-indigo-600 outline-none font-black" value={adminSettings.adminId} onChange={e => setAdminSettings({ ...adminSettings, adminId: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 mb-2 block font-black">KATA LALUAN</label>
                    <input type="text" className="w-full p-4 border-2 rounded-xl text-indigo-950 bg-slate-50 focus:border-indigo-600 outline-none font-black" value={adminSettings.adminPass} onChange={e => setAdminSettings({ ...adminSettings, adminPass: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 mb-2 block font-black">NAMA SEKOLAH</label>
                    <input type="text" className="w-full p-4 border-2 rounded-xl uppercase text-indigo-950 bg-slate-50 focus:border-indigo-600 outline-none font-black" value={adminSettings.schoolName} onChange={e => setAdminSettings({ ...adminSettings, schoolName: e.target.value.toUpperCase() })} />
                  </div>
                  <button onClick={() => { localStorage.setItem('spbt_settings', JSON.stringify(adminSettings)); alert("Simpan!"); }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase shadow-xl font-black tracking-widest hover:bg-indigo-700">KEMASKINI TETAPAN</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- LAPORAN KOS GANTI --- */}
      {isPrintDamageReportOpen && (
        <div className="fixed inset-0 bg-white z-[600] flex flex-col overflow-y-auto no-scrollbar print-area" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="p-4 border-b flex justify-between items-center bg-rose-700 text-white no-print">
            <h3 className="text-sm font-black uppercase italic">Prapapar Laporan Kos Ganti</h3>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="px-6 py-2 bg-white text-rose-700 rounded-xl font-black text-[10px] uppercase shadow-lg"><Printer size={14} className="inline mr-2"/> CETAK</button>
               <button onClick={() => setIsPrintDamageReportOpen(false)} className="p-2 text-white/50"><X size={24}/></button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-5xl mx-auto p-12 bg-white text-black print:p-0">
             <div className="border-b-4 border-black pb-4 mb-10 text-center">
                <h2 className="text-lg font-bold uppercase text-black">{adminSettings.schoolName}</h2>
                <h1 className="text-2xl font-black uppercase underline mt-2 text-black">REKOD KEROSAKAN & KOS GANTI BUKU TEKS</h1>
             </div>

             {YEARS.map(y => {
               const yearTrans = transactions.filter(t => {
                 const m = members.find(member => member.name === t.userName);
                 return t.status === 'Rosak/Hilang' && m?.year === y;
               });
               if (yearTrans.length === 0) return null;

               const studentGroups: Record<string, Transaction[]> = {};
               yearTrans.forEach(t => {
                 if (!studentGroups[t.userName]) studentGroups[t.userName] = [];
                 studentGroups[t.userName].push(t);
               });

               return (
                 <div key={y} className="mb-12">
                   <h3 className="text-lg font-black uppercase border-b-2 border-black mb-4 bg-slate-50 p-2 text-black">TAHUN {y}</h3>
                   {Object.entries(studentGroups).map(([name, list]) => {
                     const total = list.reduce((acc, curr) => acc + (curr.fineAmount || 0), 0);
                     const isSettled = list.every(t => t.resolutionStatus === 'Selesai');
                     return (
                       <div key={name} className="mb-8 border-2 border-black p-4">
                         <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1">
                            <h4 className="text-xs font-black uppercase text-black">NAMA MURID: {name}</h4>
                            <span className={`text-[10px] font-black uppercase ${isSettled ? 'text-green-600' : 'text-red-600'}`}>STATUS: {isSettled ? 'LUNAS' : 'TUNGGAKAN'}</span>
                         </div>
                         <table className="w-full border-collapse border-2 border-black text-[10px] text-black">
                           <thead>
                             <tr className="bg-slate-100">
                               <th className="border-2 border-black p-2 w-8 uppercase text-black">BIL</th>
                               <th className="border-2 border-black p-2 text-left uppercase text-black">JUDUL BUKU</th>
                               <th className="border-2 border-black p-2 w-24 text-center uppercase text-black">HARGA (RM)</th>
                               <th className="border-2 border-black p-2 w-36 text-center uppercase text-black">CATATAN</th>
                             </tr>
                           </thead>
                           <tbody>
                             {list.map((t, idx) => (
                               <tr key={t.id}>
                                 <td className="border-2 border-black p-2 text-center font-bold text-black">{idx + 1}</td>
                                 <td className="border-2 border-black p-2 uppercase font-bold text-black">{t.bookTitle}</td>
                                 <td className="border-2 border-black p-2 text-center font-black text-black">{t.fineAmount?.toFixed(2)}</td>
                                 <td className={`border-2 border-black p-2 text-center uppercase font-black text-[9px] ${t.resolutionStatus === 'Selesai' ? 'text-green-600' : 'text-red-600'}`}>
                                   {t.resolutionStatus === 'Selesai' ? `LUNAS (${t.resolutionMethod})` : 'TERTUNGGAK'}
                                 </td>
                               </tr>
                             ))}
                             <tr className="bg-slate-50 font-black">
                               <td colSpan={2} className="border-2 border-black p-3 text-right uppercase text-black">JUMLAH KOS GANTI:</td>
                               <td className="border-2 border-black p-3 text-center bg-white text-black underline font-black">RM {total.toFixed(2)}</td>
                               <td className="border-2 border-black p-3"></td>
                             </tr>
                           </tbody>
                         </table>
                       </div>
                     );
                   })}
                 </div>
               );
             })}
          </div>
        </div>
      )}

      {/* --- BORANG PEMINJAMAN --- */}
      {isPrintFormOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col overflow-y-auto no-scrollbar print-area" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="p-4 border-b flex justify-between items-center bg-indigo-950 text-white no-print">
            <h3 className="text-sm font-black uppercase italic">Borang Peminjaman Murid</h3>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg transition-transform active:scale-95"><Printer size={14} className="inline mr-2"/> CETAK</button>
               <button onClick={() => setIsPrintFormOpen(false)} className="p-2 text-white/50"><X size={24}/></button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-5xl mx-auto p-12 bg-white text-black print:p-0">
             <div className="border-b-2 border-black pb-4 mb-8 text-center text-black">
                <h2 className="text-lg font-bold uppercase text-black">{adminSettings.schoolName}</h2>
                <h1 className="text-xl font-black uppercase underline text-black">REKOD PENERIMAAN & PEMULANGAN BUKU TEKS</h1>
                <h3 className="text-md font-bold mt-1 uppercase text-black">TAHUN {selectedMemberDetail.year}</h3>
             </div>
             <div className="grid grid-cols-2 gap-8 mb-8 text-xs font-bold uppercase text-black">
                <div className="flex gap-2 items-center text-black">NAMA MURID: <span className="border-b-2 border-black flex-1 font-black text-black">{selectedMemberDetail.name}</span></div>
                <div className="flex gap-2 items-center text-black">SESI: <span className="border-b-2 border-black flex-1 font-black text-black">{new Date().getFullYear()}</span></div>
             </div>
             <table className="w-full border-collapse border-2 border-black text-[9px] text-black">
                <thead>
                  <tr className="bg-white">
                    <th className="border-2 border-black p-1 w-6 uppercase text-black">BIL</th>
                    <th className="border-2 border-black p-1 w-16 uppercase text-black">KOD</th>
                    <th className="border-2 border-black p-1 text-left uppercase text-black">NAMA BUKU</th>
                    <th className="border-2 border-black p-1 w-12 uppercase text-black">RM</th>
                    <th className="border-2 border-black p-1 w-[280px] uppercase text-black">NO SIRI</th>
                    <th className="border-2 border-black p-1 w-20 uppercase text-black">TERIMA</th>
                    <th className="border-2 border-black p-1 w-20 uppercase text-black">PULANG</th>
                    <th className="border-2 border-black p-1 uppercase text-black">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-100"><td colSpan={8} className="border-2 border-black px-4 py-1 font-black text-center uppercase text-[10px] text-black">BAHAGIAN 1: BUKU TEKS</td></tr>
                  {books.filter(b => b.year === selectedMemberDetail.year && b.type === 'Buku Teks').map((b, idx) => {
                    const data = editableFormData[b.id] || { serial: '', receivedDate: '', returnDate: '', status: '' };
                    const isDamaged = data.status.toUpperCase().includes('ROSAK') || data.status.toUpperCase().includes('HILANG');
                    return (
                      <tr key={b.id}>
                        <td className="border-2 border-black p-1 text-center font-bold text-black">{idx + 1}.</td>
                        <td className="border-2 border-black p-1 text-center font-black text-black">{b.code}</td>
                        <td className="border-2 border-black p-1 font-bold uppercase text-black">{b.title}</td>
                        <td className="border-2 border-black p-1 text-center font-bold text-black">{b.price.toFixed(2)}</td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.serial} onChange={e => handleUpdateFormData(b.id, 'serial', e.target.value.toUpperCase())} className="w-full h-full text-center font-black text-[10px] outline-none bg-transparent uppercase text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.receivedDate} onChange={e => handleUpdateFormData(b.id, 'receivedDate', e.target.value)} className="w-full h-full text-center text-[10px] outline-none bg-transparent text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.returnDate} onChange={e => handleUpdateFormData(b.id, 'returnDate', e.target.value)} className="w-full h-full text-center text-[10px] outline-none bg-transparent text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.status} onChange={e => handleUpdateFormData(b.id, 'status', e.target.value.toUpperCase())} className="w-full h-full text-center font-black text-[7px] outline-none bg-transparent uppercase" style={{ color: isDamaged ? 'red' : 'black' }} /></td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100"><td colSpan={8} className="border-2 border-black px-4 py-1 font-black text-center uppercase text-[10px] text-black">BAHAGIAN 2: BUKU AKTIVITI</td></tr>
                  {books.filter(b => b.year === selectedMemberDetail.year && b.type === 'Buku Aktiviti').map((b, idx) => {
                    const data = editableFormData[b.id] || { serial: '', receivedDate: '', returnDate: '', status: '' };
                    return (
                      <tr key={b.id}>
                        <td className="border-2 border-black p-1 text-center font-bold text-black">{idx + 1}.</td>
                        <td className="border-2 border-black p-1 text-center font-black text-black">{b.code}</td>
                        <td className="border-2 border-black p-1 font-bold uppercase text-black">{b.title}</td>
                        <td className="border-2 border-black p-1 text-center font-bold text-black">{b.price.toFixed(2)}</td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.serial} onChange={e => handleUpdateFormData(b.id, 'serial', e.target.value.toUpperCase())} className="w-full h-full text-center font-black text-[10px] outline-none bg-transparent uppercase text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.receivedDate} onChange={e => handleUpdateFormData(b.id, 'receivedDate', e.target.value)} className="w-full h-full text-center text-[10px] outline-none bg-transparent text-black" /></td>
                        <td colSpan={2} className="border-2 border-black p-1 text-center italic text-[7px] font-black uppercase bg-slate-50 text-black">KEGUNAAN MURID</td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* --- PAPARAN CETAK LOG REKOD --- */}
      {isPrintHistoryOpen && (
        <div className="fixed inset-0 bg-white z-[700] flex flex-col overflow-y-auto no-scrollbar print-area" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="p-4 border-b flex justify-between items-center bg-indigo-950 text-white no-print">
            <h3 className="text-sm font-black uppercase italic">Prapapar Log Rekod {MONTHS[historyMonth].toUpperCase()}</h3>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg"><Printer size={14} className="inline mr-2"/> CETAK SEKARANG</button>
               <button onClick={() => setIsPrintHistoryOpen(false)} className="p-2 text-white/50"><X size={24}/></button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-5xl mx-auto p-12 bg-white text-black print:p-0">
             <div className="border-b-4 border-black pb-4 mb-10 text-center">
                <h2 className="text-lg font-bold uppercase text-black">{adminSettings.schoolName}</h2>
                <h1 className="text-2xl font-black uppercase underline mt-2 text-black">LOG REKOD TRANSAKSI BUKU TEKS - {MONTHS[historyMonth].toUpperCase()} {new Date().getFullYear()}</h1>
             </div>
             <table className="w-full border-collapse border-2 border-black text-[10px] text-black">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border-2 border-black p-3 text-center w-12 uppercase">BIL</th>
                    <th className="border-2 border-black p-3 text-left uppercase">NAMA PENGGUNA</th>
                    <th className="border-2 border-black p-3 text-left uppercase">JUDUL BUKU</th>
                    <th className="border-2 border-black p-3 text-center uppercase">TINDAKAN</th>
                    <th className="border-2 border-black p-3 text-right uppercase">TARIKH & MASA</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).map((t, idx) => (
                    <tr key={t.id}>
                      <td className="border-2 border-black p-3 text-center font-bold">{idx + 1}</td>
                      <td className="border-2 border-black p-3 font-black uppercase">{t.userName}</td>
                      <td className="border-2 border-black p-3 font-bold uppercase">{t.bookTitle}</td>
                      <td className="border-2 border-black p-3 text-center font-black uppercase italic">{t.action}</td>
                      <td className="border-2 border-black p-3 text-right font-medium">{t.timestamp}</td>
                    </tr>
                  ))}
                  {transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).length === 0 && (
                    <tr><td colSpan={5} className="border-2 border-black p-10 text-center font-black uppercase italic">Tiada rekod untuk bulan ini.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* --- MODAL BUTIRAN AHLI --- */}
      {isMemberDetailOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[15px] border-indigo-600">
            <div className="p-8 border-b bg-indigo-50/50 flex justify-between items-center text-indigo-950">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0">{selectedMemberDetail.name.charAt(0)}</div>
                <div><h3 className="text-xl font-black uppercase italic leading-none">{selectedMemberDetail.name}</h3><p className="text-[9px] font-black text-indigo-400 uppercase mt-2">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• TAHUN ${selectedMemberDetail.year}` : ''}</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setMemberToEdit({ ...selectedMemberDetail }); setIsEditingMember(true); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Edit2 size={20}/></button>
                <button onClick={() => setIsMemberDetailOpen(false)} className="p-2 text-slate-300 hover:text-rose-500"><X size={20}/></button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-4 no-scrollbar">
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => { setBorrowFilterYear(selectedMemberDetail.year || 1); setIsBorrowModalOpen(true); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg transition-transform active:scale-95"><Plus className="inline mr-1" size={14}/> PINJAM BARU</button>
                 {selectedMemberDetail.type === 'Murid' && <button onClick={() => setIsPrintFormOpen(true)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg transition-transform active:scale-95"><FileText className="inline mr-1" size={14}/> CETAK BORANG</button>}
              </div>
              <div className="border-t pt-4">
                <h4 className="text-[10px] font-black uppercase italic text-indigo-950 mb-4">Pinjaman Aktif</h4>
                <div className="space-y-2">
                  {getActiveLoans(selectedMemberDetail.name).map(loan => (
                    <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                      <p className="font-black text-indigo-950 text-[10px] uppercase truncate flex-1 pr-4">{loan.bookTitle}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-[8px] uppercase">PULANG</button>
                        <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-500 hover:text-white"><AlertTriangle size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {getActiveLoans(selectedMemberDetail.name).length === 0 && <p className="text-center py-10 opacity-40 text-[10px] font-black italic text-indigo-950">Tiada pinjaman aktif.</p>}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              <button onClick={() => { if(confirm("Padam ahli?")) { setMembers(prev => prev.filter(m => m.id !== selectedMemberDetail.id)); setIsMemberDetailOpen(false); }}} className="text-rose-500 text-[9px] font-black uppercase flex items-center gap-2 hover:text-rose-700 font-black"><Trash2 size={16}/> PADAM AHLI</button>
              <button onClick={() => setIsMemberDetailOpen(false)} className="px-6 py-3 bg-white border rounded-xl text-[9px] font-black uppercase text-indigo-950 shadow-sm">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS DAFTAR/EDIT BUKU --- */}
      {(isAddingBook || isEditingBook) && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 border-b-[15px] border-indigo-600 shadow-2xl text-indigo-950 animate-in zoom-in duration-200">
            <h3 className="text-xl font-black uppercase italic mb-8">{isAddingBook ? 'Daftar Buku' : 'Kemaskini Buku'}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block ml-1">KOD BUKU (BT/BA)</label>
                <input type="text" className="w-full p-4 border-2 rounded-xl font-black uppercase text-[10px] bg-slate-50 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.code : bookToEdit?.code} onChange={e => isAddingBook ? setNewBook({...newBook, code: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, code: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block ml-1">JUDUL BUKU PENUH</label>
                <input type="text" className="w-full p-4 border-2 rounded-xl font-black uppercase text-[10px] bg-slate-50 outline-none focus:border-indigo-600" value={isAddingBook ? newBook.title : bookToEdit?.title} onChange={e => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block ml-1">TAHUN</label>
                  <select className="w-full p-4 border-2 rounded-xl font-black text-[10px] bg-slate-50 outline-none" value={isAddingBook ? newBook.year : bookToEdit?.year} onChange={e => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}</select>
                </div>
                <div>
                  <label className="text-[12px] font-black uppercase text-emerald-600 mb-1 block ml-1 border-b-2 border-emerald-100">HARGA BUKU (RM)</label>
                  <input type="number" step="0.01" className="w-full p-4 border-2 border-emerald-200 rounded-xl font-black text-[11px] bg-emerald-50 text-emerald-700 outline-none" value={isAddingBook ? newBook.price : bookToEdit?.price} onChange={e => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-black uppercase text-blue-600 mb-1 block ml-1 border-b-2 border-blue-100">JUMLAH STOK (UNIT)</label>
                <input type="number" className="w-full p-4 border-2 border-blue-200 rounded-xl font-black text-[11px] bg-blue-50 text-blue-900 outline-none focus:border-blue-600" value={isAddingBook ? newBook.stock : bookToEdit?.stock} onChange={e => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} />
              </div>
              <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase font-black shadow-xl tracking-widest transition-transform active:scale-95">SIMPAN DATA</button>
              <button onClick={() => { setIsAddingBook(false); setIsEditingBook(false); }} className="w-full py-2 text-slate-400 uppercase text-[9px] font-bold">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {isAddingMember && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 border-b-[15px] border-indigo-600 shadow-2xl text-indigo-950 animate-in zoom-in duration-200">
            <h3 className="text-xl font-black uppercase italic mb-8">Tambah Ahli Baru</h3>
            <div className="space-y-6">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                {['Guru', 'Murid'].map(t => (
                  <button key={t} onClick={() => setNewMember({...newMember, type: t as UserType})} className={`flex-1 py-3 rounded-lg font-black text-[9px] uppercase transition-all ${newMember.type === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{t}</button>
                ))}
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block ml-1">NAMA PENUH</label>
                <input type="text" className="w-full px-5 py-4 rounded-xl border-2 font-black uppercase text-[10px] bg-slate-50 outline-none" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value.toUpperCase()})} />
              </div>
              {newMember.type === 'Murid' && (
                <div>
                  <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block ml-1">TAHUN / KELAS</label>
                  <div className="flex gap-2">
                    {YEARS.map(y => <button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] ${newMember.year === y ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{y}</button>)}
                  </div>
                </div>
              )}
              <button onClick={handleAddMember} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl transition-transform active:scale-95">DAFTAR AHLI</button>
              <button onClick={() => setIsAddingMember(false)} className="w-full py-3 text-slate-400 font-bold uppercase text-[9px]">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {isEditingMember && memberToEdit && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 border-b-[15px] border-indigo-600 shadow-2xl text-indigo-950 animate-in zoom-in duration-200">
            <h3 className="text-xl font-black uppercase italic mb-8">Kemaskini Ahli</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block ml-1">NAMA PENUH</label>
                <input type="text" className="w-full px-5 py-4 rounded-xl border-2 font-black uppercase text-[10px] bg-slate-50 outline-none" value={memberToEdit.name} onChange={e => setMemberToEdit({...memberToEdit, name: e.target.value.toUpperCase()})} />
              </div>
              <button onClick={handleUpdateMember} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl transition-transform active:scale-95">SIMPAN PERUBAHAN</button>
              <button onClick={() => setIsEditingMember(false)} className="w-full py-3 text-slate-400 font-bold uppercase text-[9px]">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {isBorrowModalOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col border-b-[15px] border-indigo-600 text-indigo-950 animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center">
              <div><h3 className="text-xl font-black uppercase italic">Pilih Buku Pinjaman</h3><p className="text-[9px] font-black text-indigo-600 mt-1 uppercase">{selectedMemberDetail.name}</p></div>
              <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="text-slate-300 hover:text-rose-500"><X size={24}/></button>
            </div>
            <div className="px-8 pt-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {YEARS.map(y => <button key={y} onClick={() => setBorrowFilterYear(y)} className={`min-w-[70px] py-2.5 rounded-lg font-black text-[9px] border-2 uppercase transition-all ${borrowFilterYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-slate-50 text-slate-400'}`}>TAHUN {y}</button>)}
              </div>
            </div>
            <div className="p-8 pt-4 overflow-y-auto max-h-[45vh] grid grid-cols-1 md:grid-cols-2 gap-3 no-scrollbar">
              {books.filter(b => b.year === borrowFilterYear).map(book => {
                const isSelected = selectedBooksToBorrow.has(book.id);
                const isAlreadyBorrowed = getActiveLoans(selectedMemberDetail.name).some(l => l.bookId === book.id);
                return (
                  <div key={book.id} onClick={isAlreadyBorrowed ? undefined : () => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center ${isAlreadyBorrowed ? 'bg-slate-100 opacity-60' : isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-white hover:border-indigo-300 cursor-pointer'}`}>
                    <div className="overflow-hidden flex-1 text-indigo-950"><h4 className={`font-black text-[10px] uppercase truncate ${isSelected ? 'text-white' : ''}`}>{book.title}</h4><p className={`text-[8px] uppercase mt-1 ${isSelected ? 'text-white/70' : 'text-slate-400 font-bold'}`}>{book.code} • {isAlreadyBorrowed ? 'SUDAH PINJAM' : `STOK: ${book.stock}`}</p></div>
                    {isSelected && <CheckCircle size={16} className="text-white"/>}{isAlreadyBorrowed && <Lock size={14}/>}
                  </div>
                );
              })}
            </div>
            <div className="p-8 border-t flex items-center justify-between bg-slate-50">
              <span className="text-[11px] font-black uppercase italic text-indigo-950 tracking-widest">{selectedBooksToBorrow.size} UNIT DIPILIH</span>
              <button onClick={() => { 
                Array.from(selectedBooksToBorrow).forEach((id: any) => handleAction(id, 'Pinjaman', selectedMemberDetail.name, selectedMemberDetail.type)); 
                setIsBorrowModalOpen(false); 
                setSelectedBooksToBorrow(new Set()); 
              }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase shadow-xl transition-transform active:scale-95" disabled={selectedBooksToBorrow.size === 0}>SAHKAN PINJAMAN</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;