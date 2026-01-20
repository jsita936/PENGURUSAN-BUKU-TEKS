import React, { useState, useEffect } from 'react';
import { Book, Transaction, UserType, TransactionStatus, ActionType, BookType, Member, AdminSettings, ResolutionMethod, ResolutionStatus } from './types';
import { INITIAL_BOOKS, YEARS, CATEGORIES } from './constants';
import { getStockInsight } from './services/geminiService';
import { 
  Library, 
  History, 
  LayoutDashboard, 
  UserCircle, 
  Search, 
  AlertTriangle,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  Edit2,
  X,
  Lock,
  School,
  RotateCcw,
  ShieldCheck,
  BookPlus,
  UserPlus,
  Plus,
  ArrowRight,
  Sparkles,
  Save,
  KeyRound,
  FileText,
  DollarSign,
  User,
  Coins,
  CalendarDays,
  TrendingUp,
  Printer,
  Share2
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
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'manage' | 'members' | 'damages' | 'cash_flow' | 'session' | 'system'>('overview');
  const [adminMemberView, setAdminMemberView] = useState<'Guru' | 'Murid'>('Guru');
  
  // --- Tetapan & Auth ---
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    schoolName: '', adminName: '', adminId: '', adminPass: '', isRegistered: false
  });

  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // --- UI Filters ---
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1])); 
  
  // --- Modal States ---
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isMemberDetailOpen, setIsMemberDetailOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);
  const [borrowingStudent, setBorrowingStudent] = useState<Member | null>(null);
  const [selectedBooksToBorrow, setSelectedBooksToBorrow] = useState<Set<string>>(new Set());
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 });
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });
  const [isEditingMemberName, setIsEditingMemberName] = useState(false);
  const [editedMemberName, setEditedMemberName] = useState('');

  // --- Cloud Sync Logic ---
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#sync=')) {
      try {
        const encodedData = hash.replace('#sync=', '');
        const decodedData = JSON.parse(decodeURIComponent(escape(atob(encodedData))));
        if (confirm(`Data sekolah "${decodedData.adminSettings.schoolName}" dikesan. Adakah anda ingin mengimport data ahli dan stok ke peranti ini?`)) {
          setBooks(decodedData.books);
          setMembers(decodedData.members);
          setAdminSettings(decodedData.adminSettings);
          localStorage.setItem('spbt_books_data', JSON.stringify(decodedData.books));
          localStorage.setItem('spbt_members_data', JSON.stringify(decodedData.members));
          localStorage.setItem('spbt_admin_settings', JSON.stringify(decodedData.adminSettings));
          window.history.replaceState(null, "", window.location.pathname);
          alert("Penyelarasan Berjaya!");
        }
      } catch (e) {
        console.error("Ralat Sync:", e);
      }
    }
  }, []);

  // --- Persistence ---
  useEffect(() => {
    const savedSettings = localStorage.getItem('spbt_admin_settings');
    const savedName = localStorage.getItem('spbt_user_name');
    const savedBooks = localStorage.getItem('spbt_books_data');
    const savedTrans = localStorage.getItem('spbt_trans_data');
    const savedMembers = localStorage.getItem('spbt_members_data');

    if (savedSettings) setAdminSettings(JSON.parse(savedSettings));
    if (savedName) {
        setUserName(savedName);
        if (savedName === 'ADMIN') setIsAdminAuthenticated(true);
        setAuthView('main');
    }
    if (savedBooks) setBooks(JSON.parse(savedBooks));
    if (savedTrans) setTransactions(JSON.parse(savedTrans));
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    else setMembers([{ id: '1', name: 'PENYELARAS SPBT', type: 'Guru' }]);
  }, []);

  useEffect(() => {
    localStorage.setItem('spbt_books_data', JSON.stringify(books));
    localStorage.setItem('spbt_trans_data', JSON.stringify(transactions));
    localStorage.setItem('spbt_members_data', JSON.stringify(members));
    localStorage.setItem('spbt_admin_settings', JSON.stringify(adminSettings));
  }, [books, transactions, members, adminSettings]);

  // --- Handlers ---
  const handleGenerateSyncLink = () => {
    const syncData = { books, members, adminSettings };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(syncData))));
    const shareUrl = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert("PAUTAN SYNC DISALIN!"));
  };

  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSettings({ ...adminSettings, isRegistered: true });
    setAuthView('admin_auth');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminIdInput === adminSettings.adminId && adminPasswordInput === adminSettings.adminPass) {
      setIsAdminAuthenticated(true);
      setUserName('ADMIN');
      localStorage.setItem('spbt_user_name', 'ADMIN');
      setAuthView('main');
      setActiveTab('admin');
    } else alert("ID atau Kata Laluan Salah!");
  };

  const handleSetUser = () => {
    const match = members.find(m => m.name.toUpperCase() === tempName.trim().toUpperCase() && m.type === 'Guru');
    if (match) {
      setUserName(match.name);
      localStorage.setItem('spbt_user_name', match.name);
      setAuthView('main');
    } else alert(`Nama "${tempName}" tidak didaftarkan sebagai Guru.`);
  };

  const handleLogout = () => {
    setUserName(''); setTempName(''); setIsAdminAuthenticated(false); setAuthView('landing');
    localStorage.removeItem('spbt_user_name');
  };

  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1, silent: boolean = false) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    if (action === 'Pinjaman' && book.stock < qty) {
      if (!silent) alert(`Stok "${book.title}" tidak mencukupi.`);
      return;
    }
    
    let status: TransactionStatus = 'Berjaya';
    let stockChange = (action === 'Pinjaman') ? -qty : qty;
    let resStatus: ResolutionStatus | undefined;

    if (action === 'Pulang Rosak/Hilang') {
      status = 'Rosak/Hilang'; stockChange = 0; resStatus = 'Tertunggak';
    }

    if (stockChange !== 0) setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: Math.max(0, b.stock + stockChange) } : b));
    
    const newTrans: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      bookId, bookTitle: book.title, userName: targetUser, userType: targetType, quantity: qty,
      timestamp: new Date().toLocaleString('ms-MY'), createdAt: Date.now(), action, status,
      resolutionStatus: resStatus, fineAmount: action === 'Pulang Rosak/Hilang' ? book.price : 0
    };
    setTransactions(prev => [newTrans, ...prev]);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    const trans = transactions.find(t => t.id === transactionId);
    if (!trans) return;
    if (method === 'Buku') setBooks(prev => prev.map(b => b.id === trans.bookId ? { ...b, stock: b.stock + 1 } : b));
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } : t));
    alert(`Kerosakan Selesai melalui ganti ${method === 'Buku' ? 'buku' : 'nilai tunai'}.`);
  };

  const handleUpdateMemberName = () => {
    if (!selectedMemberDetail || !editedMemberName.trim()) return;
    const oldName = selectedMemberDetail.name;
    const newName = editedMemberName.trim().toUpperCase();
    setMembers(prev => prev.map(m => m.id === selectedMemberDetail.id ? { ...m, name: newName } : m));
    setTransactions(prev => prev.map(t => t.userName === oldName ? { ...t, userName: newName } : t));
    setSelectedMemberDetail({ ...selectedMemberDetail, name: newName });
    setIsEditingMemberName(false);
    alert("Nama ahli dikemaskini.");
  };

  const handleRemoveMember = (id: string) => {
    if(confirm("Padam ahli secara kekal?")) {
      setMembers(prev => prev.filter(m => m.id !== id));
      setIsMemberDetailOpen(false);
    }
  };

  const handleRemoveBook = (id: string) => {
    if(confirm("Padam buku secara kekal?")) {
      setBooks(prev => prev.filter(b => b.id !== id));
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
  };

  const handleUpdateBook = () => {
    if (!bookToEdit) return;
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? (bookToEdit as Book) : b));
    setIsEditingBook(false);
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
    setAiInsight(insight || null);
    setIsAiLoading(false);
  };

  // --- Views ---

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
              <p className="text-indigo-200 text-sm">Kawalan stok, urus ahli & penyelarasan peranti.</p>
              <ArrowRight className="mt-8 text-indigo-400 group-hover:translate-x-2 transition" />
            </button>
            <button onClick={() => setAuthView('guru_auth')} className="bg-white/10 border-2 border-white/10 p-10 rounded-[3rem] text-left hover:bg-white/20 transition group border-emerald-400/30">
              <UserCircle size={32} className="mb-4 text-emerald-400" />
              <h3 className="text-2xl font-black uppercase text-white">Log Masuk Guru</h3>
              <p className="text-indigo-200 text-sm">Log pinjaman layan diri & profil ahli.</p>
              <ArrowRight className="mt-8 text-emerald-400 group-hover:translate-x-2 transition" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authView === 'setup' || authView === 'admin_auth' || authView === 'guru_auth') {
    const isGuru = authView === 'guru_auth';
    const isSetup = authView === 'setup';
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center animate-in zoom-in">
          <h3 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter mb-10 leading-tight">
            {isSetup ? 'Daftar Admin' : isGuru ? 'Log Masuk Guru' : 'Akses Admin'}
          </h3>
          <form onSubmit={isSetup ? handleRegisterAdmin : isGuru ? (e) => { e.preventDefault(); handleSetUser(); } : handleAdminLogin} className="space-y-4">
            {isSetup && <input type="text" required className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder="NAMA SEKOLAH" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />}
            <input type="text" required className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-indigo-900 focus:border-indigo-600 outline-none" placeholder={isGuru ? "NAMA PENUH (GURU)" : "ID ADMIN"} value={isGuru ? tempName : (isSetup ? adminSettings.adminId : adminIdInput)} onChange={(e) => isGuru ? setTempName(e.target.value) : (isSetup ? setAdminSettings({...adminSettings, adminId: e.target.value}) : setAdminIdInput(e.target.value))} />
            {!isGuru && <input type="password" required className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-indigo-900 focus:border-indigo-600 outline-none" placeholder="KATA LALUAN" value={isSetup ? adminSettings.adminPass : adminPasswordInput} onChange={(e) => isSetup ? setAdminSettings({...adminSettings, adminPass: e.target.value}) : setAdminPasswordInput(e.target.value)} />}
            <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-indigo-700 transition uppercase tracking-widest text-xs shadow-xl active:scale-95">Masuk Sistem</button>
            <button type="button" onClick={() => setAuthView('landing')} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Kembali</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-indigo-950 font-['Plus_Jakarta_Sans']">
      {/* Navigation */}
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 shadow-xl z-20 overflow-hidden">
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
          <p className="text-[10px] font-black uppercase mb-4 text-indigo-200 truncate px-2">{userName}</p>
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/20 text-rose-300 rounded-xl text-[10px] font-black border border-rose-500/30 uppercase tracking-widest hover:bg-rose-600 transition">Log Keluar</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <h2 className="text-xl font-black text-indigo-900 uppercase tracking-tighter">{activeTab.toUpperCase()}</h2>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-black border border-indigo-200 uppercase tracking-widest">{adminSettings.schoolName}</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 bg-slate-50">
          
          {activeTab === 'inventory' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-2 rounded-2xl border-2 border-slate-200 shadow-sm flex gap-2 w-fit">
                <button onClick={() => setInventoryView('Guru')} className={`px-10 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Kegunaan Guru</button>
                <button onClick={() => setInventoryView('Murid')} className={`px-10 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Kegunaan Murid</button>
              </div>

              {inventoryView === 'Guru' ? (
                <div className="space-y-8">
                  <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`shrink-0 px-8 py-4 rounded-2xl font-black border-2 transition-all ${selectedYear === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-200 text-indigo-950 hover:border-indigo-400'}`}>Tahun {y}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.filter(b => b.year === selectedYear).map(book => {
                      const hasBorrowed = getActiveLoans(userName).some(l => l.bookId === book.id);
                      return (
                        <div key={book.id} className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group hover:border-indigo-300">
                           <h4 className="font-black text-indigo-950 text-sm mb-2 uppercase h-10 overflow-hidden leading-tight group-hover:text-indigo-600 transition-colors">{book.title}</h4>
                           <p className="text-[10px] text-slate-500 font-black uppercase mb-6 italic">Stok: <span className={book.stock < 20 ? 'text-rose-600 font-bold' : 'text-indigo-600'}>{book.stock}</span></p>
                           <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-indigo-700">Pinjam</button>
                             <button disabled={!hasBorrowed} onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${hasBorrowed ? 'bg-emerald-600 text-white shadow-lg active:scale-95 hover:bg-emerald-700' : 'bg-slate-100 text-slate-400'}`}>Pulang</button>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`shrink-0 px-10 py-5 rounded-[2rem] font-black border-2 transition-all ${selectedYear === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-200 text-indigo-950'}`}>Tahun {y}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {members.filter(m => m.type === 'Murid' && m.year === selectedYear).map(student => {
                      const isExpanded = expandedStudents.has(student.id);
                      const activeLoans = getActiveLoans(student.name);
                      return (
                        <div key={student.id} className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden transition-all group hover:border-indigo-400">
                          <button onClick={() => { const newExp = new Set(expandedStudents); isExpanded ? newExp.delete(student.id) : newExp.add(student.id); setExpandedStudents(newExp); }} className={`w-full px-8 py-6 flex justify-between items-center transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                             <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black shadow-inner border-2 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">{student.name.charAt(0)}</div>
                                <div><h4 className="font-black text-indigo-950 uppercase text-xs">{student.name}</h4><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{activeLoans.length} Pinjaman Aktif</p></div>
                             </div>
                             {isExpanded ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-slate-300" />}
                          </button>
                          {isExpanded && (
                            <div className="p-8 space-y-4 bg-white border-t-2 border-slate-100 animate-in slide-in-from-top-2">
                               <button onClick={() => { setBorrowingStudent(student); setIsBorrowModalOpen(true); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 mb-4 hover:bg-indigo-700 transition-all shadow-lg active:scale-95"><Plus size={16}/> Daftar Pinjaman</button>
                               {activeLoans.map(loan => (
                                 <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between group/item hover:border-indigo-300 transition-all">
                                    <div className="flex-1 pr-4">
                                      <p className="font-black text-indigo-950 text-[11px] uppercase truncate">{loan.bookTitle}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{loan.timestamp}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleAction(loan.bookId, 'Pemulangan', student.name, 'Murid')} className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"><CheckCircle size={16}/></button>
                                      <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', student.name, 'Murid')} className="p-2.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"><AlertTriangle size={16}/></button>
                                    </div>
                                 </div>
                               ))}
                               {activeLoans.length === 0 && <p className="text-center text-[10px] font-black text-slate-400 uppercase italic py-4">Tiada rekod pinjaman aktif dikesan.</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {members.filter(m => m.type === 'Murid' && m.year === selectedYear).length === 0 && <p className="col-span-2 text-center py-20 font-black text-slate-300 uppercase italic tracking-widest">Tiada data murid untuk Tahun {selectedYear}.</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-2.5 rounded-[2rem] border-2 shadow-sm border-slate-200">
                  <button onClick={() => setAdminSubTab('overview')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Rumusan</button>
                  <button onClick={() => setAdminSubTab('manage')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'manage' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Inventori</button>
                  <button onClick={() => setAdminSubTab('members')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'members' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Ahli & Guru</button>
                  <button onClick={() => setAdminSubTab('damages')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'damages' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Kerosakan</button>
                  <button onClick={() => setAdminSubTab('cash_flow')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'cash_flow' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Ganti Nilai</button>
                  <button onClick={() => setAdminSubTab('session')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'session' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Urus Sesi</button>
                  <button onClick={() => setAdminSubTab('system')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'system' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Sync</button>
              </div>

              {adminSubTab === 'members' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                     <div className="bg-white p-2 rounded-2xl border-2 border-slate-200 shadow-sm flex gap-2">
                        <button onClick={() => setAdminMemberView('Guru')} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adminMemberView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Kumpulan Guru</button>
                        <button onClick={() => setAdminMemberView('Murid')} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adminMemberView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Kumpulan Murid</button>
                     </div>
                     <button onClick={() => { setNewMember({...newMember, type: adminMemberView}); setIsAddingMember(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition active:scale-95"><UserPlus size={18} /> Daftar Ahli Baru</button>
                  </div>
                  
                  {adminMemberView === 'Guru' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {members.filter(m => m.type === 'Guru').map(member => (
                        <div key={member.id} onClick={() => { setSelectedMemberDetail(member); setEditedMemberName(member.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all group cursor-pointer flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-indigo-100">{member.name.charAt(0)}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-black text-xs uppercase text-indigo-950 truncate leading-tight group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{getActiveLoans(member.name).length} Pinjaman Aktif</p>
                              </div>
                           </div>
                           <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {YEARS.map(year => {
                        const yearMembers = members.filter(m => m.type === 'Murid' && m.year === year);
                        const isYearExpanded = expandedYears.has(year);
                        return (
                          <div key={year} className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                             <button onClick={() => { const s = new Set(expandedYears); isYearExpanded ? s.delete(year) : s.add(year); setExpandedYears(s); }} className={`w-full px-8 py-5 flex items-center justify-between transition-all ${isYearExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 ${isYearExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-indigo-900 border-slate-200'}`}>{year}</div>
                                  <h4 className="font-black text-indigo-900 uppercase tracking-tighter">Murid Tahun {year}</h4>
                                  <span className="text-[9px] bg-indigo-100 px-3 py-1 rounded-full text-indigo-800 font-black">{yearMembers.length} Ahli</span>
                                </div>
                                {isYearExpanded ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-slate-300" />}
                             </button>
                             {isYearExpanded && (
                               <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t-2 border-slate-50 bg-white">
                                 {yearMembers.map(member => (
                                   <div key={member.id} onClick={() => { setSelectedMemberDetail(member); setEditedMemberName(member.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-slate-50 rounded-2xl border-2 border-transparent p-4 shadow-sm hover:border-indigo-400 hover:bg-white transition-all group cursor-pointer flex items-center gap-4">
                                      <div className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg border-2 border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">{member.name.charAt(0)}</div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-[10px] uppercase text-indigo-950 truncate">{member.name}</h4>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{getActiveLoans(member.name).length} Pinjaman</p>
                                      </div>
                                   </div>
                                 ))}
                                 {yearMembers.length === 0 && <p className="col-span-3 text-center py-10 font-black text-slate-300 uppercase italic text-xs tracking-widest">Tiada murid didaftarkan untuk Tahun {year}.</p>}
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {adminSubTab === 'manage' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black uppercase tracking-tighter text-indigo-950">Inventori Bilik Buku</h3>
                     <button onClick={() => { setIsAddingBook(true); setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 }); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700 transition active:scale-95"><BookPlus size={18} className="inline mr-2"/> Daftar Buku Baru</button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {books.sort((a,b) => a.year - b.year).map(book => (
                      <div key={book.id} className="bg-white p-6 rounded-3xl border-2 border-slate-200 flex items-center justify-between hover:border-indigo-400 transition-all shadow-sm group">
                         <div className="flex-1 pr-4">
                           <h4 className="font-black text-[11px] uppercase text-indigo-950 leading-tight group-hover:text-indigo-600 transition-colors">{book.title}</h4>
                           <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">TAHUN {book.year} • {book.type} • RM {book.price.toFixed(2)}</p>
                         </div>
                         <div className="flex items-center gap-8 text-indigo-950">
                            <div className="text-center w-16">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Stok</p>
                              <p className={`font-black text-lg ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-700'}`}>{book.stock}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setBookToEdit({...book}); setIsEditingBook(true); }} className="p-3 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"><Edit2 size={18}/></button>
                              <button onClick={() => handleRemoveBook(book.id)} className="p-3 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><Trash2 size={18}/></button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'session' && (
                <div className="max-w-xl animate-in slide-in-from-bottom-4">
                   <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-xl">
                      <div className="flex items-center gap-4 mb-8 text-indigo-950"><TrendingUp className="text-indigo-600" size={32} /><h3 className="text-xl font-black uppercase tracking-tighter">Kawalan Sesi Sekolah</h3></div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">Urus pertukaran sesi tahunan atau bersihkan log sistem untuk sesi persekolahan yang baru.</p>
                      <div className="space-y-4">
                         <button onClick={() => { if(confirm("PENGESAHAN: Adakah anda ingin MENAIKKAN TAHUN semua murid? Murid Tahun 6 akan dikeluarkan secara kekal daripada sistem.")) { setMembers(prev => prev.map(m => m.type === 'Murid' && m.year ? {...m, year: m.year + 1} : m).filter(m => !(m.type === 'Murid' && m.year && m.year > 6))); alert("Proses Naik Kelas Berjaya!"); } }} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition active:scale-95 border-b-4 border-indigo-800"><ArrowUpFromLine size={18}/> Naikkan Tahun Murid</button>
                         <button onClick={() => { if(confirm("PENGESAHAN: Adakah anda pasti untuk RESET SEMUA log transaksi? Stok buku tidak akan berubah, tetapi semua rekod lama akan dipadam.")) { setTransactions([]); alert("Log dikosongkan."); } }} className="w-full py-5 bg-white border-2 border-slate-200 text-indigo-950 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition active:scale-95"><RotateCcw size={18}/> Kosongkan Log Transaksi</button>
                      </div>
                   </div>
                </div>
              )}

              {adminSubTab === 'damages' && (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                   <div className="p-10 border-b flex justify-between items-center bg-slate-50">
                     <h3 className="font-black uppercase tracking-tighter text-indigo-950">Rekod Kerosakan Tertunggak</h3>
                   </div>
                   <div className="divide-y divide-slate-100">
                     {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').map(t => (
                        <div key={t.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-all group">
                           <div>
                              <p className="font-black text-[11px] uppercase text-indigo-950 leading-tight group-hover:text-indigo-600 transition-colors">{t.bookTitle}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Peminjam: {t.userName} • RM {t.fineAmount?.toFixed(2)}</p>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-indigo-700 transition active:scale-95 border-b-2 border-indigo-800">Ganti Buku</button>
                              <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-emerald-700 transition active:scale-95 border-b-2 border-emerald-800">Bayar Tunai</button>
                           </div>
                        </div>
                     ))}
                     {transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length === 0 && <div className="p-20 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Tiada rekod kerosakan aktif.</div>}
                   </div>
                </div>
              )}

              {adminSubTab === 'cash_flow' && (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                  <div className="p-10 border-b flex justify-between items-center bg-slate-50">
                     <h3 className="font-black uppercase tracking-tighter text-indigo-950">Ganti Nilai (Aliran Tunai)</h3>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b-2 border-slate-100">
                        <tr><th className="px-10 py-6">Tarikh</th><th className="px-10 py-6">Nama Ahli</th><th className="px-10 py-6">Butiran Buku</th><th className="px-10 py-6">Jumlah (RM)</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-indigo-950">
                        {transactions.filter(t => t.resolutionMethod === 'Tunai').map(t => (
                          <tr key={t.id} className="text-xs hover:bg-emerald-50 transition duration-300">
                            <td className="px-10 py-6 font-bold text-slate-500">{t.timestamp}</td>
                            <td className="px-10 py-6 font-black uppercase">{t.userName}</td>
                            <td className="px-10 py-6 font-bold uppercase">{t.bookTitle}</td>
                            <td className="px-10 py-6 font-black text-emerald-700">+{t.fineAmount?.toFixed(2)}</td>
                          </tr>
                        ))}
                        {transactions.filter(t => t.resolutionMethod === 'Tunai').length === 0 && (
                          <tr><td colSpan={4} className="p-20 text-center font-black text-slate-300 uppercase italic tracking-widest">Tiada rekod bayaran tunai.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminSubTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Total Stok</p>
                      <p className="text-4xl font-black text-indigo-900 leading-none">{books.reduce((acc, b) => acc + Number(b.stock), 0)}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Pinjaman Aktif</p>
                      <p className="text-4xl font-black text-emerald-600 leading-none">{transactions.filter(t => t.action === 'Pinjaman').length}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Kerosakan</p>
                      <p className="text-4xl font-black text-rose-600 leading-none">{transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length}</p>
                    </div>
                    <button onClick={fetchAiInsight} className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl hover:bg-indigo-700 transition group relative overflow-hidden active:scale-95 shadow-indigo-600/20 border-b-4 border-indigo-800">
                       <Sparkles size={24} className="mb-2 text-indigo-200 animate-pulse" />
                       <p className="text-[10px] font-black uppercase tracking-widest mb-1 leading-none text-indigo-200">AI Analisa</p>
                       <p className="text-2xl font-black uppercase tracking-tighter leading-none">Gemini Insight</p>
                    </button>
                  </div>
                  {isAiLoading && <div className="p-10 text-center animate-pulse font-black text-indigo-600 uppercase tracking-widest text-sm">Menganalisa Data...</div>}
                  {aiInsight && !isAiLoading && (
                    <div className="bg-indigo-50 border-2 border-indigo-100 p-10 rounded-[3rem] animate-in slide-in-from-top-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-4 text-indigo-700 font-black uppercase text-xs tracking-widest border-b border-indigo-200 pb-4"><Sparkles size={16} /> Analisa Sistem</div>
                      <div className="prose prose-sm max-w-none text-indigo-950 font-bold whitespace-pre-wrap leading-relaxed">{aiInsight}</div>
                    </div>
                  )}
                </div>
              )}
              
              {adminSubTab === 'system' && (
                <div className="max-w-2xl animate-in slide-in-from-bottom-6">
                  <div className="bg-white rounded-[3rem] border-2 border-slate-200 p-10 shadow-xl">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-100">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner"><Share2 size={32} /></div>
                      <div>
                        <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none">Penyelarasan Sync</h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Akses pangkalan data anda dari mana-mana smartphone atau PC.</p>
                      </div>
                    </div>
                    <div className="p-8 bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] mb-10 text-center">
                       <p className="text-sm font-bold text-indigo-950 mb-6 leading-relaxed">Admin perlu menjana pautan khas ini dan kongsikan kepada Guru-guru. Mereka hanya perlu klik pautan tersebut satu kali sahaja di peranti mereka untuk mengakses data ahli dan stok terkini secara automatik.</p>
                       <button onClick={handleGenerateSyncLink} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-indigo-700 shadow-indigo-600/30 border-b-4 border-indigo-800"><Share2 size={20}/> Jana & Salin Pautan Sync</button>
                    </div>
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Profil sekolah dikemaskini."); }}>
                       <div className="relative">
                          <label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Sekolah (ID Sync)</label>
                          <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-indigo-950 uppercase outline-none focus:border-indigo-600 transition" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                       </div>
                       <button type="submit" className="w-full py-5 bg-indigo-950 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 border-b-4 border-slate-800"><Save size={18}/> Simpan Profil Sekolah</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[3rem] border-2 border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
               <div className="p-10 border-b bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter">Rekod Aktiviti Bilik Buku</h3>
                  <button onClick={() => window.print()} className="px-6 py-3 bg-white border-2 border-slate-200 text-indigo-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-sm hover:bg-slate-50 transition active:scale-95"><Printer size={16} /> Cetak Laporan</button>
               </div>
               <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b-2 border-slate-100 tracking-widest">
                   <tr><th className="px-10 py-6">Masa & Tarikh</th><th className="px-10 py-6">Peminjam</th><th className="px-10 py-6">Tindakan</th><th className="px-10 py-6">Judul Buku</th><th className="px-10 py-6">Status Rekod</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white text-indigo-950">
                   {transactions.map(t => (
                     <tr key={t.id} className="text-sm hover:bg-indigo-50/30 transition duration-300">
                       <td className="px-10 py-6 font-bold text-slate-500 text-xs">{t.timestamp}</td>
                       <td className="px-10 py-6 font-black text-indigo-900 uppercase text-xs">{t.userName}</td>
                       <td className="px-10 py-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span></td>
                       <td className="px-10 py-6 font-bold text-slate-700 text-xs uppercase truncate max-w-[200px]">{t.bookTitle}</td>
                       <td className="px-10 py-6"><span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${t.status === 'Rosak/Hilang' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>{t.status}</span></td>
                     </tr>
                   ))}
                   {transactions.length === 0 && <tr><td colSpan={5} className="py-20 text-center font-black text-slate-300 uppercase italic tracking-widest">Tiada rekod transaksi dijumpai.</td></tr>}
                 </tbody>
               </table>
             </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-white rounded-[3.5rem] border-2 border-slate-200 p-10 shadow-xl text-center relative overflow-hidden group hover:border-indigo-400 transition-all border-b-8 border-indigo-500">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><UserCircle size={240} className="text-indigo-950" /></div>
                <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-xl relative z-10 border-4 border-white">{(userName || 'G').charAt(0)}</div>
                <h3 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter mb-1 leading-none relative z-10">{userName}</h3>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-8 tracking-widest italic relative z-10">{isAdminAuthenticated ? 'AKSES PENTADBIR' : 'GURU BERDAFTAR'}</p>
                <div className="grid grid-cols-2 gap-4 relative z-10 max-w-lg mx-auto">
                   <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl group hover:border-indigo-300 transition-all"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Pinjaman Aktif</p><p className="text-2xl font-black text-indigo-600 leading-none">{getActiveLoans(userName).length}</p></div>
                   <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl group hover:border-emerald-300 transition-all"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Status Akaun</p><p className="text-[10px] font-black text-emerald-600 uppercase leading-none">SYNC ONLINE</p></div>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] border-2 border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b-2 border-slate-100 bg-slate-50/80 flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md"><BookOpen size={20} /></div>
                  <h4 className="font-black text-indigo-950 uppercase tracking-tighter">Pinjaman Aktif Saya</h4>
                </div>
                <div className="p-8 space-y-4">
                  {getActiveLoans(userName).map(loan => (
                    <div key={loan.id} className="p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-indigo-400 transition-all shadow-sm">
                       <div className="flex-1">
                          <p className="font-black text-indigo-950 text-sm uppercase leading-tight group-hover:text-indigo-600 transition-colors">{loan.bookTitle}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">DIPINJAM: {loan.timestamp}</p>
                       </div>
                       <button 
                        onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition active:scale-95 shadow-emerald-600/20 border-b-4 border-emerald-800"
                       >
                         Pulangkan Buku
                       </button>
                    </div>
                  ))}
                  {getActiveLoans(userName).length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                       <ShieldCheck size={56} className="text-indigo-100" />
                       <p className="font-black text-slate-300 uppercase italic tracking-widest text-sm">Akaun anda bersih. Tiada buku dalam pinjaman.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {isBorrowModalOpen && borrowingStudent && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in border-4 border-indigo-400">
                <div className="p-10 border-b-2 border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                   <div>
                    <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter mb-1">Daftar Pinjaman Pukal</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md">{borrowingStudent.name}</span>
                      {borrowingStudent.year && <span className="px-3 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-600 text-[10px] font-black uppercase tracking-widest">MURID TAHUN {borrowingStudent.year}</span>}
                    </div>
                   </div>
                   <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm active:scale-95"><X size={24}/></button>
                </div>
                <div className="p-10 overflow-y-auto no-scrollbar flex-1 bg-white">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {books.filter(b => borrowingStudent.type === 'Murid' ? b.year === borrowingStudent.year : true).map(book => {
                        const isSelected = selectedBooksToBorrow.has(book.id);
                        return (
                          <div key={book.id} onClick={() => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-indigo-50 hover:border-indigo-400'}`}>
                             <div><h4 className={`font-black text-[11px] uppercase truncate ${isSelected ? 'text-white' : 'text-indigo-950'}`}>{book.title}</h4><p className={`text-[8px] uppercase font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>Stok: {book.stock} • {book.type}</p></div>
                             {isSelected && <CheckCircle size={18} className="text-white" />}
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="p-8 bg-slate-50 border-t-2 border-slate-100"><button onClick={() => { Array.from(selectedBooksToBorrow).forEach(id => handleAction(id, 'Pinjaman', borrowingStudent.name, borrowingStudent.type, 1, true)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); }} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest disabled:opacity-50 active:scale-95 transition-all shadow-indigo-600/30 border-b-4 border-indigo-800" disabled={selectedBooksToBorrow.size === 0}>Sahkan Pinjaman ({selectedBooksToBorrow.size} Judul)</button></div>
             </div>
          </div>
        )}

        {isMemberDetailOpen && selectedMemberDetail && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in border-4 border-indigo-400">
                <div className="p-10 border-b-2 border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white">{selectedMemberDetail.name.charAt(0)}</div>
                      <div className="flex-1">
                        {!isEditingMemberName ? (
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-tight">{selectedMemberDetail.name}</h3>
                            <button onClick={() => { setEditedMemberName(selectedMemberDetail.name); setIsEditingMemberName(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <input type="text" className="bg-white border-2 border-indigo-300 px-4 py-1.5 rounded-xl font-black uppercase text-sm outline-none w-full shadow-inner text-indigo-900" value={editedMemberName} onChange={(e) => setEditedMemberName(e.target.value.toUpperCase())} />
                             <button onClick={handleUpdateMemberName} className="p-2 bg-indigo-600 text-white rounded-lg shadow-md active:scale-95 border-b-2 border-indigo-800"><CheckCircle size={18}/></button>
                             <button onClick={() => setIsEditingMemberName(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg shadow-md active:scale-95"><X size={18}/></button>
                          </div>
                        )}
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• TAHUN ${selectedMemberDetail.year}` : ''}</p>
                      </div>
                   </div>
                   <button onClick={() => setIsMemberDetailOpen(false)} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm active:scale-95"><X size={24}/></button>
                </div>
                <div className="p-10 overflow-y-auto no-scrollbar flex-1 space-y-8 bg-white">
                   <div className="flex justify-between items-center border-b-2 border-indigo-50 pb-3">
                      <h4 className="text-[10px] font-black uppercase text-indigo-900 tracking-widest flex items-center gap-2"><BookOpen size={14} className="text-indigo-600"/> Rekod Pinjaman Aktif Semasa</h4>
                      <button onClick={() => { setBorrowingStudent(selectedMemberDetail); setIsBorrowModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] shadow-md flex items-center gap-1 hover:bg-indigo-700 transition active:scale-95 border-b-2 border-indigo-800"><Plus size={14}/> Tambah Pinjaman</button>
                   </div>
                   <div className="space-y-3">
                      {getActiveLoans(selectedMemberDetail.name).length > 0 ? getActiveLoans(selectedMemberDetail.name).map(loan => (
                        <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] flex items-center justify-between shadow-sm group hover:border-indigo-400 transition-all hover:bg-white">
                           <div className="flex-1 pr-4 overflow-hidden">
                             <p className="font-black text-indigo-950 text-[11px] uppercase truncate leading-tight group-hover:text-indigo-600 transition-colors">{loan.bookTitle}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{loan.timestamp}</p>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase shadow-md active:scale-95 transition-all hover:bg-emerald-700 border-b-2 border-emerald-800">Pulang</button>
                              <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition shadow-sm active:scale-95 border border-rose-100"><AlertTriangle size={18}/></button>
                           </div>
                        </div>
                      )) : (
                        <div className="text-center py-10 flex flex-col items-center gap-3">
                          <CheckCircle size={32} className="text-emerald-200" />
                          <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Tiada rekod pinjaman aktif ditemukan.</p>
                        </div>
                      )}
                   </div>
                </div>
                <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex justify-between items-center">
                   <p className="text-[8px] font-black text-slate-400 uppercase italic">Akses ID: {selectedMemberDetail.id}</p>
                   <button onClick={() => handleRemoveMember(selectedMemberDetail.id)} className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"><Trash2 size={16}/> Padam Profil Ahli</button>
                </div>
             </div>
          </div>
        )}

        {/* Modal Daftar Buku Baru */}
        {(isAddingBook || isEditingBook) && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-2xl animate-in zoom-in border-4 border-indigo-400">
                <div className="flex justify-between items-center mb-10"><h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-950 leading-tight">{isAddingBook ? 'Daftar Buku Baru' : 'Kemaskini Data Buku'}</h3><button onClick={() => {setIsAddingBook(false); setIsEditingBook(false);}} className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm"><X size={24}/></button></div>
                <div className="space-y-6">
                   <div className="relative"><label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest">Judul Buku Teks/Aktiviti</label><input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600 transition" value={isAddingBook ? newBook.title : bookToEdit?.title} onChange={(e) => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} /></div>
                   <div className="relative">
                    <label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest">Kategori Koleksi</label>
                    <select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-indigo-950 outline-none appearance-none focus:border-indigo-600 transition" value={isAddingBook ? newBook.type : bookToEdit?.type} onChange={(e) => isAddingBook ? setNewBook({...newBook, type: e.target.value as BookType}) : setBookToEdit({...bookToEdit!, type: e.target.value as BookType})}>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                    </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative"><label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest">Peringkat Tahun</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-indigo-950 outline-none appearance-none focus:border-indigo-600 transition" value={isAddingBook ? newBook.year : bookToEdit?.year} onChange={(e) => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>TAHUN {y}</option>)}</select></div>
                      <div className="relative"><label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest">Harga Ganti (RM)</label><input type="number" step="0.01" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-indigo-950 outline-none focus:border-indigo-600 transition" value={isAddingBook ? newBook.price : bookToEdit?.price} onChange={(e) => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} /></div>
                   </div>
                   <div className="relative"><label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest">Baki Stok Semasa</label><input type="number" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-indigo-950 outline-none focus:border-indigo-600 transition" value={isAddingBook ? newBook.stock : bookToEdit?.stock} onChange={(e) => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} /></div>
                   <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition active:scale-95 mt-4 border-b-4 border-indigo-800">Sahkan Maklumat Buku</button>
                </div>
             </div>
          </div>
        )}

        {/* Modal Daftar Member Baru */}
        {isAddingMember && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in border-4 border-indigo-400">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase tracking-tighter text-indigo-950 leading-none">Daftar {newMember.type} Baru</h3><button onClick={() => setIsAddingMember(false)} className="text-slate-400 hover:text-rose-500 transition"><X size={24}/></button></div>
                <div className="space-y-6">
                   <div className="relative"><label className="text-[9px] font-black uppercase text-indigo-400 absolute left-6 top-3 tracking-widest">Nama Penuh (Huruf Besar)</label><input type="text" placeholder="ALI BIN ABU" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-indigo-950 outline-none focus:border-indigo-600 transition" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value.toUpperCase()})} /></div>
                   {newMember.type === 'Murid' && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Pilih Tahun Pengajian</p>
                      <div className="grid grid-cols-3 gap-2">{YEARS.map(y => (<button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`py-4 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${newMember.year === y ? 'bg-indigo-600 text-white shadow-lg border-indigo-700 border-b-2' : 'bg-slate-50 border-2 border-slate-100 text-indigo-950 hover:bg-white'}`}>Tahun {y}</button>))}</div>
                    </div>
                   )}
                   <button onClick={handleAddMember} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition active:scale-95 mt-4 border-b-4 border-indigo-800">Sahkan Pendaftaran Ahli</button>
                </div>
             </div>
          </div>
        )}

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 px-8 py-5 flex justify-between z-30 shadow-[0_-10px_30px_rgba(30,27,75,0.12)]">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><BookOpen size={24} /><span className="text-[8px] uppercase tracking-tighter">Bilik Buku</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><History size={24} /><span className="text-[8px] uppercase tracking-tighter">Rekod</span></button>
           <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><UserCircle size={24} /><span className="text-[8px] uppercase tracking-tighter">Profil</span></button>
           {isAdminAuthenticated && (<button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'admin' ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}><LayoutDashboard size={24} /><span className="text-[8px] uppercase tracking-tighter">Admin</span></button>)}
        </div>
      </main>
    </div>
  );
};

export default App;
