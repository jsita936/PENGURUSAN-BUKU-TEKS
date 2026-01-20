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
  TrendingUp
} from 'lucide-react';

type AuthView = 'landing' | 'guru_auth' | 'admin_auth' | 'setup' | 'main';
type ConfirmActionType = 'promote' | 'reset' | null;

const App: React.FC = () => {
  // --- State Utama ---
  const [authView, setAuthView] = useState<AuthView>('landing');
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'admin' | 'profile'>('inventory');
  const [inventoryView, setInventoryView] = useState<'Guru' | 'Murid'>('Guru');
  const [studentModality, setStudentModality] = useState<BookType>('Buku Teks');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'manage' | 'members' | 'damages' | 'cash_flow' | 'session' | 'system'>('overview');
  const [adminMemberView, setAdminMemberView] = useState<'Guru' | 'Murid'>('Guru');
  
  // --- Penapis Admin ---
  const [damageYearFilter, setDamageYearFilter] = useState<number>(1);
  const [cashYearFilter, setCashYearFilter] = useState<number>(1);
  
  // --- Tetapan & Auth ---
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    schoolName: '',
    adminName: '',
    adminId: '',
    adminPass: '',
    isRegistered: false
  });

  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // --- UI & Filter States ---
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [adminMemberYearFilter, setAdminMemberYearFilter] = useState<number>(1);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
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
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 });
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });
  const [isEditingMemberName, setIsEditingMemberName] = useState(false);
  const [editedMemberName, setEditedMemberName] = useState('');

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
  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSettings.schoolName || !adminSettings.adminId || !adminSettings.adminPass) {
      alert("Sila lengkapkan semua maklumat pendaftaran.");
      return;
    }
    const updatedSettings = { ...adminSettings, isRegistered: true };
    setAdminSettings(updatedSettings);
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
      setAdminIdInput(''); setAdminPasswordInput('');
    } else alert("ID atau Kata Laluan Admin Salah!");
  };

  const handleSetUser = () => {
    const nameToMatch = tempName.trim().toUpperCase();
    const memberMatch = members.find(m => m.name.toUpperCase() === nameToMatch && m.type === 'Guru');
    if (memberMatch) {
      setUserName(memberMatch.name);
      localStorage.setItem('spbt_user_name', memberMatch.name);
      setAuthView('main');
      setActiveTab('inventory');
      setInventoryView('Guru');
    } else alert(`Nama "${tempName}" tiada dalam senarai GURU terdaftar. Sila minta Admin daftarkan nama anda.`);
  };

  const handleLogout = () => {
    setUserName(''); setTempName(''); setIsAdminAuthenticated(false); setAuthView('landing');
    localStorage.removeItem('spbt_user_name');
  };

  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1, silent: boolean = false) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    if (action === 'Pinjaman' && book.stock < qty) {
      if (!silent) alert(`Maaf, stok "${book.title}" tidak mencukupi.`);
      return;
    }
    let noPerolehan = "";
    if (action === 'Pinjaman' && !silent) {
      const input = prompt(`No. Perolehan untuk ${targetUser}:`);
      noPerolehan = input?.trim() || "";
    }
    let status: TransactionStatus = 'Berjaya';
    let fine = 0;
    let stockChange = (action === 'Pinjaman') ? -qty : qty;
    let resStatus: ResolutionStatus | undefined;

    if (action === 'Pulang Rosak/Hilang') {
      fine = book.price; 
      status = 'Rosak/Hilang'; 
      stockChange = 0;
      resStatus = 'Tertunggak';
    }

    updateBookStock(bookId, stockChange, targetUser, targetType, action, status, noPerolehan, fine, resStatus);
  };

  const updateBookStock = (bookId: string, change: number, actor: string, actorType: UserType, action: ActionType, status: TransactionStatus = 'Berjaya', noPerolehan?: string, fineAmount?: number, resolutionStatus?: ResolutionStatus) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    if (change !== 0) setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: Math.max(0, b.stock + change) } : b));
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      bookId, bookTitle: book.title, userName: actor, userType: actorType, quantity: Math.abs(change) || 1,
      timestamp: new Date().toLocaleString('ms-MY'), createdAt: Date.now(), action, status, noPerolehan, fineAmount,
      resolutionStatus
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleResolveDamage = (transactionId: string, method: ResolutionMethod) => {
    const trans = transactions.find(t => t.id === transactionId);
    if (!trans) return;

    if (method === 'Buku') {
      setBooks(prev => prev.map(b => b.id === trans.bookId ? { ...b, stock: b.stock + 1 } : b));
    }

    setTransactions(prev => prev.map(t => 
      t.id === transactionId 
      ? { ...t, resolutionStatus: 'Selesai', resolutionMethod: method } 
      : t
    ));

    alert(`Buku "${trans.bookTitle}" telah diganti melalui kaedah ${method === 'Buku' ? 'Ganti Buku' : 'Ganti Nilai (Tunai)'}.`);
  };

  const handleRemoveBook = (id: string) => {
    if(confirm("Padam buku ini daripada inventori secara kekal?")) {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setIsMemberDetailOpen(false);
    setSelectedMemberDetail(null);
    setIsEditingMemberName(false);
  };

  const handleUpdateMemberName = () => {
    if (!selectedMemberDetail || !editedMemberName.trim()) return;
    const oldName = selectedMemberDetail.name;
    const newName = editedMemberName.trim().toUpperCase();

    setMembers(prev => prev.map(m => m.id === selectedMemberDetail.id ? { ...m, name: newName } : m));
    setTransactions(prev => prev.map(t => t.userName === oldName ? { ...t, userName: newName } : t));

    setSelectedMemberDetail({ ...selectedMemberDetail, name: newName });
    setIsEditingMemberName(false);
    alert("Nama ahli berjaya dikemaskini.");
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
    if (!newBook.title || !newBook.subject) return;
    const book: Book = {
      id: `${newBook.year}-${newBook.type === 'Buku Teks' ? 'bt' : 'ba'}-${newBook.subject.toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newBook.title.toUpperCase(),
      year: newBook.year || 1,
      type: (newBook.type as BookType) || 'Buku Teks',
      stock: Number(newBook.stock) || 0,
      subject: newBook.subject.toUpperCase(),
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
    setBookToEdit(null);
  };

  const executePromoteStudents = () => {
    setMembers(prev => {
      const nextGen = prev.map(m => {
        if (m.type === 'Murid' && m.year) {
          return { ...m, year: m.year + 1 };
        }
        return m;
      }).filter(m => !(m.type === 'Murid' && m.year && m.year > 6));
      return [...nextGen];
    });
    setConfirmAction(null);
    alert("Berjaya! Semua murid telah dinaikkan kelas. Murid Tahun 6 telah dikeluarkan dari sistem.");
  };

  const executeResetSession = () => {
    setTransactions([]);
    setConfirmAction(null);
    alert("Berjaya! Log rekod transaksi telah dikosongkan untuk sesi baru.");
  };

  const fetchAiInsight = async () => {
    setIsAiLoading(true);
    const insight = await getStockInsight(books, transactions);
    setAiInsight(insight || "Tiada data untuk dianalisa buat masa ini.");
    setIsAiLoading(false);
  };

  const getActiveLoans = (name: string) => {
    const userTrans = transactions.filter(t => t.userName === name);
    const active: Transaction[] = [];
    const sorted = [...userTrans].sort((a, b) => a.createdAt - b.createdAt);
    
    sorted.forEach(t => {
      if (t.action === 'Pinjaman') {
        active.push(t);
      } else if (t.action === 'Pemulangan' || t.action === 'Pulang Rosak/Hilang') {
        const idx = active.findIndex(a => a.bookId === t.bookId);
        if (idx > -1) active.splice(idx, 1);
      }
    });
    return active;
  };

  const getDamageTransactions = (year: number) => {
    return transactions.filter(t => {
      if (t.status !== 'Rosak/Hilang') return false;
      const member = members.find(m => m.name === t.userName);
      return member && member.type === 'Murid' && member.year === year;
    });
  };

  const getCashTransactions = (year: number) => {
    return transactions.filter(t => {
      if (t.resolutionMethod !== 'Tunai') return false;
      const member = members.find(m => m.name === t.userName);
      return member && member.type === 'Murid' && member.year === year;
    });
  };

  // --- Views ---

  if (authView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-['Plus_Jakarta_Sans']">
        <div className="max-w-4xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(79,70,229,0.4)]">
              <Library size={48} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic">E-SPBT PINTAR</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">Sistem Pengurusan Buku Teks Digital</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto w-full">
            <button 
              onClick={() => adminSettings.isRegistered ? setAuthView('admin_auth') : setAuthView('setup')} 
              className="group bg-white/5 border-2 border-white/10 p-10 rounded-[3.5rem] text-left hover:bg-white/10 hover:border-indigo-500 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 text-white/5 group-hover:text-indigo-500/10 transition-colors"><ShieldCheck size={200} /></div>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors"><Lock size={32} /></div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Pihak Admin</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">Kawalan stok, pendaftaran ahli, dan analisis AI sistem.</p>
              <div className="mt-8 flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">Portal Kawalan <ArrowRight size={16} /></div>
            </button>
            <button onClick={() => setAuthView('guru_auth')} className="group bg-white/5 border-2 border-white/10 p-10 rounded-[3.5rem] text-left hover:bg-white/10 hover:border-indigo-500 transition-all duration-300 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 text-white/5 group-hover:text-indigo-500/10 transition-colors"><UserCircle size={200} /></div>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors"><UserCircle size={32} /></div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Pihak Guru</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">Pinjaman dan pemulangan buku teks secara layan diri yang pantas.</p>
              <div className="mt-8 flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">Bilik Buku <ArrowRight size={16} /></div>
            </button>
          </div>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest italic">{adminSettings.schoolName || 'Selamat Datang'}</p>
        </div>
      </div>
    );
  }

  if (authView === 'setup') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden p-12 animate-in zoom-in duration-500">
           <div className="text-center mb-10">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6 shadow-inner"><School size={40} /></div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Daftar Pentadbir</h2>
              <p className="text-slate-400 text-xs font-black uppercase">Konfigurasi Akses Pertama Kali</p>
           </div>
           <form onSubmit={handleRegisterAdmin} className="space-y-6">
              <input type="text" required className="w-full px-6 py-5 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} placeholder="NAMA SEKOLAH" />
              <input type="text" required className="w-full px-6 py-5 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminName} onChange={(e) => setAdminSettings({...adminSettings, adminName: e.target.value.toUpperCase()})} placeholder="NAMA PENYELARAS" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required className="w-full px-6 py-5 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} placeholder="ID ADMIN" />
                <input type="password" required className="w-full px-6 py-5 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} placeholder="KATA LALUAN" />
              </div>
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 transition active:scale-95 uppercase tracking-widest text-sm">Lancarkan Portal</button>
              <button type="button" onClick={() => setAuthView('landing')} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest mt-2">Batal</button>
           </form>
        </div>
      </div>
    );
  }

  if (authView === 'admin_auth') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="bg-white p-12 md:p-16 rounded-[4rem] border-2 border-slate-100 shadow-2xl w-full max-w-md text-center animate-in zoom-in">
          <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-10 shadow-inner"><Lock size={40} /></div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Akses Pentadbir</h3>
          <form onSubmit={handleAdminLogin} className="space-y-6 text-left mt-10">
            <input type="text" className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-900 focus:border-indigo-600 transition" value={adminIdInput} onChange={(e) => setAdminIdInput(e.target.value)} placeholder="ID PENGGUNA" />
            <input type="password" className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-900 focus:border-indigo-600 transition" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="KATA LALUAN" />
            <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-black transition shadow-2xl uppercase tracking-widest text-xs">Masuk Portal Admin</button>
            <button type="button" onClick={() => setAuthView('landing')} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest text-center mt-4">Kembali</button>
          </form>
        </div>
      </div>
    );
  }

  if (authView === 'guru_auth') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="bg-white rounded-[4rem] p-12 md:p-16 border-2 border-slate-100 shadow-2xl max-w-xl w-full animate-in zoom-in text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-inner"><UserCircle size={48} /></div>
          <h3 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter">Sahkan Nama Guru</h3>
          <input type="text" placeholder="NAMA PENUH ANDA..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 text-slate-900 font-black focus:outline-none focus:border-indigo-600 transition uppercase mb-8" value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSetUser()} />
          <button onClick={handleSetUser} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-indigo-700 transition active:scale-95 uppercase tracking-widest">Buka Dashboard</button>
          <button onClick={() => setAuthView('landing')} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] mt-4">Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans'] overflow-hidden">
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 shadow-xl z-20 overflow-hidden">
        <div className="p-8 border-b border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Library size={24} /></div>
          <div className="overflow-hidden">
            <h1 className="font-black text-sm tracking-tighter leading-tight uppercase">E-SPBT PINTAR</h1>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest truncate">{adminSettings.schoolName}</p>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-2 mt-4">
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
            <BookOpen size={20} /> <span className="text-sm">Bilik Buku</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
            <History size={20} /> <span className="text-sm">Log Transaksi</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
            <UserCircle size={20} /> <span className="text-sm">Profil Saya</span>
          </button>
          {isAdminAuthenticated && (
            <>
              <div className="pt-8 pb-4 px-5 uppercase text-[10px] tracking-[0.2em] text-indigo-500 font-black border-t border-white/5 mt-6">Pentadbiran</div>
              <button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
                <LayoutDashboard size={20} /> <span className="text-sm">Panel Admin</span>
              </button>
            </>
          )}
        </div>
        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-lg">{(userName || 'A').charAt(0)}</div>
            <div className="overflow-hidden"><p className="text-xs font-black truncate uppercase">{userName || 'ADMIN'}</p></div>
          </div>
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black hover:bg-rose-500/20 transition uppercase tracking-widest border border-rose-500/20">Log Keluar</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
            {activeTab === 'inventory' ? 'Pinjaman Bilik Buku' : 
             activeTab === 'history' ? 'Rekod Log Transaksi' : 
             activeTab === 'profile' ? 'Profil Saya' : 'Panel Pentadbiran'}
          </h2>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-black border border-indigo-100 uppercase tracking-widest">{adminSettings.schoolName}</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 md:pb-10">
          
          {activeTab === 'inventory' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm flex gap-2 w-fit">
                <button onClick={() => setInventoryView('Guru')} className={`px-10 py-3 rounded-xl font-black text-[11px] transition-all uppercase tracking-widest ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Kegunaan Guru</button>
                <button onClick={() => setInventoryView('Murid')} className={`px-10 py-3 rounded-xl font-black text-[11px] transition-all uppercase tracking-widest ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Kegunaan Murid</button>
              </div>

              {inventoryView === 'Guru' ? (
                <div className="space-y-8">
                  <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`shrink-0 px-8 py-4 rounded-2xl font-black text-sm transition-all border-2 ${selectedYear === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-600'}`}>Tahun {y}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.filter(b => b.year === selectedYear).map(book => {
                      const activeLoans = getActiveLoans(userName);
                      const hasBorrowed = activeLoans.some(l => l.bookId === book.id);
                      return (
                        <div key={book.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group">
                           <h4 className="font-black text-slate-800 text-sm mb-2 uppercase h-10 overflow-hidden">{book.title}</h4>
                           <p className="text-[10px] text-slate-400 font-black uppercase mb-6 italic">Stok: <span className={book.stock < 20 ? 'text-rose-600' : 'text-slate-800'}>{book.stock}</span></p>
                           <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform"><ArrowUpFromLine size={14}/> Pinjam</button>
                             <button 
                                disabled={!hasBorrowed}
                                onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} 
                                className={`py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${hasBorrowed ? 'bg-emerald-600 text-white shadow-lg hover:scale-105' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'}`}
                             >
                                <ArrowDownToLine size={14}/> Pulang
                             </button>
                           </div>
                           {hasBorrowed && <p className="text-[8px] font-black text-indigo-500 uppercase mt-4 text-center">Pinjaman Aktif Ditemui</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col gap-4">
                    <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                      {YEARS.map(y => (
                        <button key={y} onClick={() => setSelectedYear(y)} className={`shrink-0 px-10 py-5 rounded-[2rem] font-black text-sm transition-all border-2 ${selectedYear === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600'}`}>Tahun {y}</button>
                      ))}
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-fit">
                       <button onClick={() => setStudentModality('Buku Teks')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studentModality === 'Buku Teks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Buku Teks</button>
                       <button onClick={() => setStudentModality('Buku Aktiviti')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studentModality === 'Buku Aktiviti' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Buku Aktiviti</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {members.filter(m => m.type === 'Murid' && m.year === selectedYear).map(student => {
                      const isExpanded = expandedStudents.has(student.id);
                      const activeLoans = getActiveLoans(student.name);
                      return (
                        <div key={student.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden transition-all">
                          <button onClick={() => { const newExp = new Set(expandedStudents); isExpanded ? newExp.delete(student.id) : newExp.add(student.id); setExpandedStudents(newExp); }} className={`w-full px-8 py-6 flex justify-between items-center ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                             <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">{student.name.charAt(0)}</div>
                                <div><h4 className="font-black text-slate-900 uppercase text-xs">{student.name}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeLoans.length} Pinjaman Aktif</p></div>
                             </div>
                             {isExpanded ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-slate-300" />}
                          </button>
                          {isExpanded && (
                            <div className="p-8 space-y-4 bg-white border-t-2 border-slate-50">
                               <button onClick={() => { setBorrowingStudent(student); setIsBorrowModalOpen(true); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 mb-4"><Plus size={16}/> Pinjam Buku {studentModality}</button>
                               {activeLoans.map(loan => (
                                 <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                                    <p className="font-black text-slate-800 text-[11px] uppercase truncate pr-4">{loan.bookTitle}</p>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleAction(loan.bookId, 'Pemulangan', student.name, 'Murid')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition"><CheckCircle size={16}/></button>
                                      <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', student.name, 'Murid')} className="p-2.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition"><AlertTriangle size={16}/></button>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-3xl space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-10 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5"><User size={200} /></div>
                <div className="flex items-center gap-8 mb-10 pb-8 border-b-2 border-slate-50">
                  <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-xl">{(userName || 'G').charAt(0)}</div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{userName}</h3>
                    <div className="flex gap-4">
                       <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest">{isAdminAuthenticated ? 'Admin' : 'Guru'}</span>
                       <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 uppercase tracking-widest">{getActiveLoans(userName).length} Pinjaman Aktif</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                   <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Buku Pegangan Anda</h4>
                   {getActiveLoans(userName).map(loan => (
                     <div key={loan.id} className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div className="flex-1 mr-4">
                           <p className="font-black text-slate-800 text-sm uppercase mb-1">{loan.bookTitle}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">Dipinjam: {loan.timestamp}</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Qty</p>
                              <p className="font-black text-indigo-600">x{loan.quantity}</p>
                           </div>
                           <button onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')} className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition shadow-lg"><ArrowDownToLine size={24}/></button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-2.5 rounded-[2rem] border-2 shadow-sm border-slate-100">
                  <button onClick={() => setAdminSubTab('overview')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Rumusan</button>
                  <button onClick={() => setAdminSubTab('manage')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'manage' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Inventori</button>
                  <button onClick={() => setAdminSubTab('members')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'members' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Ahli & Peminjam</button>
                  <button onClick={() => setAdminSubTab('damages')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'damages' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Kerosakan</button>
                  <button onClick={() => setAdminSubTab('cash_flow')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'cash_flow' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Transaksi Nilai</button>
                  <button onClick={() => setAdminSubTab('session')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'session' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Urus Sesi</button>
                  <button onClick={() => setAdminSubTab('system')} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${adminSubTab === 'system' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Profil Sistem</button>
              </div>

              {adminSubTab === 'session' && (
                <div className="max-w-2xl animate-in slide-in-from-bottom-6">
                  <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-10 shadow-sm">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-50">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner"><CalendarDays size={32} /></div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Pengurusan Sesi Sekolah</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Urus pertukaran tahun dan log sesi baru.</p>
                      </div>
                    </div>
                    <div className="space-y-8">
                       <div className="p-6 bg-indigo-50/50 rounded-3xl border-2 border-indigo-100">
                          <h4 className="font-black text-indigo-900 text-sm uppercase mb-2 flex items-center gap-2"><TrendingUp size={18}/> Naik Kelas (Sesi Baru)</h4>
                          <p className="text-[10px] text-indigo-700 font-medium leading-relaxed mb-6">Fungsi ini akan menaikkan semua murid ke tahun seterusnya secara automatik. Murid Tahun 6 akan dikeluarkan daripada sistem. Data stok buku tidak akan dipadam.</p>
                          <button onClick={() => setConfirmAction('promote')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition active:scale-95">Lancarkan Naik Kelas</button>
                       </div>
                       <div className="p-6 bg-emerald-50/50 rounded-3xl border-2 border-emerald-100">
                          <h4 className="font-black text-emerald-900 text-sm uppercase mb-2 flex items-center gap-2"><RotateCcw size={18}/> Mulakan Sesi Baru</h4>
                          <p className="text-[10px] text-emerald-700 font-medium leading-relaxed mb-6">Padam semua rekod log transaksi pinjaman dan kerosakan sedia ada untuk rekod sesi persekolahan yang bersih. Senarai ahli dan stok dikekalkan.</p>
                          <button onClick={() => setConfirmAction('reset')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-700 transition active:scale-95">Mula Sesi Baru (Padam Log)</button>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {adminSubTab === 'members' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                     <div className="bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm flex gap-2">
                        <button onClick={() => setAdminMemberView('Guru')} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adminMemberView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Pihak Guru</button>
                        <button onClick={() => setAdminMemberView('Murid')} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adminMemberView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Pihak Murid</button>
                     </div>
                     <button onClick={() => { setNewMember({...newMember, type: adminMemberView}); setIsAddingMember(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition"><UserPlus size={18} /> Tambah Ahli Baru</button>
                  </div>
                  {adminMemberView === 'Murid' && (
                    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                      {YEARS.map(y => (
                        <button key={y} onClick={() => setAdminMemberYearFilter(y)} className={`shrink-0 px-6 py-3 rounded-xl font-black text-[10px] transition-all border-2 uppercase tracking-widest ${adminMemberYearFilter === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>Tahun {y}</button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members
                      .filter(m => m.type === adminMemberView && (adminMemberView === 'Guru' ? true : m.year === adminMemberYearFilter))
                      .map(member => (
                        <div key={member.id} onClick={() => { setSelectedMemberDetail(member); setEditedMemberName(member.name); setIsEditingMemberName(false); setIsMemberDetailOpen(true); }} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group cursor-pointer">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors">{member.name.charAt(0)}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-black text-xs uppercase text-slate-800 truncate">{member.name}</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getActiveLoans(member.name).length} Pinjaman Aktif</p>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                           </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {adminSubTab === 'damages' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => setDamageYearFilter(y)} className={`shrink-0 px-8 py-4 rounded-2xl font-black text-sm transition-all border-2 ${damageYearFilter === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600'}`}>Tahun {y}</button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const damageTrans = getDamageTransactions(damageYearFilter);
                      const groupedByStudent: Record<string, Transaction[]> = {};
                      damageTrans.forEach(t => {
                        if (!groupedByStudent[t.userName]) groupedByStudent[t.userName] = [];
                        groupedByStudent[t.userName].push(t);
                      });

                      return Object.entries(groupedByStudent).map(([studentName, transList]) => {
                        const hasActiveDamages = transList.some(t => t.resolutionStatus === 'Tertunggak');
                        return (
                          <div key={studentName} className={`bg-white rounded-[2.5rem] border-2 shadow-sm overflow-hidden transition-all ${hasActiveDamages ? 'border-rose-100' : 'border-emerald-100'}`}>
                            <div className={`p-6 flex items-center gap-4 ${hasActiveDamages ? 'bg-rose-50/50' : 'bg-emerald-50/50'}`}>
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${hasActiveDamages ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{studentName.charAt(0)}</div>
                              <div className="flex-1">
                                <h4 className="font-black text-xs uppercase text-slate-800">{studentName}</h4>
                                <p className="text-[10px] font-black uppercase text-slate-400">{transList.length} Rekod Kerosakan</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${hasActiveDamages ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {hasActiveDamages ? 'Tertunggak' : 'Selesai'}
                              </span>
                            </div>
                            <div className="p-6 space-y-4">
                              {transList.map(t => (
                                <div key={t.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                      <p className="font-black text-[11px] uppercase text-slate-800">{t.bookTitle}</p>
                                      <p className="text-[8px] font-bold text-slate-400">DENDA: RM {t.fineAmount?.toFixed(2)}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.resolutionStatus === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                      {t.resolutionStatus || 'Tertunggak'}
                                    </span>
                                  </div>
                                  {t.resolutionStatus === 'Tertunggak' && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 shadow-md hover:bg-indigo-700 transition"><RotateCcw size={12}/> Ganti Buku</button>
                                      <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 shadow-md hover:bg-emerald-700 transition"><DollarSign size={12}/> Ganti Nilai</button>
                                    </div>
                                  )}
                                  {t.resolutionStatus === 'Selesai' && (
                                    <p className="text-[9px] font-black text-emerald-600 uppercase text-center mt-2 flex items-center justify-center gap-1"><CheckCircle size={12}/> Selesai Ganti ({t.resolutionMethod === 'Buku' ? 'Stok' : 'Tunai'})</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {adminSubTab === 'cash_flow' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => setCashYearFilter(y)} className={`shrink-0 px-8 py-4 rounded-2xl font-black text-sm transition-all border-2 ${cashYearFilter === y ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600'}`}>Tahun {y}</button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {(() => {
                      const studentList = members.filter(m => m.type === 'Murid' && m.year === cashYearFilter);
                      if (studentList.length === 0) return <div className="text-center py-20 text-[10px] font-black text-slate-300 uppercase tracking-widest">Tiada rekod murid untuk tahun ini.</div>;
                      
                      return studentList.map(student => {
                        const cashTransactions = transactions.filter(t => t.userName === student.name && t.resolutionMethod === 'Tunai');
                        const isResolved = cashTransactions.length > 0;
                        return (
                          <div key={student.id} className={`bg-white rounded-[2.5rem] border-2 shadow-sm overflow-hidden flex items-center justify-between p-8 ${isResolved ? 'border-emerald-100' : 'border-rose-100 opacity-60'}`}>
                             <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${isResolved ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{student.name.charAt(0)}</div>
                                <div>
                                   <h4 className="font-black text-sm uppercase text-slate-800">{student.name}</h4>
                                   <p className="text-[10px] font-black uppercase text-slate-400">{cashTransactions.length} Transaksi Nilai Dikutip</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                {cashTransactions.map(t => (
                                  <div key={t.id} className="bg-slate-50 border-2 border-slate-100 p-3 rounded-xl flex flex-col items-center">
                                     <span className="text-[8px] font-black text-slate-400 uppercase">{t.bookTitle.slice(0, 10)}...</span>
                                     <span className="text-[10px] font-black text-emerald-600">RM {t.fineAmount?.toFixed(2)}</span>
                                  </div>
                                ))}
                                <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-lg ${isResolved ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}>
                                  {isResolved ? 'Selesai' : 'Belum Ganti'}
                                </span>
                             </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {adminSubTab === 'manage' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Inventori Bilik Buku</h3>
                    <div className="flex gap-4 w-full md:w-auto">
                       <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input type="text" placeholder="Cari tajuk buku..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-white font-black uppercase text-[10px] outline-none focus:border-indigo-600 transition" value={adminSearchQuery} onChange={(e) => setAdminSearchQuery(e.target.value)} />
                       </div>
                       <button onClick={() => setIsAddingBook(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition"><BookPlus size={18} /> Daftar Buku Baru</button>
                    </div>
                  </div>
                  {YEARS.map(y => {
                    const yearBooks = books.filter(b => b.year === y && b.title.toLowerCase().includes(adminSearchQuery.toLowerCase()));
                    if (yearBooks.length === 0) return null;
                    return (
                      <div key={y} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 bg-slate-50 border-b-2 border-slate-100 font-black uppercase text-xs tracking-widest text-slate-500">Tahun {y}</div>
                        <div className="divide-y divide-slate-50">
                          {yearBooks.map(book => (
                            <div key={book.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition group">
                               <div className="flex-1">
                                  <h4 className="font-black text-[11px] uppercase text-slate-800">{book.title}</h4>
                                  <div className="flex gap-2 mt-1">
                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black uppercase">{book.subject} • {book.type}</span>
                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1"><DollarSign size={8}/> RM {book.price.toFixed(2)}</span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-12">
                                  <div className="text-center w-20">
                                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Stok</p>
                                     <p className={`font-black ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-600'}`}>{book.stock}</p>
                                  </div>
                                  <div className="flex gap-2">
                                     <button onClick={() => { setBookToEdit({...book}); setIsEditingBook(true); }} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm"><Edit2 size={18}/></button>
                                     <button onClick={() => handleRemoveBook(book.id)} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition shadow-sm"><Trash2 size={18}/></button>
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {adminSubTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Stok</p>
                      <p className="text-4xl font-black text-indigo-600">{books.reduce((acc, b) => acc + Number(b.stock), 0)}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pinjaman Aktif</p>
                      <p className="text-4xl font-black text-emerald-600">{transactions.filter(t => t.action === 'Pinjaman').length}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kerosakan Aktif</p>
                      <p className="text-4xl font-black text-rose-600">{transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length}</p>
                    </div>
                    <button onClick={fetchAiInsight} className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl hover:bg-indigo-700 transition group relative overflow-hidden">
                       <div className="absolute top-4 right-4 animate-bounce"><Sparkles size={20} className="text-indigo-300" /></div>
                       <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-indigo-200">AI Analisa</p>
                       <p className="text-2xl font-black uppercase tracking-tighter">Gemini Insight</p>
                    </button>
                  </div>
                  {isAiLoading && <div className="p-10 text-center animate-pulse font-black text-indigo-600 uppercase tracking-widest">Menganalisa Sistem...</div>}
                  {aiInsight && !isAiLoading && (
                    <div className="bg-indigo-50 border-2 border-indigo-100 p-10 rounded-[3rem] animate-in slide-in-from-top-4">
                      <div className="flex items-center gap-3 mb-4 text-indigo-600 font-black uppercase text-xs tracking-widest"><Sparkles size={16} /> Analisa Pintar</div>
                      <div className="prose prose-sm max-w-none text-indigo-900 font-medium whitespace-pre-wrap leading-relaxed">{aiInsight}</div>
                    </div>
                  )}
                </div>
              )}
              
              {adminSubTab === 'system' && (
                <div className="max-w-2xl animate-in slide-in-from-bottom-6">
                  <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-10 shadow-sm">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-50">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner"><KeyRound size={32} /></div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Profil Pentadbir</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maklumat pendaftaran sekolah & admin.</p>
                      </div>
                    </div>
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Profil admin berjaya dikemaskini."); }}>
                       <div className="relative">
                          <label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Sekolah</label>
                          <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 uppercase outline-none focus:border-indigo-600 transition" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value.toUpperCase()})} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="relative">
                             <label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">ID Pentadbir</label>
                             <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} />
                          </div>
                          <div className="relative">
                             <label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kata Laluan</label>
                             <input type="password" placeholder="••••••••" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} />
                          </div>
                       </div>
                       <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition active:scale-95"><Save size={18}/> Simpan Perubahan</button>
                    </form>
                    <div className="mt-12 pt-10 border-t-2 border-slate-50">
                       <button onClick={() => { if(confirm("PERINGATAN: Semua data (ahli, buku, log) akan dipadam kekal. Teruskan?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 text-rose-500 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 border-2 border-rose-50 rounded-2xl hover:bg-rose-50 transition active:scale-95"><RotateCcw size={16} /> Padam & Reset Sistem</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
               <div className="p-10 border-b bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Log Aktiviti Semasa</h3>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border-2 border-slate-100">{transactions.length} Rekod</div>
               </div>
               <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b-2 border-slate-100 tracking-widest">
                   <tr><th className="px-10 py-6">Masa & Tarikh</th><th className="px-10 py-6">Peminjam</th><th className="px-10 py-6">Tindakan</th><th className="px-10 py-6">Judul Buku</th><th className="px-10 py-6">Status</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {transactions.map(t => (
                     <tr key={t.id} className="text-sm hover:bg-indigo-50/30 transition duration-300">
                       <td className="px-10 py-6 font-bold text-slate-500 text-xs">{t.timestamp}</td>
                       <td className="px-10 py-6 font-black text-slate-800 uppercase text-xs">{t.userName}</td>
                       <td className="px-10 py-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span></td>
                       <td className="px-10 py-6 font-bold text-slate-700 text-xs uppercase truncate max-w-[200px]">{t.bookTitle}</td>
                       <td className="px-10 py-6"><span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${t.status === 'Rosak/Hilang' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>{t.status}</span></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {confirmAction && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><AlertTriangle size={40} /></div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Sahkan Tindakan?</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed mb-10">
                {confirmAction === 'promote' 
                  ? "Tindakan ini akan menaikkan tahun murid dan MEMADAM murid Tahun 6 secara kekal. Adakah anda pasti?" 
                  : "Tindakan ini akan MEMADAM SEMUA rekod log transaksi pinjaman secara kekal. Adakah anda pasti?"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setConfirmAction(null)} className="py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition">Batal</button>
                <button onClick={confirmAction === 'promote' ? executePromoteStudents : executeResetSession} className="py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-rose-700 transition">Sahkan Tindakan</button>
              </div>
            </div>
          </div>
        )}

        {isBorrowModalOpen && borrowingStudent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in">
                <div className="p-10 border-b-2 border-slate-50 bg-slate-50 flex justify-between items-center">
                   <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">Pinjaman Bilik Buku</h3><span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase">{borrowingStudent.name}</span></div>
                   <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm"><X size={24}/></button>
                </div>
                <div className="p-10 overflow-y-auto no-scrollbar flex-1">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {books.filter(b => borrowingStudent.type === 'Murid' ? (b.year === borrowingStudent.year && b.type === studentModality) : true).map(book => {
                        const isSelected = selectedBooksToBorrow.has(book.id);
                        return (
                          <div key={book.id} onClick={() => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-white hover:border-indigo-100'}`}>
                             <div><h4 className="font-black text-[11px] uppercase truncate">{book.title}</h4><p className="text-[8px] opacity-70 uppercase">Stok Tersedia: {book.stock}</p></div>
                             {isSelected && <CheckCircle size={18} />}
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="p-8 bg-slate-50 border-t-2 border-slate-100"><button onClick={() => { Array.from(selectedBooksToBorrow).forEach(id => handleAction(id, 'Pinjaman', borrowingStudent.name, borrowingStudent.type, 1, true)); setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); }} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest disabled:opacity-50" disabled={selectedBooksToBorrow.size === 0}>Sahkan Pinjaman ({selectedBooksToBorrow.size})</button></div>
             </div>
          </div>
        )}

        {isAddingBook && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in">
                <div className="flex justify-between items-center mb-10"><h3 className="text-3xl font-black uppercase tracking-tighter">Daftar Buku Baru</h3><button onClick={() => setIsAddingBook(false)} className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition"><X size={24}/></button></div>
                <div className="space-y-6">
                   <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Judul Buku</label><input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value.toUpperCase()})} placeholder="MASUKKAN TAJUK BUKU" /></div>
                   <div className="grid grid-cols-2 gap-4"><div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kod Subjek</label><input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={newBook.subject} onChange={(e) => setNewBook({...newBook, subject: e.target.value.toUpperCase()})} placeholder="KOD" /></div><div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tahun</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none appearance-none focus:border-indigo-600 transition" value={newBook.year} onChange={(e) => setNewBook({...newBook, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>Tahun {y}</option>)}</select></div></div>
                   <div className="grid grid-cols-2 gap-4"><div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Jenis Buku</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none appearance-none focus:border-indigo-600 transition" value={newBook.type} onChange={(e) => setNewBook({...newBook, type: e.target.value as BookType})}><option value="Buku Teks">Buku Teks</option><option value="Buku Aktiviti">Buku Aktiviti</option><option value="Buku Latihan">Buku Latihan</option><option value="Rujukan">Rujukan</option><option value="Lain-lain">Lain-lain</option></select></div><div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Harga Per Unit (RM)</label><input type="number" step="0.01" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={newBook.price} onChange={(e) => setNewBook({...newBook, price: Number(e.target.value)})} /></div></div>
                   <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Stok Permulaan</label><input type="number" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={newBook.stock} onChange={(e) => setNewBook({...newBook, stock: Number(e.target.value)})} /></div>
                   <button onClick={handleAddNewBook} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition active:scale-95">Sahkan Pendaftaran</button>
                </div>
             </div>
          </div>
        )}

        {isEditingBook && bookToEdit && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in">
                <div className="flex justify-between items-center mb-10"><h3 className="text-3xl font-black uppercase tracking-tighter">Edit Perincian Buku</h3><button onClick={() => setIsEditingBook(false)} className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm"><X size={24}/></button></div>
                <div className="space-y-6">
                   <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tajuk Buku</label><input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={bookToEdit.title} onChange={(e) => setBookToEdit({...bookToEdit, title: e.target.value.toUpperCase()})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tahun</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none appearance-none focus:border-indigo-600 transition" value={bookToEdit.year} onChange={(e) => setBookToEdit({...bookToEdit, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>Tahun {y}</option>)}</select></div>
                      <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kod Subjek</label><input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={bookToEdit.subject} onChange={(e) => setBookToEdit({...bookToEdit, subject: e.target.value.toUpperCase()})} /></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Jenis Buku</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none appearance-none focus:border-indigo-600 transition" value={bookToEdit.type} onChange={(e) => setBookToEdit({...bookToEdit, type: e.target.value as BookType})}><option value="Buku Teks">Buku Teks</option><option value="Buku Aktiviti">Buku Aktiviti</option><option value="Buku Latihan">Buku Latihan</option><option value="Rujukan">Rujukan</option><option value="Lain-lain">Lain-lain</option></select></div>
                      <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Harga (RM)</label><input type="number" step="0.01" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={bookToEdit.price} onChange={(e) => setBookToEdit({...bookToEdit, price: Number(e.target.value)})} /></div>
                   </div>
                   <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Jumlah Stok Semasa</label><input type="number" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={bookToEdit.stock} onChange={(e) => setBookToEdit({...bookToEdit, stock: Number(e.target.value)})} /></div>
                   <button onClick={handleUpdateBook} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition active:scale-95">Simpan Perubahan</button>
                </div>
             </div>
          </div>
        )}

        {isAddingMember && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Daftar {newMember.type}</h3>
                   <button onClick={() => setIsAddingMember(false)} className="text-slate-400 hover:text-rose-500 transition"><X size={24}/></button>
                </div>
                <div className="space-y-6">
                   <div className="relative"><label className="text-[9px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Penuh</label><input type="text" placeholder="ALI BIN ABU" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase outline-none focus:border-indigo-600 transition" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value.toUpperCase()})} /></div>
                   {newMember.type === 'Murid' && (<div className="grid grid-cols-3 gap-2">{YEARS.map(y => (<button key={y} onClick={() => setNewMember({...newMember, year: y})} className={`py-4 rounded-xl font-black text-[10px] uppercase transition-all ${newMember.year === y ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-2 border-slate-100 text-slate-400'}`}>Tahun {y}</button>))}</div>)}
                   <button onClick={handleAddMember} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition active:scale-95">Sahkan Pendaftaran</button>
                </div>
             </div>
          </div>
        )}

        {isMemberDetailOpen && selectedMemberDetail && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in">
                <div className="p-10 border-b-2 border-slate-50 bg-slate-50 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">{selectedMemberDetail.name.charAt(0)}</div>
                      <div className="flex-1">
                        {!isEditingMemberName ? (
                          <div className="flex items-center gap-2">
                             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedMemberDetail.name}</h3>
                             <button onClick={() => { setEditedMemberName(selectedMemberDetail.name); setIsEditingMemberName(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition hover:bg-white rounded-lg shadow-sm"><Edit2 size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                             <input type="text" className="bg-white border-2 border-indigo-200 px-4 py-2 rounded-xl text-lg font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition w-full" value={editedMemberName} onChange={(e) => setEditedMemberName(e.target.value.toUpperCase())} />
                             <button onClick={handleUpdateMemberName} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md"><Save size={18}/></button>
                             <button onClick={() => setIsEditingMemberName(false)} className="p-2.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition shadow-sm"><X size={18}/></button>
                          </div>
                        )}
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedMemberDetail.type} {selectedMemberDetail.year ? `• Tahun ${selectedMemberDetail.year}` : ''}</p>
                      </div>
                   </div>
                   <button onClick={() => setIsMemberDetailOpen(false)} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm"><X size={24}/></button>
                </div>
                <div className="p-10 overflow-y-auto no-scrollbar flex-1 space-y-8">
                   <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2"><BookOpen size={14}/> Rekod Pinjaman Aktif</h4>
                      <button onClick={() => { setBorrowingStudent(selectedMemberDetail); setIsBorrowModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] flex items-center gap-2 shadow-md hover:scale-105 transition-transform"><Plus size={14}/> Pinjaman Baru</button>
                   </div>
                   <div className="space-y-3">
                      {getActiveLoans(selectedMemberDetail.name).length > 0 ? getActiveLoans(selectedMemberDetail.name).map(loan => (
                        <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                           <p className="font-black text-slate-800 text-[11px] uppercase truncate flex-1 pr-4">{loan.bookTitle}</p>
                           <div className="flex gap-2">
                              <button onClick={() => { handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase transition shadow-sm hover:bg-emerald-700">Pulangkan</button>
                              <button onClick={() => { handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type); }} className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition"><AlertTriangle size={16}/></button>
                           </div>
                        </div>
                      )) : <div className="text-center py-6 text-[10px] font-black text-slate-300 uppercase italic">Tiada pinjaman aktif ditemui.</div>}
                   </div>
                </div>
                <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex justify-end">
                   <button onClick={() => handleRemoveMember(selectedMemberDetail.id)} className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-rose-600 hover:text-white transition shadow-sm"><Trash2 size={16}/> Padam Ahli</button>
                </div>
             </div>
          </div>
        )}

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 px-8 py-5 flex justify-between z-30 shadow-lg">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 ${activeTab === 'inventory' ? 'text-indigo-600' : 'text-slate-400'}`}><BookOpen size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Stok</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}><History size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Log</span></button>
           <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-400'}`}><UserCircle size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Profil</span></button>
           {isAdminAuthenticated && (<button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}><LayoutDashboard size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Admin</span></button>)}
        </div>
      </main>
    </div>
  );
};

export default App;