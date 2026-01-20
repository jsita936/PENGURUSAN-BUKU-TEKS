
import React, { useState, useEffect, useRef } from 'react';
import { Book, Transaction, Notification, UserType, TransactionStatus, ActionType, BookType, Member, AdminSettings } from './types';
import { INITIAL_BOOKS, YEARS, CATEGORIES } from './constants';
import { 
  Library, 
  History, 
  LayoutDashboard, 
  UserCircle, 
  Search, 
  AlertTriangle,
  BookOpen,
  Users,
  BrainCircuit,
  ChevronRight,
  ChevronDown,
  Trash2,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  Clock,
  Edit2,
  PlusCircle,
  X,
  Lock,
  Printer,
  DollarSign,
  UserPlus,
  Minus,
  Plus,
  Download,
  Settings2,
  CheckSquare,
  Square,
  School,
  Save,
  LogIn,
  FileX,
  RotateCcw,
  UserCheck,
  PackagePlus,
  BookPlus,
  GraduationCap,
  ShieldCheck,
  Key
} from 'lucide-react';
import { getStockInsight } from './services/geminiService';

const App: React.FC = () => {
  // State Utama
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'admin' | 'profile'>('inventory');
  const [inventoryView, setInventoryView] = useState<'Guru' | 'Murid'>('Guru');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'manage' | 'members' | 'lost' | 'system'>('overview');
  const [adminMemberView, setAdminMemberView] = useState<'Guru' | 'Murid'>('Guru');
  
  // Settings & Onboarding
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    schoolName: '',
    adminName: '',
    adminId: '',
    adminPass: '',
    isRegistered: false
  });

  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<BookType>('Buku Teks');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Auth States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Profil Edit State
  const [editAdminId, setEditAdminId] = useState('');
  const [editAdminPass, setEditAdminPass] = useState('');
  const [editAdminName, setEditAdminName] = useState('');

  // UI States
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [expandedMemberYears, setExpandedMemberYears] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowingStudent, setBorrowingStudent] = useState<Member | null>(null);
  const [selectedBooksToBorrow, setSelectedBooksToBorrow] = useState<Set<string>>(new Set());
  const [selectedStudentForAdmin, setSelectedStudentForAdmin] = useState<Member | null>(null);

  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 });
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1 });

  // Persistence
  useEffect(() => {
    const savedSettings = localStorage.getItem('spbt_admin_settings');
    const savedName = localStorage.getItem('spbt_user_name');
    const savedBooks = localStorage.getItem('spbt_books_data');
    const savedTrans = localStorage.getItem('spbt_trans_data');
    const savedMembers = localStorage.getItem('spbt_members_data');

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setAdminSettings(parsed);
      setEditAdminId(parsed.adminId);
      setEditAdminPass(parsed.adminPass);
      setEditAdminName(parsed.adminName);
    }
    if (savedName) {
        setUserName(savedName);
        setRememberMe(true);
    }
    if (savedBooks) setBooks(JSON.parse(savedBooks));
    if (savedTrans) setTransactions(JSON.parse(savedTrans));
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    else {
      setMembers([{ id: '1', name: 'PENYELARAS SPBT', type: 'Guru' }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('spbt_books_data', JSON.stringify(books));
    localStorage.setItem('spbt_trans_data', JSON.stringify(transactions));
    localStorage.setItem('spbt_members_data', JSON.stringify(members));
    localStorage.setItem('spbt_admin_settings', JSON.stringify(adminSettings));
  }, [books, transactions, members, adminSettings]);

  // Reset System
  const handleResetSystem = () => {
    if (confirm("Adakah anda pasti mahu RESET sistem? SEMUA DATA (Buku, Ahli, Log, Tetapan Admin) akan dipadamkan selama-lamanya.")) {
      localStorage.clear();
      setAdminSettings({ schoolName: '', adminName: '', adminId: '', adminPass: '', isRegistered: false });
      setBooks(INITIAL_BOOKS);
      setTransactions([]);
      setMembers([{ id: '1', name: 'PENYELARAS SPBT', type: 'Guru' }]);
      setUserName('');
      setIsAdminAuthenticated(false);
      alert("Sistem telah berjaya di-reset ke tetapan asal.");
      window.location.reload();
    }
  };

  // Admin Registration
  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSettings.schoolName || !adminSettings.adminId || !adminSettings.adminPass) {
      alert("Sila lengkapkan semua maklumat pendaftaran.");
      return;
    }
    if (!members.find(m => m.name.toUpperCase() === adminSettings.adminName.toUpperCase())) {
        const newAdminMember: Member = { id: 'admin-1', name: adminSettings.adminName.toUpperCase(), type: 'Guru' };
        setMembers(prev => [...prev, newAdminMember]);
    }
    setAdminSettings({ ...adminSettings, isRegistered: true });
    setEditAdminId(adminSettings.adminId);
    setEditAdminPass(adminSettings.adminPass);
    setEditAdminName(adminSettings.adminName);
    alert("Pendaftaran berjaya! Selamat Datang.");
  };

  // Auth Handlers
  const handleSetUser = () => {
    const nameToMatch = tempName.trim().toUpperCase();
    if (!nameToMatch) {
      alert("Sila masukkan nama guru.");
      return;
    }
    const memberMatch = members.find(m => m.name.toUpperCase() === nameToMatch && m.type === 'Guru');
    if (memberMatch) {
      setUserName(memberMatch.name);
      if (rememberMe) localStorage.setItem('spbt_user_name', memberMatch.name);
      else localStorage.removeItem('spbt_user_name');
    } else {
      alert(`Maaf, nama "${tempName}" tiada dalam senarai GURU. Sila minta Admin daftarkan nama anda terlebih dahulu.`);
    }
  };

  const handleLogout = () => {
    setUserName('');
    setTempName('');
    setActiveTab('inventory');
    localStorage.removeItem('spbt_user_name');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminIdInput === adminSettings.adminId && adminPasswordInput === adminSettings.adminPass) {
      setIsAdminAuthenticated(true);
      setAdminIdInput('');
      setAdminPasswordInput('');
    } else {
      alert("ID atau Kata Laluan Admin Salah!");
    }
  };

  const handleUpdateAdminProfile = () => {
    if (!editAdminId || !editAdminPass || !editAdminName) {
      alert("ID, Kata Laluan dan Nama tidak boleh kosong.");
      return;
    }
    const updated = {
      ...adminSettings,
      adminId: editAdminId,
      adminPass: editAdminPass,
      adminName: editAdminName
    };
    setAdminSettings(updated);
    setMembers(prev => prev.map(m => m.id === 'admin-1' ? { ...m, name: editAdminName.toUpperCase() } : m));
    alert("Profil Admin telah dikemas kini.");
  };

  // Action Logic
  const handleAction = (bookId: string, action: ActionType, targetUser: string, targetType: UserType, qty: number = 1, silent: boolean = false) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    if (action === 'Pinjaman' && book.stock < qty) {
      if (!silent) alert(`Maaf, stok "${book.title}" tidak mencukupi.`);
      return;
    }

    let noPerolehan = "";
    if (action === 'Pinjaman' && !silent) {
      const input = prompt(`Masukkan No. Perolehan Buku (Optional) untuk ${targetUser}:`);
      noPerolehan = input?.trim() || "";
    }

    let status: TransactionStatus = 'Berjaya';
    let fine = 0;
    let stockChange = (action === 'Pinjaman') ? -qty : qty;

    if (action === 'Pulang Rosak/Hilang') {
      fine = book.price;
      status = 'Rosak/Hilang';
      stockChange = 0; 
      if (!silent) alert(`Rekod Rosak/Hilang Berjaya. Murid ${targetUser} perlu membayar RM ${fine.toFixed(2)}.`);
    }

    updateBookStock(bookId, stockChange, targetUser, targetType, action, status, noPerolehan, fine);
  };

  const updateBookStock = (bookId: string, change: number, actor: string, actorType: UserType, action: ActionType, status: TransactionStatus = 'Berjaya', noPerolehan?: string, fineAmount?: number) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    if (change !== 0) {
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: Math.max(0, b.stock + change) } : b));
    }

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      bookId,
      bookTitle: book.title,
      userName: actor,
      userType: actorType,
      quantity: Math.abs(change) || 1,
      timestamp: new Date().toLocaleString('ms-MY'),
      createdAt: Date.now(),
      action,
      status,
      noPerolehan,
      fineAmount
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleAddNewBook = () => {
    if (!newBook.title || !newBook.subject) {
      alert("Sila lengkapkan Tajuk dan Subjek buku.");
      return;
    }
    const book: Book = {
      id: `${newBook.year}-${newBook.type === 'Buku Teks' ? 'bt' : 'ba'}-${newBook.subject.toLowerCase().replace(/\s+/g, '')}-${Math.random().toString(36).substr(2, 4)}`,
      title: newBook.title.toUpperCase(),
      year: newBook.year || 1,
      type: (newBook.type as BookType) || 'Buku Teks',
      stock: newBook.stock || 0,
      subject: newBook.subject.toUpperCase(),
      price: newBook.price || 0
    };
    setBooks(prev => [...prev, book]);
    setIsAddingBook(false);
    setNewBook({ title: '', year: 1, type: 'Buku Teks', stock: 0, subject: '', price: 0 });
    alert(`Buku "${book.title}" berjaya didaftarkan ke dalam inventori.`);
  };

  const handleUpdateBook = () => {
    if (!bookToEdit) return;
    if (!bookToEdit.title) {
      alert("Tajuk tidak boleh kosong.");
      return;
    }
    setBooks(prev => prev.map(b => b.id === bookToEdit.id ? bookToEdit : b));
    setIsEditingBook(false);
    setBookToEdit(null);
    alert("Maklumat buku telah dikemaskini.");
  };

  const handleRemoveBook = (id: string) => {
    if (confirm("Adakah anda pasti mahu memadam buku ini daripada pangkalan data inventori? Tindakan ini tidak boleh diundur.")) {
      setBooks(prev => prev.filter(b => b.id !== id));
      alert("Buku telah dikeluarkan daripada senarai inventori.");
    }
  };

  const toggleYearCollapse = (year: number) => {
    const newExp = new Set(expandedYears);
    if (newExp.has(year)) newExp.delete(year);
    else newExp.add(year);
    setExpandedYears(newExp);
  };

  const toggleMemberYearCollapse = (year: number) => {
    const newExp = new Set(expandedMemberYears);
    if (newExp.has(year)) newExp.delete(year);
    else newExp.add(year);
    setExpandedMemberYears(newExp);
  };

  const toggleBookSelection = (bookId: string) => {
    const newSelection = new Set(selectedBooksToBorrow);
    if (newSelection.has(bookId)) newSelection.delete(bookId);
    else newSelection.add(bookId);
    setSelectedBooksToBorrow(newSelection);
  };

  const handleBulkBorrow = () => {
    if (!borrowingStudent) return;
    const booksToProcess = Array.from(selectedBooksToBorrow);
    if (booksToProcess.length === 0) {
      alert("Sila pilih sekurang-kurangnya satu buku.");
      return;
    }
    const targetType = borrowingStudent.type;
    booksToProcess.forEach(bookId => handleAction(bookId, 'Pinjaman', borrowingStudent.name, targetType, 1, true));
    setIsBorrowModalOpen(false);
    setSelectedBooksToBorrow(new Set());
    setBorrowingStudent(null);
    alert("Pinjaman berjaya direkodkan secara automatik.");
  };

  const handleRemoveMember = (id: string) => {
    if (confirm("Padam ahli ini? Semua profil akan hilang tetapi rekod log dikekalkan.")) {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const getActiveLoans = (name: string) => {
    const userTrans = transactions.filter(t => t.userName === name);
    const active: Transaction[] = [];
    const sorted = [...userTrans].sort((a, b) => a.createdAt - b.createdAt);
    sorted.forEach(t => {
      if (t.action === 'Pinjaman') active.push(t);
      else if (t.action === 'Pemulangan' || t.action === 'Pulang Rosak/Hilang') {
        const index = active.findIndex(a => a.bookId === t.bookId);
        if (index > -1) active.splice(index, 1);
      }
    });
    return active;
  };

  const filteredBooks = books.filter(b => 
    b.year === selectedYear && 
    b.type === selectedCategory && 
    (b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lostTransactions = transactions.filter(t => t.status === 'Rosak/Hilang');

  // Skrin Pendaftaran Awal (Onboarding)
  if (!adminSettings.isRegistered) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden p-12 animate-in zoom-in duration-500">
           <div className="text-center mb-10">
              <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-6 shadow-inner">
                <School size={56} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Pasang Sistem</h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest italic">Persediaan Bilik Buku Sekolah Anda</p>
           </div>
           <form onSubmit={handleRegisterAdmin} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Sekolah</label>
                  <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition" value={adminSettings.schoolName} onChange={(e) => setAdminSettings({...adminSettings, schoolName: e.target.value})} placeholder="SK CONTOH" />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Penyelaras (Admin)</label>
                  <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition" value={adminSettings.adminName} onChange={(e) => setAdminSettings({...adminSettings, adminName: e.target.value})} placeholder="NAMA ANDA" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">ID Admin</label>
                    <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminId} onChange={(e) => setAdminSettings({...adminSettings, adminId: e.target.value})} placeholder="admin" />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kata Laluan</label>
                    <input type="password" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={adminSettings.adminPass} onChange={(e) => setAdminSettings({...adminSettings, adminPass: e.target.value})} placeholder="••••••••" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95 uppercase tracking-widest text-sm">Lancarkan SPBT Digital</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans']">
      
      {/* Sidebar - Desktop */}
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
            <BookOpen size={20} /> <span className="text-sm">Bilik Buku Teks</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
            <History size={20} /> <span className="text-sm">Log Transaksi</span>
          </button>
          {userName && (
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
              <UserCircle size={20} /> <span className="text-sm">Profil Saya</span>
            </button>
          )}
          <div className="pt-8 pb-4 px-5 uppercase text-[10px] tracking-[0.2em] text-indigo-500 font-black border-t border-white/5 mt-6">Pentadbiran</div>
          <button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-900 shadow-xl font-black' : 'text-slate-400 hover:bg-white/5 font-bold'}`}>
            <LayoutDashboard size={20} /> <span className="text-sm">Panel Admin</span>
          </button>
        </div>

        {userName && (
          <div className="p-6 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center font-black text-lg shadow-inner">{userName.charAt(0)}</div>
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate uppercase leading-none mb-1">{userName}</p>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                   <p className="text-[9px] text-indigo-300 uppercase font-black tracking-tighter">GURU AKTIF</p>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full mt-4 py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black hover:bg-rose-500/20 transition uppercase tracking-widest border border-rose-500/20">Log Keluar</button>
          </div>
        )}
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0 z-10">
          <div className="md:hidden">
             <h2 className="text-sm font-black text-slate-800 tracking-tighter uppercase">E-SPBT</h2>
          </div>
          <div className="hidden md:block">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              {activeTab === 'inventory' && (inventoryView === 'Guru' ? 'Pinjaman Layan Diri Guru' : 'Pinjaman Murid')}
              {activeTab === 'history' && 'Rekod Log Keseluruhan'}
              {activeTab === 'admin' && 'Pusat Kawalan Pentadbiran'}
              {activeTab === 'profile' && 'Profil Pinjaman Saya'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-black border border-indigo-100 uppercase tracking-widest shadow-sm">{adminSettings.schoolName}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 pb-24 md:pb-10">
          
          {/* LOGIN GURU */}
          {!userName && activeTab !== 'admin' && (
            <div className="bg-white rounded-[3rem] p-10 md:p-16 border-2 border-slate-100 shadow-2xl max-w-2xl mx-auto mt-10 animate-in fade-in zoom-in duration-500 text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-inner"><UserCircle size={56} /></div>
              <h3 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter">Sahkan Nama Guru</h3>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed">Sila masukkan nama anda untuk mula meminjam atau memulangkan buku teks secara layan diri.</p>
              <div className="space-y-6 text-left">
                <input type="text" placeholder="MASUKKAN NAMA ANDA..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-slate-900 font-black focus:outline-none focus:border-indigo-600 focus:bg-white transition text-lg uppercase" value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSetUser()} />
                
                <div className="flex items-center gap-3 px-2">
                  <button 
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200'}`}
                  >
                    {rememberMe && <CheckSquare size={16} />}
                  </button>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>Ingat Saya</span>
                </div>

                <button onClick={handleSetUser} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 uppercase tracking-widest">Akses Bilik Buku</button>
              </div>
            </div>
          )}

          {/* TAB: BILIK BUKU */}
          {activeTab === 'inventory' && userName && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="bg-white p-2.5 rounded-[2rem] border-2 border-slate-100 shadow-sm flex gap-2 w-fit">
                <button onClick={() => setInventoryView('Guru')} className={`px-10 py-3 rounded-2xl font-black text-[11px] transition-all uppercase tracking-widest ${inventoryView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Guru</button>
                <button onClick={() => setInventoryView('Murid')} className={`px-10 py-3 rounded-2xl font-black text-[11px] transition-all uppercase tracking-widest ${inventoryView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Murid</button>
              </div>

              {inventoryView === 'Guru' ? (
                <div className="space-y-8">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                      {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full lg:w-auto">
                      {YEARS.map(y => (
                        <button key={y} onClick={() => setSelectedYear(y)} className={`shrink-0 px-8 py-4 rounded-2xl font-black text-sm transition-all border-2 ${selectedYear === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>Tahun {y}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredBooks.map(book => (
                      <div key={book.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
                         <div className="flex justify-between items-start mb-6">
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-black uppercase tracking-[0.1em] border border-indigo-100">{book.subject}</span>
                            <span className="text-xs font-black text-slate-900">RM {book.price.toFixed(2)}</span>
                         </div>
                         <h4 className="font-black text-slate-800 text-sm mb-2 leading-snug uppercase flex-1">{book.title}</h4>
                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6 italic">Stok: <span className={book.stock < 20 ? 'text-rose-600' : 'text-slate-800'}>{book.stock}</span></p>
                         <div className="grid grid-cols-2 gap-3">
                           <button onClick={() => handleAction(book.id, 'Pinjaman', userName, 'Guru')} className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-700 transition active:scale-95 shadow-lg"><ArrowUpFromLine size={14}/> Pinjam</button>
                           <button onClick={() => handleAction(book.id, 'Pemulangan', userName, 'Guru')} className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-100 transition active:scale-95"><ArrowDownToLine size={14}/> Pulang</button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                   <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`shrink-0 px-10 py-5 rounded-[2rem] font-black text-sm transition-all border-2 ${selectedYear === y ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>Tahun {y}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {members.filter(m => m.type === 'Murid' && m.year === selectedYear).map(student => {
                      const isExpanded = expandedStudents.has(student.id);
                      const activeLoans = getActiveLoans(student.name);
                      return (
                        <div key={student.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                          <button onClick={() => {
                            const newExp = new Set(expandedStudents);
                            if (newExp.has(student.id)) newExp.delete(student.id); else newExp.add(student.id);
                            setExpandedStudents(newExp);
                          }} className={`w-full px-8 py-6 flex justify-between items-center transition ${isExpanded ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}`}>
                             <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">{student.name.charAt(0)}</div>
                                <div>
                                  <h4 className="font-black text-slate-900 uppercase text-xs">{student.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeLoans.length} Pinjaman</p>
                                </div>
                             </div>
                             {isExpanded ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-slate-300" />}
                          </button>
                          {isExpanded && (
                            <div className="p-8 space-y-4 bg-white border-t-2 border-slate-50">
                               <button onClick={() => { setBorrowingStudent(student); setIsBorrowModalOpen(true); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 mb-4"><Plus size={16}/> Pinjam Buku</button>
                               {activeLoans.map(loan => (
                                 <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                                    <div className="truncate pr-4"><p className="font-black text-slate-800 text-[11px] uppercase truncate">{loan.bookTitle}</p></div>
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

          {/* TAB: LOG */}
          {activeTab === 'history' && (
             <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
                <div className="p-10 border-b bg-slate-50 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Aktiviti Terkini</h3>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border-2 border-slate-200">{transactions.length} Rekod</div>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b-2 border-slate-100 tracking-[0.15em]">
                    <tr><th className="px-10 py-6">Masa</th><th className="px-10 py-6">Pengguna</th><th className="px-10 py-6">Tindakan</th><th className="px-10 py-6">Buku</th><th className="px-10 py-6">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(t => (
                      <tr key={t.id} className="text-sm hover:bg-indigo-50/30 transition duration-300">
                        <td className="px-10 py-6 font-bold text-slate-500 whitespace-nowrap text-xs">{t.timestamp}</td>
                        <td className="px-10 py-6 font-black text-slate-800 uppercase text-xs">{t.userName}</td>
                        <td className="px-10 py-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span></td>
                        <td className="px-10 py-6 font-bold text-slate-700 text-xs uppercase">{t.bookTitle}</td>
                        <td className="px-10 py-6"><span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 w-fit ${t.status === 'Rosak/Hilang' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             </div>
          )}

          {/* TAB: PROFIL SAYA (UNTUK GURU) */}
          {activeTab === 'profile' && userName && (
            <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
               <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 p-12 shadow-sm flex flex-col md:flex-row items-center gap-10">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 text-white flex items-center justify-center font-black text-5xl shadow-2xl">{userName.charAt(0)}</div>
                  <div className="text-center md:text-left">
                     <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">{userName}</h3>
                     <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">GURU AKTIF</span>
                        <span className="px-4 py-1.5 rounded-full bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">{getActiveLoans(userName).length} BUKU DIPINJAM</span>
                     </div>
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-10 border-b-2 border-slate-50 bg-slate-50/50 flex items-center justify-between">
                     <h4 className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 text-sm"><BookOpen size={20} className="text-indigo-500" /> Pinjaman Aktif</h4>
                  </div>
                  <div className="p-10 space-y-4">
                     {getActiveLoans(userName).length > 0 ? getActiveLoans(userName).map(loan => (
                        <div key={loan.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm hover:border-indigo-100 transition duration-300">
                           <div className="flex-1 truncate">
                              <p className="text-xs font-black text-slate-900 uppercase truncate mb-1">{loan.bookTitle}</p>
                              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Dipinjam pada: {loan.timestamp}</span>
                           </div>
                           <button 
                              onClick={() => handleAction(loan.bookId, 'Pemulangan', userName, 'Guru')} 
                              className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg"
                           >
                              <ArrowDownToLine size={16}/> Pulangkan
                           </button>
                        </div>
                     )) : (
                        <div className="text-center py-20 bg-white">
                           <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-6"><FileX size={40} /></div>
                           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Anda tidak mempunyai sebarang pinjaman aktif.</p>
                        </div>
                     )}
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-10 border-b-2 border-slate-50 bg-slate-50/50 flex items-center justify-between">
                     <h4 className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 text-sm"><History size={20} className="text-indigo-500" /> Sejarah Transaksi Peribadi</h4>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b-2 tracking-widest">
                           <tr><th className="px-10 py-6">Tarikh</th><th className="px-10 py-6">Aktiviti</th><th className="px-10 py-6">Tajuk Buku</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {transactions.filter(t => t.userName === userName).slice(0, 15).map(t => (
                              <tr key={t.id} className="text-xs hover:bg-slate-50 transition duration-150">
                                 <td className="px-10 py-5 font-bold text-slate-500">{t.timestamp}</td>
                                 <td className="px-10 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span>
                                 </td>
                                 <td className="px-10 py-5 font-black text-slate-800 uppercase">{t.bookTitle}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: ADMIN */}
          {activeTab === 'admin' && !isAdminAuthenticated && (
            <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-10 animate-in zoom-in">
              <div className="bg-white p-12 md:p-16 rounded-[4rem] border-2 border-slate-100 shadow-2xl w-full max-w-md text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-10 shadow-inner"><Lock size={48} /></div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Panel Pentadbiran</h3>
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-12">{adminSettings.schoolName}</p>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <input type="text" className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-900 focus:border-indigo-600 transition" value={adminIdInput} onChange={(e) => setAdminIdInput(e.target.value)} placeholder="ID ADMIN" />
                  <input type="password" className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-900 focus:border-indigo-600 transition" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="KATA LALUAN" />
                  <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-black transition shadow-2xl active:scale-95 uppercase tracking-widest text-xs">Sahkan Akses</button>
                </form>
              </div>
              <button onClick={handleResetSystem} className="text-slate-400 hover:text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2"><RotateCcw size={16} /> Reset & Daftar Semula</button>
            </div>
          )}

          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="space-y-8 animate-in fade-in">
               <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-3 rounded-[2rem] border-2 shadow-sm border-slate-100">
                  <button onClick={() => setAdminSubTab('overview')} className={`px-8 py-4 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${adminSubTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Rumusan</button>
                  <button onClick={() => setAdminSubTab('manage')} className={`px-8 py-4 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${adminSubTab === 'manage' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Inventori</button>
                  <button onClick={() => setAdminSubTab('members')} className={`px-8 py-4 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${adminSubTab === 'members' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Ahli & Pengguna</button>
                  <button onClick={() => setAdminSubTab('lost')} className={`px-8 py-4 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${adminSubTab === 'lost' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Buku Rosak</button>
                  <button onClick={() => setAdminSubTab('system')} className={`px-8 py-4 text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${adminSubTab === 'system' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Profil Admin</button>
                  <button onClick={() => setIsAdminAuthenticated(false)} className="px-8 py-4 text-rose-500 font-black text-[10px] border-2 border-rose-100 rounded-2xl ml-auto hover:bg-rose-50 transition uppercase tracking-widest">Keluar Admin</button>
              </div>

              {adminSubTab === 'overview' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-10 shadow-sm flex flex-col">
                       <h4 className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 text-sm mb-6 pb-6 border-b-2 border-slate-50"><Clock size={20} className="text-indigo-500" /> Aktiviti Terkini</h4>
                       <div className="space-y-4">
                          {transactions.slice(0, 8).map(t => (
                             <div key={t.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase text-slate-900 truncate">{t.userName}</p>
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border-2 ${t.action === 'Pinjaman' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t.action}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                    <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-10 shadow-sm">
                       <h4 className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 text-sm mb-6 pb-6 border-b-2 border-slate-50"><AlertTriangle size={20} className="text-rose-500" /> Stok Rendah (&lt;20)</h4>
                       <div className="space-y-4">
                          {books.filter(b => b.stock < 20).slice(0, 8).map(book => (
                             <div key={book.id} className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center justify-between">
                                <p className="text-[11px] font-black text-rose-900 uppercase">THN {book.year} • {book.title}</p>
                                <span className="text-xl font-black text-rose-600">{book.stock}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              )}

              {adminSubTab === 'manage' && (
                <div className="space-y-8 animate-in fade-in">
                   <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                      <div className="relative flex-1 w-full">
                         <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                         <input type="text" placeholder="Cari buku..." className="w-full pl-16 py-5 rounded-[2rem] border-2 border-slate-100 bg-slate-50 font-black uppercase text-sm outline-none focus:border-indigo-600 transition" value={adminSearchQuery} onChange={(e) => setAdminSearchQuery(e.target.value)} />
                      </div>
                      <button onClick={() => setIsAddingBook(true)} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 transition uppercase text-[10px] tracking-widest">
                        <BookPlus size={20} /> Daftar Buku
                      </button>
                   </div>
                   <div className="space-y-6">
                      {YEARS.map(year => {
                        const yearBooks = books.filter(b => b.year === year && (b.title.toLowerCase().includes(adminSearchQuery.toLowerCase()) || b.subject.toLowerCase().includes(adminSearchQuery.toLowerCase())));
                        const isExpanded = expandedYears.has(year);
                        if (yearBooks.length === 0 && adminSearchQuery) return null;
                        return (
                          <div key={year} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                            <button onClick={() => toggleYearCollapse(year)} className={`w-full px-10 py-6 flex justify-between items-center ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                              <h3 className="font-black text-lg uppercase tracking-tighter">Tahun {year} ({yearBooks.length} Tajuk)</h3>
                              {isExpanded ? <ChevronDown size={28} /> : <ChevronRight size={28} />}
                            </button>
                            {isExpanded && (
                              <div className="overflow-x-auto bg-white">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b-2 tracking-widest">
                                     <tr><th className="px-10 py-6">Judul</th><th className="px-10 py-6 text-center">Stok</th><th className="px-10 py-6 text-right">Aksi</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                     {yearBooks.map(book => (
                                       <tr key={book.id} className="group hover:bg-slate-50 transition duration-150">
                                          <td className="px-10 py-6">
                                            <p className="font-black text-slate-800 text-xs uppercase group-hover:text-indigo-600 transition">{book.title}</p>
                                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black uppercase">{book.subject}</span>
                                          </td>
                                          <td className="px-10 py-6 text-center">
                                             <div className="flex flex-col items-center">
                                               <span className={`text-xl font-black ${book.stock < 20 ? 'text-rose-600' : 'text-slate-900'}`}>{book.stock}</span>
                                               <div className="flex gap-1">
                                                  <button onClick={() => updateBookStock(book.id, -1, 'ADMIN', 'Guru', 'Pelarasan Manual')} className="w-6 h-6 bg-slate-100 rounded text-slate-500 hover:bg-rose-100 transition flex items-center justify-center"><Minus size={12}/></button>
                                                  <button onClick={() => updateBookStock(book.id, 1, 'ADMIN', 'Guru', 'Pelarasan Manual')} className="w-6 h-6 bg-slate-100 rounded text-slate-500 hover:bg-emerald-100 transition flex items-center justify-center"><Plus size={12}/></button>
                                               </div>
                                             </div>
                                          </td>
                                          <td className="px-10 py-6 text-right">
                                             <div className="flex justify-end gap-2">
                                              <button 
                                                  onClick={() => { setBookToEdit(book); setIsEditingBook(true); }} 
                                                  className="p-3 text-slate-200 hover:text-indigo-600 hover:bg-indigo-50 transition rounded-xl group-hover:text-indigo-400"
                                                  title="Edit Buku"
                                                >
                                                  <Edit2 size={24} />
                                                </button>
                                                <button 
                                                  onClick={() => handleRemoveBook(book.id)} 
                                                  className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition rounded-xl group-hover:text-rose-400"
                                                  title="Padam Buku Daripada Inventori"
                                                >
                                                  <Trash2 size={24} />
                                                </button>
                                             </div>
                                          </td>
                                       </tr>
                                     ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                   </div>
                </div>
              )}

              {adminSubTab === 'members' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-2.5 rounded-2xl border-2 border-slate-100 shadow-sm flex gap-2 w-fit">
                    <button onClick={() => setAdminMemberView('Guru')} className={`px-10 py-3 rounded-xl font-black text-[11px] transition-all uppercase tracking-widest ${adminMemberView === 'Guru' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Guru</button>
                    <button onClick={() => setAdminMemberView('Murid')} className={`px-10 py-3 rounded-xl font-black text-[11px] transition-all uppercase tracking-widest ${adminMemberView === 'Murid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Murid</button>
                  </div>
                  <button onClick={() => { setNewMember({type: adminMemberView, year: 1}); setIsAddingMember(true); }} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black shadow-2xl hover:bg-indigo-700 transition uppercase text-[10px] tracking-widest"><UserPlus size={20} /> Daftar {adminMemberView} Baru</button>
                  
                  {adminMemberView === 'Guru' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {members.filter(m => m.type === 'Guru').map(m => (
                        <div key={m.id} 
                          onClick={() => setSelectedStudentForAdmin(m)}
                          className="flex justify-between p-6 bg-white rounded-[2rem] border-2 border-slate-100 items-center shadow-sm hover:border-indigo-200 transition cursor-pointer group"
                        >
                          <span className="font-black uppercase text-xs truncate max-w-[150px] group-hover:text-indigo-600">{m.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.id); }} className="text-slate-200 hover:text-rose-600 transition p-2"><Trash2 size={20} /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {YEARS.map(year => {
                        const studentsInYear = members.filter(m => m.type === 'Murid' && m.year === year);
                        const isExpanded = expandedMemberYears.has(year);
                        return (
                          <div key={year} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                             <button onClick={() => toggleMemberYearCollapse(year)} className={`w-full px-10 py-6 flex justify-between items-center transition ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                <h4 className="font-black text-sm uppercase tracking-tighter">Tahun {year} ({studentsInYear.length} Orang)</h4>
                                {isExpanded ? <ChevronDown size={24} className="text-indigo-600" /> : <ChevronRight size={24} className="text-slate-300" />}
                             </button>
                             {isExpanded && (
                               <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t-2 border-slate-50">
                                  {studentsInYear.length > 0 ? studentsInYear.map(student => (
                                    <div key={student.id} 
                                      onClick={() => setSelectedStudentForAdmin(student)}
                                      className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center hover:border-indigo-200 transition cursor-pointer group"
                                    >
                                      <span className="font-black uppercase text-[11px] truncate pr-4 group-hover:text-indigo-600">{student.name}</span>
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(student.id); }} className="text-slate-300 hover:text-rose-600 transition p-1.5"><Trash2 size={18} /></button>
                                    </div>
                                  )) : (
                                    <p className="col-span-full text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest py-4">Tiada murid didaftarkan untuk Tahun {year}</p>
                                  )}
                               </div>
                             )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {adminSubTab === 'lost' && (
                <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
                  <div className="p-10 border-b bg-rose-50/30 flex items-center justify-between">
                     <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter">Rekod Buku Rosak / Hilang</h3>
                     <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border-2 border-rose-100">{lostTransactions.length} Rekod</div>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b-2 border-slate-100 tracking-[0.15em]">
                        <tr>
                          <th className="px-10 py-6">Masa</th>
                          <th className="px-10 py-6">Nama</th>
                          <th className="px-10 py-6">Judul Buku</th>
                          <th className="px-10 py-6">Denda (RM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lostTransactions.length > 0 ? lostTransactions.map(t => (
                          <tr key={t.id} className="text-sm hover:bg-rose-50/20 transition duration-300">
                            <td className="px-10 py-6 font-bold text-slate-500 whitespace-nowrap text-xs">{t.timestamp}</td>
                            <td className="px-10 py-6 font-black text-slate-800 uppercase text-xs">{t.userName}</td>
                            <td className="px-10 py-6 font-bold text-slate-700 text-xs uppercase">{t.bookTitle}</td>
                            <td className="px-10 py-6">
                              <span className="px-4 py-2 rounded-full text-[11px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                                RM {(t.fineAmount || 0).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-10 py-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Tiada rekod buku rosak atau hilang setakat ini.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminSubTab === 'system' && (
                <div className="max-w-xl animate-in slide-in-from-bottom-6 duration-300">
                  <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-12 shadow-sm">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-50">
                      <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-inner"><ShieldCheck size={32} /></div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Profil Pentadbir (Handover)</h3>
                    </div>
                    <div className="space-y-6">
                       <div className="relative">
                          <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">ID Log Masuk</label>
                          <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={editAdminId} onChange={(e) => setEditAdminId(e.target.value)} />
                       </div>
                       <div className="relative">
                          <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kata Laluan Baru</label>
                          <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={editAdminPass} onChange={(e) => setEditAdminPass(e.target.value)} />
                       </div>
                       <div className="relative">
                          <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Penyelaras Terkini</label>
                          <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={editAdminName} onChange={(e) => setEditAdminName(e.target.value)} />
                       </div>
                       <button onClick={handleUpdateAdminProfile} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 transition active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Save size={18}/> Kemaskini Profil Handover</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {/* BORROW MODAL (BULK BORROW) */}
        {isBorrowModalOpen && borrowingStudent && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">
                <div className="p-10 border-b-2 border-slate-50 bg-slate-50/50 flex justify-between items-center">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">Borang Pinjaman Buku</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md">{borrowingStudent.name}</span>
                        {borrowingStudent.type === 'Murid' && (
                          <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">Tahun {borrowingStudent.year}</span>
                        )}
                        {borrowingStudent.type === 'Guru' && (
                          <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md">Guru</span>
                        )}
                      </div>
                   </div>
                   <button onClick={() => { setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); }} className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition shadow-sm"><X size={32}/></button>
                </div>
                <div className="p-10 overflow-y-auto no-scrollbar flex-1 bg-white">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {books.filter(b => borrowingStudent.type === 'Guru' || b.year === borrowingStudent.year).map(book => {
                        const isSelected = selectedBooksToBorrow.has(book.id);
                        return (
                          <div key={book.id} onClick={() => toggleBookSelection(book.id)} className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-102' : 'bg-slate-50 border-white hover:border-indigo-200'}`}>
                             <div className="flex-1">
                                <h4 className={`font-black text-xs uppercase mb-1.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>{book.title}</h4>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>Baki: {book.stock}</p>
                             </div>
                             <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white text-indigo-600 scale-110 shadow-lg' : 'border-slate-200 bg-white group-hover:border-indigo-300'}`}>{isSelected && <CheckCircle size={20} />}</div>
                          </div>
                        );
                      })}
                   </div>
                </div>
                <div className="p-10 bg-slate-50 border-t-2 border-slate-100 flex flex-col sm:flex-row gap-6 items-center">
                   <div className="flex-1 text-center sm:text-left"><p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Jumlah Pilihan</p><div className="flex items-center gap-3"><span className="text-4xl font-black text-indigo-600">{selectedBooksToBorrow.size}</span><span className="text-xs font-black uppercase text-slate-500 tracking-widest">Buku Teks / Aktiviti</span></div></div>
                   <div className="flex gap-4 w-full sm:w-auto">
                      <button onClick={() => { setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set()); }} className="flex-1 sm:flex-none px-10 py-5 text-slate-500 font-black rounded-3xl border-2 border-slate-200 uppercase text-[10px] tracking-widest bg-white shadow-sm">Batal</button>
                      <button onClick={handleBulkBorrow} disabled={selectedBooksToBorrow.size === 0} className="flex-1 sm:flex-none px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest active:scale-95 disabled:opacity-50">Sahkan Pinjaman</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* MODAL: PROFIL AHLI (DETAIL VIEW) */}
        {selectedStudentForAdmin && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in duration-300">
                <div className="p-12 border-b-2 border-slate-50 bg-slate-50 flex justify-between items-center">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-2xl">{selectedStudentForAdmin.name.charAt(0)}</div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{selectedStudentForAdmin.name}</h3>
                         {selectedStudentForAdmin.type === 'Murid' && (
                            <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Tahun {selectedStudentForAdmin.year}</span>
                         )}
                         {selectedStudentForAdmin.type === 'Guru' && (
                            <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md">Guru</span>
                         )}
                      </div>
                   </div>
                   <button onClick={() => setSelectedStudentForAdmin(null)} className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 transition shadow-sm"><X size={32}/></button>
                </div>
                <div className="p-12 overflow-y-auto no-scrollbar flex-1 bg-white">
                   <div className="flex justify-between items-center mb-8 border-b-2 border-slate-50 pb-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><BookOpen size={16}/> Pinjaman Aktif</h4>
                      <button onClick={() => { setBorrowingStudent(selectedStudentForAdmin); setIsBorrowModalOpen(true); }} className="text-[10px] font-black bg-indigo-600 text-white px-8 py-3 rounded-2xl hover:bg-indigo-700 transition flex items-center gap-2 uppercase tracking-widest shadow-xl"><Plus size={16}/> Pinjam Buku</button>
                   </div>
                   <div className="space-y-4">
                      {getActiveLoans(selectedStudentForAdmin.name).length > 0 ? getActiveLoans(selectedStudentForAdmin.name).map(loan => (
                         <div key={loan.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm hover:border-indigo-100 transition duration-300">
                            <div className="flex-1 truncate">
                               <p className="text-xs font-black text-slate-900 uppercase truncate mb-1">{loan.bookTitle}</p>
                               <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Dipinjam: {loan.timestamp}</span>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedStudentForAdmin.name, selectedStudentForAdmin.type)} className="w-12 h-12 bg-white border-2 border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition active:scale-90"><CheckCircle size={20}/></button>
                               <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedStudentForAdmin.name, selectedStudentForAdmin.type)} className="w-12 h-12 bg-white border-2 border-rose-100 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition active:scale-90"><AlertTriangle size={20}/></button>
                            </div>
                         </div>
                      )) : (
                        <div className="text-center py-10">
                           <FileX className="mx-auto text-slate-200 mb-4" size={48} />
                           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Tiada rekod pinjaman aktif</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* MODAL: DAFTAR BUKU */}
        {isAddingBook && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 animate-in zoom-in shadow-2xl">
               <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-50">
                  <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-inner"><BookPlus size={32} /></div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Daftar Buku Baru</h3>
                  <button onClick={() => setIsAddingBook(false)} className="ml-auto w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:text-rose-600 transition"><X size={24}/></button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="md:col-span-2 relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tajul Penuh Buku</label>
                    <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" placeholder="NAMA BUKU" value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kategori</label>
                    <select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={newBook.type} onChange={(e) => setNewBook({...newBook, type: e.target.value as BookType})}>
                      <option value="Buku Teks">Buku Teks</option>
                      <option value="Buku Aktiviti">Buku Aktiviti</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tahun</label>
                    <select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={newBook.year} onChange={(e) => setNewBook({...newBook, year: parseInt(e.target.value)})}>
                      {YEARS.map(y => <option key={y} value={y}>Tahun {y}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Kod Subjek</label>
                    <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" placeholder="BM / BI / SC" value={newBook.subject} onChange={(e) => setNewBook({...newBook, subject: e.target.value})} />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Harga (RM)</label>
                    <input type="number" step="0.01" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" placeholder="0.00" value={newBook.price} onChange={(e) => setNewBook({...newBook, price: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Stok Awal</label>
                    <input type="number" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" placeholder="100" value={newBook.stock} onChange={(e) => setNewBook({...newBook, stock: parseInt(e.target.value) || 0})} />
                  </div>
               </div>
               <div className="flex gap-4 pt-10">
                  <button onClick={() => setIsAddingBook(false)} className="flex-1 py-5 text-slate-500 font-black rounded-3xl border-2 border-slate-200 uppercase text-[10px] tracking-widest bg-white shadow-sm hover:bg-slate-50 transition">Batal</button>
                  <button onClick={handleAddNewBook} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest active:scale-95 hover:bg-indigo-700 transition">Sahkan Daftar</button>
               </div>
             </div>
          </div>
        )}

        {/* MODAL: EDIT BUKU */}
        {isEditingBook && bookToEdit && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 animate-in zoom-in shadow-2xl">
               <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-50">
                  <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-inner"><Edit2 size={32} /></div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Edit Maklumat Buku</h3>
                  <button onClick={() => { setIsEditingBook(false); setBookToEdit(null); }} className="ml-auto w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:text-rose-600 transition"><X size={24}/></button>
               </div>
               <div className="grid grid-cols-1 gap-6 text-left">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tajul Penuh Buku</label>
                    <input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" value={bookToEdit.title} onChange={(e) => setBookToEdit({...bookToEdit, title: e.target.value})} />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Harga (RM)</label>
                    <input type="number" step="0.01" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={bookToEdit.price} onChange={(e) => setBookToEdit({...bookToEdit, price: parseFloat(e.target.value) || 0})} />
                  </div>
               </div>
               <div className="flex gap-4 pt-10">
                  <button onClick={() => { setIsEditingBook(false); setBookToEdit(null); }} className="flex-1 py-5 text-slate-500 font-black rounded-3xl border-2 border-slate-200 uppercase text-[10px] tracking-widest bg-white shadow-sm hover:bg-slate-50 transition">Batal</button>
                  <button onClick={handleUpdateBook} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest active:scale-95 hover:bg-indigo-700 transition">Simpan Perubahan</button>
               </div>
             </div>
          </div>
        )}

        {/* MODAL: DAFTAR AHLI */}
        {isAddingMember && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
             <div className="bg-white w-full max-md rounded-[3.5rem] p-12 animate-in zoom-in shadow-2xl text-center">
               <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Pendaftaran Ahli Baru</h3>
               <div className="space-y-6 text-left">
                  <div className="relative"><label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Nama Penuh</label><input type="text" className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black uppercase text-slate-900 outline-none focus:border-indigo-600 transition" placeholder="NAMA AHLI" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} /></div>
                  <div className="relative"><label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Jenis Ahli</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={newMember.type} onChange={(e) => setNewMember({...newMember, type: e.target.value as UserType})}><option value="Guru">Guru</option><option value="Murid">Murid</option></select></div>
                  {newMember.type === 'Murid' && (<div className="relative"><label className="text-[10px] font-black uppercase text-slate-400 absolute left-6 top-3 tracking-widest">Tahun</label><select className="w-full px-6 pt-8 pb-4 rounded-3xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 outline-none focus:border-indigo-600 transition" value={newMember.year} onChange={(e) => setNewMember({...newMember, year: parseInt(e.target.value)})}>{YEARS.map(y => <option key={y} value={y}>Tahun {y}</option>)}</select></div>)}
                  <div className="flex gap-4 pt-6"><button onClick={() => setIsAddingMember(false)} className="flex-1 py-5 text-slate-500 font-black rounded-3xl border-2 border-slate-200 uppercase text-[10px] tracking-widest bg-white shadow-sm hover:bg-slate-50 transition">Batal</button><button onClick={() => { if (!newMember.name) return; const member: Member = { id: Math.random().toString(36).substr(2, 9), name: newMember.name.toUpperCase(), type: newMember.type as UserType, year: newMember.type === 'Murid' ? newMember.year : undefined }; setMembers(prev => [...prev, member]); setIsAddingMember(false); setNewMember({ name: '', type: 'Guru', year: 1 }); }} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest active:scale-95 hover:bg-indigo-700 transition">Daftar Ahli</button></div>
               </div>
             </div>
          </div>
        )}

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 px-8 py-5 flex justify-between z-30 shadow-[0_-15px_50px_rgba(0,0,0,0.1)]">
           <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><BookOpen size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Bilik Buku</span></button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><History size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Log</span></button>
           {userName && (
              <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><UserCircle size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Profil</span></button>
           )}
           <button onClick={() => { setActiveTab('admin'); setAdminSubTab('overview'); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><LayoutDashboard size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Admin</span></button>
        </div>
      </main>
    </div>
  );
};

export default App;
