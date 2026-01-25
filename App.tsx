import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Book, Transaction, UserType, TransactionStatus, ActionType, BookType, Member, AdminSettings, ResolutionMethod, ResolutionStatus } from './types';
import { INITIAL_BOOKS, YEARS, CATEGORIES } from './constants';
import { getStockInsight, extractMembersFromFile } from './services/geminiService';
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
  RefreshCw,
  FileUp,
  UploadCloud,
  Loader2,
  Download,
  Upload
} from 'lucide-react';

const MONTHS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun", 
  "Julai", "Ogos", "September", "Oktober", "November", "Disember"
];

const App: React.FC = () => {
  // --- STATE UTAMA ---
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
  
  // Menggunakan string key untuk mengelakkan isu JSON parsing (number vs string)
  const [classesConfig, setClassesConfig] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('spbt_classes');
    return saved ? JSON.parse(saved) : { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] };
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

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'members' | 'damages' | 'history' | 'session' | 'settings' | 'import'>('overview');
  const [inventoryType, setInventoryType] = useState<BookType>('Buku Teks');
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [memberTypeView, setMemberTypeView] = useState<UserType>('Guru');
  const [memberYearView, setMemberYearView] = useState<number>(1);
  const [memberClassView, setMemberClassView] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth());

  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [newBook, setNewBook] = useState<Partial<Book>>({ title: '', code: '', year: 1, type: 'Buku Teks', stock: 0, price: 0 });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState<Partial<Member>>({ name: '', type: 'Guru', year: 1, className: '' });
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

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMembers, setExtractedMembers] = useState<Partial<Member>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newClassName, setNewClassName] = useState('');
  const [classConfigYear, setClassConfigYear] = useState<number>(1);

  const [editableFormData, setEditableFormData] = useState<Record<string, { serial: string, receivedDate: string, returnDate: string, status: string }>>({});

  useEffect(() => localStorage.setItem('spbt_books', JSON.stringify(books)), [books]);
  useEffect(() => localStorage.setItem('spbt_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('spbt_members', JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem('spbt_settings', JSON.stringify(adminSettings)), [adminSettings]);
  useEffect(() => localStorage.setItem('spbt_persistent_forms', JSON.stringify(persistentForms)), [persistentForms]);
  useEffect(() => localStorage.setItem('spbt_classes', JSON.stringify(classesConfig)), [classesConfig]);

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
      year: newMember.type === 'Murid' ? newMember.year : undefined,
      className: newMember.type === 'Murid' ? newMember.className : undefined
    };
    setMembers(prev => [...prev, member]);
    setIsAddingMember(false);
  };

  const handleUpdateMember = () => {
    if (!memberToEdit) return;
    setMembers(prev => prev.map(m => m.id === memberToEdit.id ? { ...memberToEdit, name: memberToEdit.name.toUpperCase() } : m));
    setIsEditingMember(false);
  };

  const handleAddClass = () => {
    if (!newClassName) return;
    const name = newClassName.toUpperCase().trim();
    const yearKey = classConfigYear.toString();
    const currentClasses = classesConfig[yearKey] || [];
    
    if (currentClasses.includes(name)) return alert("Kelas sudah ada!");
    
    setClassesConfig(prev => ({
      ...prev,
      [yearKey]: [...currentClasses, name].sort()
    }));
    setNewClassName('');
  };

  const handleRemoveClass = (year: number, name: string) => {
    if (confirm(`Padam kelas ${name}? Murid dalam kelas ini akan kekal tetapi tanpa nama kelas.`)) {
      const yearKey = year.toString();
      setClassesConfig(prev => ({
        ...prev,
        [yearKey]: (prev[yearKey] || []).filter(c => c !== name)
      }));
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const result = await extractMembersFromFile(base64, file.type);
        setExtractedMembers(result);
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Gagal memproses fail. Sila pastikan fail anda dalam format PDF atau Gambar yang jelas.");
      setIsExtracting(false);
    }
  };

  const handleConfirmImport = () => {
    const newMembersList: Member[] = extractedMembers.map(m => ({
      id: Math.random().toString(36).substr(2, 9),
      name: (m.name || 'TANPA NAMA').toUpperCase(),
      type: 'Murid',
      year: m.year || 1,
      className: (m.className || '').toUpperCase()
    }));

    const newClassesConfig = { ...classesConfig };
    newMembersList.forEach(m => {
      if (m.year && m.className) {
        const yKey = m.year.toString();
        if (!newClassesConfig[yKey]) newClassesConfig[yKey] = [];
        if (!newClassesConfig[yKey].includes(m.className)) {
          newClassesConfig[yKey] = [...newClassesConfig[yKey], m.className].sort();
        }
      }
    });

    setMembers(prev => [...prev, ...newMembersList]);
    setClassesConfig(newClassesConfig);
    setExtractedMembers([]);
    alert(`Berjaya mendaftarkan ${newMembersList.length} orang murid secara automatik!`);
    setActiveTab('members');
  };

  const handleBackupData = () => {
    const backupObj = {
      books,
      transactions,
      members,
      classesConfig,
      adminSettings,
      persistentForms,
      version: '1.2.0',
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `ESPBT_BACKUP_${adminSettings.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (confirm("AMARAN: Data sedia ada akan dipadam sepenuhnya dan digantikan dengan data dari fail backup ini. Adakah anda pasti?")) {
          if (json.books) setBooks(json.books);
          if (json.transactions) setTransactions(json.transactions);
          if (json.members) setMembers(json.members);
          if (json.classesConfig) setClassesConfig(json.classesConfig);
          if (json.adminSettings) setAdminSettings(json.adminSettings);
          if (json.persistentForms) setPersistentForms(json.persistentForms);
          
          alert("Data berjaya dipulihkan!");
          setActiveTab('overview');
        }
      } catch (err) {
        alert("Gagal memulihkan data. Sila pastikan fail adalah format backup .json yang sah.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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
        <div className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'RUMUSAN' },
            { id: 'inventory', icon: Package, label: 'INVENTORI' },
            { id: 'members', icon: UserCircle, label: 'URUS AHLI' },
            { id: 'import', icon: FileUp, label: 'IMBAS DATA' },
            { id: 'damages', icon: AlertTriangle, label: 'KOS GANTI' },
            { id: 'history', icon: History, label: 'LOG REKOD' },
            { id: 'session', icon: TrendingUp, label: 'URUS SESI' },
            { id: 'settings', icon: Settings, label: 'TETAPAN' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white font-black shadow-xl' : 'text-indigo-200/60 hover:text-white hover:bg-white/5 font-bold'}`}>
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
          <div className="text-[9px] font-black uppercase text-slate-500">{adminSettings.schoolName}</div>
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
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">{c.label}</p>
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

          {activeTab === 'import' && (
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              <div className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-dashed border-indigo-600 text-center space-y-6">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   {isExtracting ? <Loader2 size={48} className="text-indigo-600 animate-spin" /> : <UploadCloud size={48} className="text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic text-indigo-950">Imbas Senarai Murid Pukal</h3>
                  <p className="text-[11px] text-slate-700 font-bold uppercase mt-2">Muat naik fail PDF, Gambar Jadual Kelas, atau Teks senarai nama murid.</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".pdf,image/*,.txt" />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isExtracting}
                  className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl transition-all active:scale-95 flex items-center gap-3 mx-auto"
                >
                  {isExtracting ? 'SEDANG MENGEKSTRAK...' : 'PILIH FAIL SENARAI NAMA'}
                </button>
              </div>

              {extractedMembers.length > 0 && (
                <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-10 border-b bg-indigo-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black uppercase italic text-indigo-950">Semakan Prapapar</h3>
                      <p className="text-[11px] text-indigo-700 font-black uppercase">Sila sahkan ketepatan data sebelum pendaftaran rasmi</p>
                    </div>
                    <button onClick={handleConfirmImport} className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all">SAHKAN & DAFTAR ({extractedMembers.length} MURID)</button>
                  </div>
                  <div className="overflow-x-auto max-h-[600px] no-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-indigo-950 text-[10px] font-black uppercase text-white sticky top-0">
                        <tr><th className="px-10 py-5">BIL</th><th className="px-10 py-5">NAMA PENUH MURID</th><th className="px-10 py-5 text-center">TAHUN</th><th className="px-10 py-5">KELAS</th></tr>
                      </thead>
                      <tbody className="divide-y-2 divide-slate-100 text-[11px] font-black">
                        {extractedMembers.map((m, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-10 py-5 text-slate-500">{idx + 1}</td>
                            <td className="px-10 py-5 uppercase text-indigo-950 tracking-tight">{m.name}</td>
                            <td className="px-10 py-5 text-center"><span className="px-3 py-1 bg-indigo-100 text-indigo-950 rounded-lg">TAHUN {m.year}</span></td>
                            <td className="px-10 py-5 uppercase text-indigo-700 font-black">{m.className || 'TIDAK DIKETAHUI'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto py-10 space-y-8">
              {/* --- BAGIAN BACKUP & RESTORE --- */}
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-indigo-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <RefreshCw size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-indigo-950">Sinkronasi & Backup Data</h3>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pindah data antara laptop dan telefon</p>
                  </div>
                </div>
                
                <p className="text-[10px] font-bold text-slate-600 mb-8 leading-relaxed bg-slate-50 p-4 rounded-2xl border">
                  PANDUAN: Tekan butang <b>BACKUP DATA</b> untuk simpan fail. Kemudian, hantar fail tersebut ke phone. Di phone, buka app ini dan tekan <b>MUAT NAIK BACKUP</b>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleBackupData}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-indigo-800 transition-all active:translate-y-1"
                  >
                    <Download size={20} /> BACKUP DATA
                  </button>
                  
                  <label className="flex items-center justify-center gap-3 px-6 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-emerald-800 transition-all active:translate-y-1 cursor-pointer text-center">
                    <Upload size={20} /> MUAT NAIK BACKUP
                    <input type="file" className="hidden" accept=".json" onChange={handleRestoreData} />
                  </label>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100">
                <h3 className="text-xl font-black uppercase italic mb-8 border-b pb-4 text-indigo-950">Tetapan Pentadbir</h3>
                <div className="space-y-6 font-bold">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 mb-2 block font-black">ID PENGGUNA</label>
                    <input type="text" className="w-full p-4 border-2 rounded-xl text-indigo-950 bg-slate-50 focus