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
  Upload,
  Type as TypeIcon
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
  const [classesConfig, setClassesConfig] = useState<Record<number, string[]>>(() => {
    const saved = localStorage.getItem('spbt_classes');
    return saved ? JSON.parse(saved) : { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
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

  const [importMode, setImportMode] = useState<'text' | 'file'>('text');
  const [manualText, setManualText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMembers, setExtractedMembers] = useState<Partial<Member>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newClassName, setNewClassName] = useState('');
  const [classConfigYear, setClassConfigYear] = useState(1);

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

  const getMemberInfoText = (name: string) => {
    const m = members.find(member => member.name === name);
    if (!m) return name;
    if (m.type === 'Guru') return `${m.name} (GURU)`;
    return `${m.name} (MURID - T${m.year} ${m.className || ''})`;
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
    if (classesConfig[classConfigYear].includes(name)) return alert("Kelas sudah ada!");
    setClassesConfig(prev => ({
      ...prev,
      [classConfigYear]: [...prev[classConfigYear], name].sort()
    }));
    setNewClassName('');
  };

  const handleRemoveClass = (year: number, name: string) => {
    if (confirm(`Padam kelas ${name}? Murid dalam kelas ini akan kekal tetapi tanpa nama kelas.`)) {
      setClassesConfig(prev => ({
        ...prev,
        [year]: prev[year].filter(c => c !== name)
      }));
    }
  };

  const handleTextImport = () => {
    if (!manualText.trim()) return alert("Sila masukkan senarai nama murid.");
    
    setIsExtracting(true);
    setTimeout(() => {
      try {
        const lines = manualText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const results: Partial<Member>[] = [];
        let currentYear = 1;
        let currentClass = "";

        lines.forEach(line => {
          const upperLine = line.toUpperCase();
          const classHeaderMatch = upperLine.match(/^(?:TAHUN\s+)?([1-6])\s+([A-Z0-9\s-]+)$/);
          
          if (classHeaderMatch) {
            currentYear = parseInt(classHeaderMatch[1]);
            currentClass = classHeaderMatch[2].trim();
          } else {
            const yearOnlyMatch = upperLine.match(/^TAHUN\s+([1-6])$/);
            if (yearOnlyMatch) {
              currentYear = parseInt(yearOnlyMatch[1]);
              currentClass = ""; 
            } else {
              const nameOnly = upperLine.replace(/^\d+[\s\.\)]+/, '').trim();
              if (nameOnly && nameOnly.length > 1) {
                results.push({
                  name: nameOnly,
                  year: currentYear,
                  className: currentClass || 'TIADA'
                });
              }
            }
          }
        });

        if (results.length === 0) {
          alert("Sistem tidak menemui sebarang nama. Sila ikut format contoh.");
        } else {
          setExtractedMembers(results);
          setManualText('');
        }
      } catch (err) {
        alert("Gagal memproses teks.");
      } finally {
        setIsExtracting(false);
      }
    }, 800);
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
      if (m.year && m.className && m.className !== 'TIADA' && !newClassesConfig[m.year].includes(m.className)) {
        newClassesConfig[m.year] = [...newClassesConfig[m.year], m.className].sort();
      }
    });

    setMembers(prev => [...prev, ...newMembersList]);
    setClassesConfig(newClassesConfig);
    setExtractedMembers([]);
    alert(`Berjaya mendaftarkan ${newMembersList.length} orang murid!`);
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
      version: '1.0.0',
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
        if (confirm("AMARAN: Data sedia ada akan diganti sepenuhnya. Teruskan?")) {
          if (json.books) setBooks(json.books);
          if (json.transactions) setTransactions(json.transactions);
          if (json.members) setMembers(json.members);
          if (json.classesConfig) setClassesConfig(json.classesConfig);
          if (json.adminSettings) setAdminSettings(json.adminSettings);
          if (json.persistentForms) setPersistentForms(json.persistentForms);
          alert("Berjaya dipulihkan!");
        }
      } catch (err) {
        alert("Gagal memulihkan data.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f1f5f9] text-indigo-950 font-black">
      <nav className="hidden md:flex w-72 bg-indigo-950 text-white flex-col shrink-0 no-print font-black">
        <div className="p-8 border-b border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Library size={24} /></div>
          <div><h1 className="font-black text-md tracking-tighter uppercase italic">E-SPBT PINTAR</h1><p className="text-[7px] text-indigo-400 font-black uppercase tracking-widest font-black">{adminSettings.schoolName}</p></div>
        </div>
        <div className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar font-black">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'RUMUSAN' },
            { id: 'inventory', icon: Package, label: 'INVENTORI' },
            { id: 'members', icon: UserCircle, label: 'URUS AHLI' },
            { id: 'import', icon: Sparkles, label: 'IMBAS DATA' },
            { id: 'damages', icon: AlertTriangle, label: 'KOS GANTI' },
            { id: 'history', icon: History, label: 'LOG REKOD' },
            { id: 'session', icon: TrendingUp, label: 'URUS SESI' },
            { id: 'settings', icon: Settings, label: 'TETAPAN' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white font-black shadow-xl' : 'text-indigo-200/60 hover:text-white hover:bg-white/5 font-bold'}`}>
              <item.icon size={20} /><span className="text-[10px] uppercase tracking-widest font-black">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-6 border-t border-white/10 font-black">
          <button onClick={handleLogout} className="w-full py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black border border-rose-500/20 uppercase hover:bg-rose-500 hover:text-white transition-all font-black">KELUAR</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden no-print font-black">
        <header className="h-20 bg-white border-b px-6 flex items-center justify-between shadow-sm z-20 font-black">
          <h2 className="text-lg font-black text-indigo-900 uppercase italic tracking-tighter">{activeTab.toUpperCase()}</h2>
          <div className="text-[9px] font-black uppercase text-slate-500 font-black">{adminSettings.schoolName}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-[#f8fafc] font-black">
          {activeTab === 'overview' && (
            <div className="space-y-8 font-black">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-black">
                {[
                  { label: 'STOK BUKU', val: books.reduce((a, b) => a + b.stock, 0), icon: Package, color: 'text-indigo-600' },
                  { label: 'AKTIF PINJAM', val: transactions.filter(t => t.action === 'Pinjaman').length, icon: BookOpen, color: 'text-blue-600' },
                  { label: 'KES ROSAK', val: transactions.filter(t => t.status === 'Rosak/Hilang' && t.resolutionStatus === 'Tertunggak').length, icon: AlertTriangle, color: 'text-rose-600' },
                  { label: 'JUMLAH AHLI', val: members.length, icon: UserCircle, color: 'text-emerald-600' }
                ].map((c, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col font-black">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2 font-black">{c.label}</p>
                    <p className={`text-4xl font-black ${c.color} font-black`}>{c.val}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white flex items-center gap-6 font-black">
                <Sparkles size={32} className={isAiLoading ? 'animate-spin' : ''} />
                <div className="flex-1 font-black"><h3 className="text-xl font-black uppercase italic">Analisa AI Gemini</h3><p className="text-[9px] text-indigo-300 font-black">Data & Trend Terkini Sekolah</p></div>
                <button onClick={fetchAiInsight} disabled={isAiLoading} className="px-6 py-3 bg-white text-indigo-950 rounded-xl font-black text-[10px] uppercase shadow-lg font-black">JANA</button>
              </div>
              {aiInsight && <div className="p-6 bg-white border-2 border-indigo-100 rounded-[2rem] text-[11px] font-bold text-indigo-950 leading-relaxed whitespace-pre-wrap italic shadow-sm font-black">{aiInsight}</div>}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="max-w-4xl mx-auto space-y-8 pb-10 font-black">
              <div className="flex gap-4 p-2 bg-indigo-50 rounded-[2rem] w-fit mx-auto shadow-inner border border-indigo-100 font-black">
                <button onClick={() => setImportMode('text')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${importMode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 font-black'}`}><TypeIcon size={18}/> TAMPAL TEKS (OFFLINE)</button>
                <button onClick={() => setImportMode('file')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${importMode === 'file' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 font-black'}`}><FileUp size={18}/> FAIL / GAMBAR (AI)</button>
              </div>

              <div className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-dashed border-indigo-600 text-center space-y-6 font-black">
                {isExtracting ? (
                  <div className="py-10 space-y-6 font-black">
                    <Loader2 size={64} className="text-indigo-600 animate-spin mx-auto" />
                    <p className="text-sm font-black uppercase italic text-indigo-950 font-black">Sedang Memproses Offline...</p>
                  </div>
                ) : (
                  <div className="font-black">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                       {importMode === 'file' ? <UploadCloud size={48} className="text-indigo-600" /> : <TypeIcon size={48} className="text-indigo-600" />}
                    </div>
                    {importMode === 'text' ? (
                      <div className="space-y-4 font-black">
                        <h3 className="text-2xl font-black uppercase italic text-indigo-950 font-black">Tampal Teks Pintar (Offline)</h3>
                        <div className="text-[11px] text-slate-700 font-bold uppercase space-y-1 font-black">
                          <p className="font-black">Contoh format:</p>
                          <div className="bg-indigo-50 p-4 rounded-2xl inline-block text-left normal-case border border-indigo-100 text-indigo-950 leading-relaxed font-black">
                            <strong className="font-black">1 Amanah</strong><br/>
                            Ahmad Ali<br/>
                            Siti Sarah<br/>
                            <strong className="font-black">2 Bestari</strong><br/>
                            Ali bin Abu
                          </div>
                        </div>
                        <textarea 
                          className="w-full h-64 p-6 border-2 rounded-3xl bg-slate-50 font-black text-xs outline-none focus:border-indigo-600 transition-all uppercase no-scrollbar text-indigo-950 font-black"
                          placeholder="Tampal senarai nama di sini..."
                          value={manualText}
                          onChange={e => setManualText(e.target.value)}
                        />
                        <button onClick={handleTextImport} className="mt-6 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl transition-all active:scale-95 flex items-center gap-3 mx-auto font-black">PROSES SENARAI TEKS</button>
                      </div>
                    ) : (
                      <div className="font-black">
                        <h3 className="text-2xl font-black uppercase italic text-indigo-950 font-black">Imbas Senarai (AI)</h3>
                        <p className="text-[11px] text-slate-700 font-bold uppercase mt-2 font-black">Muat naik fail PDF atau Gambar untuk diproses oleh AI (Memerlukan Internet).</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".pdf,image/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl transition-all active:scale-95 flex items-center gap-3 mx-auto font-black">PILIH FAIL</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {extractedMembers.length > 0 && (
                <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 font-black">
                  <div className="p-10 border-b bg-indigo-50 flex justify-between items-center flex-col sm:flex-row gap-4 font-black">
                    <div className="font-black">
                      <h3 className="text-xl font-black uppercase italic text-indigo-950 font-black">Sahkan Data</h3>
                      <p className="text-[11px] text-indigo-700 font-black uppercase font-black">{extractedMembers.length} Rekod Dikesan</p>
                    </div>
                    <div className="flex gap-2 font-black">
                      <button onClick={() => setExtractedMembers([])} className="px-6 py-4 bg-white border-2 border-rose-100 text-rose-500 rounded-xl font-black text-xs uppercase font-black">BATAL</button>
                      <button onClick={handleConfirmImport} className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all font-black">DAFTAR SEMUA</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[600px] no-scrollbar font-black">
                    <table className="w-full text-left font-black">
                      <thead className="bg-indigo-950 text-[10px] font-black uppercase text-white sticky top-0 font-black">
                        <tr>
                          <th className="px-10 py-5 font-black">BIL</th>
                          <th className="px-10 py-5 font-black">NAMA</th>
                          <th className="px-10 py-5 text-center font-black">TAHUN</th>
                          <th className="px-10 py-5 font-black">KELAS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-slate-100 text-[11px] font-black text-indigo-950 font-black">
                        {extractedMembers.map((m, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white font-black' : 'bg-slate-50 font-black'}>
                            <td className="px-10 py-5 text-slate-500 font-black">{idx + 1}</td>
                            <td className="px-10 py-5 uppercase font-black">{m.name}</td>
                            <td className="px-10 py-5 text-center font-black">T{m.year}</td>
                            <td className="px-10 py-5 uppercase text-indigo-700 font-black">{m.className || 'TIADA'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6 font-black">
              <div className="flex flex-col lg:flex-row justify-between gap-4 font-black">
                <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm font-black">
                  {['Buku Teks', 'Buku Aktiviti'].map(type => (
                    <button key={type} onClick={() => setInventoryType(type as BookType)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${inventoryType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{type}</button>
                  ))}
                </div>
                <button onClick={() => { setIsAddingBook(true); setNewBook({ ...newBook, type: inventoryType, year: selectedYear }); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 font-black"><Plus size={18}/> TAMBAH BUKU</button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 font-black">{YEARS.map(y => <button key={y} onClick={() => setSelectedYear(y)} className={`min-w-[80px] py-3 rounded-xl font-black text-[10px] border-2 uppercase transition-all ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black' : 'bg-white text-slate-500'}`}>TAHUN {y}</button>)}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-black">
                {books.filter(b => b.year === selectedYear && b.type === inventoryType).map(book => (
                  <div key={book.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:border-indigo-400 transition-all group relative z-10 font-black">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-emerald-600">RM {book.price.toFixed(2)}</span>
                      <div className="flex gap-2 font-black">
                        <button onClick={() => { setBookToEdit(book); setIsEditingBook(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                        <button onClick={() => { if(confirm("Padam buku ini?")) setBooks(prev => prev.filter(b => b.id !== book.id))}} className="p-1.5 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all font-black"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    <h4 className="font-black text-[11px] uppercase mb-1 h-8 overflow-hidden text-indigo-950 font-black">{book.title}</h4>
                    <p className="text-[9px] font-black text-indigo-600 bg-indigo-50 w-fit px-3 py-1 rounded-lg uppercase mb-4 font-black">{book.code}</p>
                    <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center font-black"><span className="text-[8px] font-black text-slate-500 uppercase font-black">STOK:</span><span className={`text-xl font-black ${book.stock < 20 ? 'text-rose-600' : 'text-indigo-950 font-black'}`}>{book.stock}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6 font-black">
              <div className="flex justify-between items-center font-black">
                <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm font-black">
                  {['Guru', 'Murid'].map(type => (
                    <button key={type} onClick={() => setMemberTypeView(type as UserType)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${memberTypeView === type ? 'bg-indigo-600 text-white shadow-md font-black' : 'text-slate-500 font-black'}`}>{type}</button>
                  ))}
                </div>
                <button onClick={() => setIsAddingMember(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-transform active:scale-95 font-black"><Plus size={18}/></button>
              </div>
              {memberTypeView === 'Murid' && (
                <div className="space-y-4 font-black">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 font-black">{YEARS.map(y => <button key={y} onClick={() => {setMemberYearView(y); setMemberClassView('SEMUA');}} className={`min-w-[70px] py-3 rounded-xl font-black text-[10px] border-2 transition-all ${memberYearView === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black' : 'bg-white text-slate-500 font-black'}`}>TAHUN {y}</button>)}</div>
                  {classesConfig[memberYearView].length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 font-black">
                       <button onClick={() => setMemberClassView('SEMUA')} className={`min-w-[80px] py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${memberClassView === 'SEMUA' ? 'bg-slate-800 text-white border-slate-900 font-black' : 'bg-white text-slate-500 font-black'}`}>SEMUA KELAS</button>
                       {classesConfig[memberYearView].map(c => <button key={c} onClick={() => setMemberClassView(c)} className={`min-w-[80px] py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${memberClassView === c ? 'bg-indigo-600 text-white border-indigo-700 font-black' : 'bg-white text-slate-500 font-black'}`}>{c}</button>)}
                    </div>
                  )}
                </div>
              )}
              <div className="relative font-black">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="CARI NAMA AHLI..." className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl border font-black text-[10px] uppercase text-indigo-950 outline-none font-black" value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-black">
                {members.filter(m => 
                  m.type === memberTypeView && 
                  (memberTypeView === 'Guru' || (m.year === memberYearView && (memberClassView === 'SEMUA' || m.className === memberClassView))) && 
                  (searchQuery === '' || m.name.includes(searchQuery))
                ).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                  <div key={m.id} onClick={() => { setSelectedMemberDetail(m); setIsMemberDetailOpen(true); }} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all text-indigo-950 font-black">
                    <div className="flex items-center gap-4 font-black">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black">{m.name.charAt(0)}</div>
                      <div className="overflow-hidden font-black">
                        <h4 className="font-black text-[10px] uppercase truncate w-32 text-indigo-950 font-black">{m.name}</h4>
                        <p className="text-[8px] font-black text-slate-500 mt-1 uppercase italic font-black">
                           {m.type === 'Murid' ? `${m.year} ${m.className || ''} • ` : ''}{getActiveLoans(m.name).length} / {getTotalInventoryForYear(m.year)} PINJAMAN
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 font-black">
              <div className="flex flex-wrap justify-between gap-4 font-black">
                <div className="bg-white p-2 rounded-2xl border flex flex-wrap gap-1 font-black">
                   {MONTHS.map((m, idx) => (
                     <button key={m} onClick={() => setHistoryMonth(idx)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${historyMonth === idx ? 'bg-indigo-600 text-white font-black' : 'text-slate-500 hover:bg-slate-50 font-black'}`}>{m}</button>
                   ))}
                </div>
                <button onClick={handleResetHistory} className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase border border-rose-100 flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all font-black"><RefreshCw size={16}/> RESET</button>
              </div>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl font-black">
                 <div className="p-8 border-b bg-slate-50 flex justify-between items-center font-black">
                    <h3 className="text-xl font-black text-indigo-900 uppercase italic font-black">LOG {MONTHS[historyMonth].toUpperCase()}</h3>
                    <button onClick={() => setIsPrintHistoryOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase flex items-center gap-2 shadow-lg transition-transform active:scale-95 hover:bg-indigo-700 font-black"><Printer size={18}/> PRAPAPAR & CETAK</button>
                 </div>
                 <div className="overflow-x-auto font-black">
                   <table className="w-full text-left font-black">
                     <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-600 border-b font-black">
                       <tr><th className="px-8 py-6 font-black">PENGGUNA (IDENTITI)</th><th className="px-8 py-6 font-black">JUDUL BUKU</th><th className="px-8 py-6 text-center font-black">TINDAKAN</th><th className="px-8 py-6 text-right font-black">TARIKH</th></tr>
                     </thead>
                     <tbody className="divide-y text-[10px] font-bold text-slate-900 font-black">
                       {transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).map(t => (
                         <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors font-black">
                           <td className="px-8 py-5 uppercase font-black">{getMemberInfoText(t.userName)}</td>
                           <td className="px-8 py-5 uppercase truncate max-w-[200px] font-black">{t.bookTitle}</td>
                           <td className="px-8 py-5 text-center font-black">
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${t.action === 'Pinjaman' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                               {t.action}
                             </span>
                           </td>
                           <td className="px-8 py-5 text-right italic text-slate-500 font-black">{t.timestamp}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'damages' && (
            <div className="space-y-6 font-black">
              <div className="flex flex-col sm:flex-row gap-4 font-black">
                <div className="flex-1 bg-white p-8 rounded-3xl border shadow-lg flex items-center gap-6 font-black">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner font-black"><Wallet size={32} /></div>
                  <div className="flex-1 font-black">
                    <p className="text-[9px] font-black text-slate-500 uppercase font-black">DENDA TERKUTIP (TUNAI)</p>
                    <p className="text-4xl font-black text-emerald-600 font-black">RM {transactions.filter(t => t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Tunai').reduce((acc, t) => acc + (t.fineAmount || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={() => setIsPrintDamageReportOpen(true)} className="px-8 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[12px] uppercase shadow-xl flex items-center gap-4 hover:bg-indigo-700 transition-all font-black"><Printer size={32}/>CETAK LAPORAN</button>
              </div>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl font-black">
                <table className="w-full text-left font-black">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black border-b text-slate-600 font-black">
                    <tr><th className="px-8 py-6 font-black">NAMA AHLI (IDENTITI)</th><th className="px-8 py-6 font-black">JUDUL BUKU</th><th className="px-8 py-6 text-center font-black">NILAI</th><th className="px-8 py-6 text-right font-black">STATUS</th></tr>
                  </thead>
                  <tbody className="divide-y text-[10px] font-bold text-slate-900 font-black">
                    {transactions.filter(t => t.status === 'Rosak/Hilang').map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors font-black">
                        <td className="px-8 py-5 uppercase font-black">{getMemberInfoText(t.userName)}</td>
                        <td className="px-8 py-5 uppercase truncate max-w-[200px] text-indigo-900 font-black">{t.bookTitle}</td>
                        <td className="px-8 py-5 text-center text-rose-700 font-black">RM {t.fineAmount?.toFixed(2)}</td>
                        <td className="px-8 py-5 text-right flex justify-end gap-2 font-black">
                          {t.resolutionStatus === 'Tertunggak' ? (
                            <div className="flex gap-2 font-black">
                              <button onClick={() => handleResolveDamage(t.id, 'Tunai')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] uppercase font-black shadow-sm transition-all hover:bg-emerald-700 font-black">TUNAI</button>
                              <button onClick={() => handleResolveDamage(t.id, 'Buku')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[8px] uppercase font-black shadow-sm transition-all hover:bg-indigo-700 font-black">BUKU</button>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] uppercase font-black border font-black">LUNAS</span>
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
            <div className="max-w-xl mx-auto py-10 font-black">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center border-b-[12px] border-indigo-600 font-black">
                <TrendingUp size={64} className="mx-auto text-indigo-600 mb-6 font-black" />
                <h3 className="text-2xl font-black uppercase italic mb-8 text-indigo-950 font-black">Pengurusan Sesi</h3>
                <div className="space-y-4 font-black">
                  <button onClick={handleSessionPromotion} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all font-black"><ArrowUpCircle size={20}/> NAIK KELAS</button>
                  <button onClick={handleSessionReset} className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[11px] border border-rose-100 flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white transition-all font-black"><RotateCcw size={20}/> RESET SEMUA AHLI</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto py-10 space-y-8 text-indigo-950 font-black">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-indigo-100 font-black">
                <div className="flex items-center gap-4 mb-6 font-black">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black">
                    <RefreshCw size={24} />
                  </div>
                  <div className="font-black">
                    <h3 className="text-xl font-black uppercase italic text-indigo-950 font-black">Sinkronasi & Backup Data</h3>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-black">Pindah data antara laptop dan telefon</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-black">
                  <button onClick={handleBackupData} className="flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-indigo-800 transition-all active:translate-y-1 font-black"><Download size={20} /> MUAT TURUN BACKUP</button>
                  <label className="flex items-center justify-center gap-3 px-6 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-b-4 border-emerald-800 transition-all active:translate-y-1 cursor-pointer text-center font-black"><Upload size={20} /> MUAT NAIK BACKUP<input type="file" className="hidden" accept=".json" onChange={handleRestoreData} /></label>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 font-black">
                <h3 className="text-xl font-black uppercase italic mb-8 border-b pb-4 text-indigo-950 font-black">Tetapan Pentadbir</h3>
                <div className="space-y-6 font-black">
                  <div><label className="text-[10px] uppercase text-slate-500 mb-2 block ml-1 font-black">ID PENGGUNA</label><input type="text" className="w-full p-4 border-2 rounded-xl text-indigo-950 bg-slate-50 focus:border-indigo-600 outline-none font-black" value={adminSettings.adminId} onChange={e => setAdminSettings({ ...adminSettings, adminId: e.target.value })} /></div>
                  <div><label className="text-[10px] uppercase text-slate-500 mb-2 block ml-1 font-black">KATA LALUAN</label><input type="text" className="w-full p-4 border-2 rounded-xl text-indigo-950 bg-slate-50 focus:border-indigo-600 outline-none font-black" value={adminSettings.adminPass} onChange={e => setAdminSettings({ ...adminSettings, adminPass: e.target.value })} /></div>
                  <div><label className="text-[10px] uppercase text-slate-500 mb-2 block ml-1 font-black">NAMA SEKOLAH</label><input type="text" className="w-full p-4 border-2 rounded-xl uppercase text-indigo-950 bg-slate-50 focus:border-indigo-600 outline-none font-black" value={adminSettings.schoolName} onChange={e => setAdminSettings({ ...adminSettings, schoolName: e.target.value.toUpperCase() })} /></div>
                  <button onClick={() => { localStorage.setItem('spbt_settings', JSON.stringify(adminSettings)); alert("Simpan!"); }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase shadow-xl font-black tracking-widest hover:bg-indigo-700 font-black">KEMASKINI TETAPAN</button>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-emerald-100 font-black">
                <h3 className="text-xl font-black uppercase italic mb-8 border-b pb-4 text-indigo-950 font-black">Pengurusan Nama Kelas</h3>
                <div className="space-y-6 font-black">
                   <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2 font-black">
                     {YEARS.map(y => (
                       <button key={y} onClick={() => setClassConfigYear(y)} className={`min-w-[70px] py-3 rounded-xl font-black text-[10px] border-2 uppercase transition-all ${classConfigYear === y ? 'bg-indigo-600 text-white border-indigo-700 font-black' : 'bg-slate-50 text-slate-500 font-black'}`}>TAHUN {y}</button>
                     ))}
                   </div>
                   <div className="flex gap-2 font-black">
                     <input type="text" placeholder="CONTOH: AMANAH" className="flex-1 p-4 border-2 rounded-xl font-black uppercase text-[11px] bg-slate-50 outline-none focus:border-indigo-600 font-black" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                     <button onClick={handleAddClass} className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase shadow-lg font-black">TAMBAH</button>
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-black">
                     {classesConfig[classConfigYear].map(c => (
                       <div key={c} className="p-3 bg-indigo-50 border-2 border-indigo-100 rounded-xl flex items-center justify-between font-black">
                         <span className="text-[10px] font-black uppercase text-indigo-900 font-black">{c}</span>
                         <button onClick={() => handleRemoveClass(classConfigYear, c)} className="text-rose-400 hover:text-rose-600 font-black"><Trash2 size={14}/></button>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- PRAPAPAR LAPORAN KOS GANTI (PORTRAIT) --- */}
      {isPrintDamageReportOpen && (
        <div className="fixed inset-0 bg-slate-500/50 backdrop-blur-sm z-[9999] flex flex-col overflow-y-auto print-container portrait-print no-scrollbar font-black">
          <div className="p-4 border-b flex justify-between items-center bg-rose-700 text-white sticky top-0 z-50 no-print shadow-xl font-black">
            <h3 className="text-sm font-black uppercase italic font-black">Prapapar Laporan Kos Ganti (Portrait)</h3>
            <div className="flex gap-4 font-black">
               <button onClick={() => window.print()} className="px-6 py-2 bg-white text-rose-700 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-100 transition-all font-black"><Printer size={14} className="inline mr-2"/> CETAK</button>
               <button onClick={() => setIsPrintDamageReportOpen(false)} className="p-2 text-white/50 hover:text-white transition-all font-black"><X size={24}/></button>
            </div>
          </div>
          <div className="a4-paper-portrait text-black font-black">
             <div className="border-b-4 border-black pb-4 mb-10 text-center font-black">
                <h2 className="text-lg font-bold uppercase text-black font-black">{adminSettings.schoolName}</h2>
                <h1 className="text-2xl font-black uppercase underline mt-2 text-black font-black">REKOD KEROSAKAN & KOS GANTI BUKU TEKS</h1>
             </div>

             {/* SENARAI MURID IKUT TAHUN */}
             {YEARS.map((y, yIdx) => {
               const yearTrans = transactions.filter(t => {
                 const m = members.find(member => member.name === t.userName);
                 return t.status === 'Rosak/Hilang' && m?.year === y && m?.type === 'Murid';
               });
               if (yearTrans.length === 0) return null;

               const classGroups: Record<string, Record<string, Transaction[]>> = {};
               yearTrans.forEach(t => {
                 const m = members.find(member => member.name === t.userName);
                 const className = m?.className || 'TIADA KELAS';
                 if (!classGroups[className]) classGroups[className] = {};
                 if (!classGroups[className][t.userName]) classGroups[className][t.userName] = [];
                 classGroups[className][t.userName].push(t);
               });

               const sortedClassNames = [...(classesConfig[y] || []), 'TIADA KELAS'].filter(name => classGroups[name]);

               return (
                 <div key={y} className={`mb-12 font-black ${yIdx > 0 ? 'page-break-before' : ''}`}>
                   <h3 className="text-xl font-black uppercase border-b-4 border-black mb-6 bg-slate-100 p-3 text-black font-black">TAHUN {y}</h3>
                   {sortedClassNames.map(clsName => (
                     <div key={clsName} className="mb-10 ml-4 font-black">
                        <h4 className="text-lg font-black uppercase mb-4 text-black border-l-8 border-black pl-3 bg-slate-50 font-black">KELAS: {clsName}</h4>
                        {Object.entries(classGroups[clsName]).map(([studentName, list]) => {
                          const total = list.reduce((acc, curr) => {
                            if (curr.resolutionStatus === 'Selesai' && curr.resolutionMethod === 'Buku') return acc;
                            return acc + (curr.fineAmount || 0);
                          }, 0);
                          const isSettled = list.every(t => t.resolutionStatus === 'Selesai');
                          const info = getMemberInfoText(studentName);

                          return (
                            <div key={studentName} className="mb-8 border-2 border-black p-4 ml-2 text-black break-inside-avoid font-black">
                              <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1 font-black">
                                 <h4 className="text-xs font-black uppercase text-black font-black">NAMA PEMINJAM: {info}</h4>
                                 <span className={`text-[10px] font-black uppercase ${isSettled ? 'text-green-600' : 'text-red-600'}`}>STATUS: {isSettled ? 'LUNAS' : 'TUNGGAKAN'}</span>
                              </div>
                              <table className="w-full border-collapse border-2 border-black text-[10px] text-black font-black">
                                <thead>
                                  <tr className="bg-slate-50 font-black">
                                    <th className="border-2 border-black p-2 w-8 uppercase text-black font-black">BIL</th>
                                    <th className="border-2 border-black p-2 text-left uppercase text-black font-black">JUDUL BUKU</th>
                                    <th className="border-2 border-black p-2 w-24 text-center uppercase text-black font-black">HARGA (RM)</th>
                                    <th className="border-2 border-black p-2 w-36 text-center uppercase text-black font-black">CATATAN</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {list.map((t, idx) => {
                                    const showPrice = t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Buku' ? 0 : (t.fineAmount || 0);
                                    return (
                                     <tr key={t.id} className="font-black">
                                       <td className="border-2 border-black p-2 text-center font-bold text-black font-black">{idx + 1}</td>
                                       <td className="border-2 border-black p-2 uppercase font-bold text-black font-black">{t.bookTitle}</td>
                                       <td className="border-2 border-black p-2 text-center font-black text-black font-black">
                                         {showPrice === 0 ? '0.00' : showPrice.toFixed(2)}
                                       </td>
                                       <td className={`border-2 border-black p-2 text-center uppercase font-black text-[9px] font-black ${t.resolutionStatus === 'Selesai' ? 'text-green-700 font-black' : 'text-red-700 font-black'}`}>
                                         {t.resolutionStatus === 'Selesai' ? `LUNAS (${t.resolutionMethod})` : 'TERTUNGGAK'}
                                       </td>
                                     </tr>
                                    );
                                  })}
                                  <tr className="bg-slate-50 font-black">
                                    <td colSpan={2} className="border-2 border-black p-3 text-right uppercase text-black font-black">JUMLAH KOS GANTI:</td>
                                    <td className="border-2 border-black p-3 text-center bg-white text-black underline font-black font-black">RM {total.toFixed(2)}</td>
                                    <td className="border-2 border-black p-3 font-black"></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                     </div>
                   ))}
                 </div>
               );
             })}

             {/* SENARAI GURU DI BAWAH SEKALI */}
             {(() => {
                const teacherTrans = transactions.filter(t => {
                    const m = members.find(member => member.name === t.userName);
                    return t.status === 'Rosak/Hilang' && m?.type === 'Guru';
                });
                if (teacherTrans.length === 0) return null;

                const teacherGroups: Record<string, Transaction[]> = {};
                teacherTrans.forEach(t => {
                    if (!teacherGroups[t.userName]) teacherGroups[t.userName] = [];
                    teacherGroups[t.userName].push(t);
                });

                return (
                    <div className="mt-16 font-black page-break-before">
                        <h3 className="text-xl font-black uppercase border-b-4 border-black mb-6 bg-slate-200 p-3 text-black font-black">BAHAGIAN GURU</h3>
                        {Object.entries(teacherGroups).map(([teacherName, list]) => {
                            const total = list.reduce((acc, curr) => {
                                if (curr.resolutionStatus === 'Selesai' && curr.resolutionMethod === 'Buku') return acc;
                                return acc + (curr.fineAmount || 0);
                            }, 0);
                            const isSettled = list.every(t => t.resolutionStatus === 'Selesai');

                            return (
                                <div key={teacherName} className="mb-8 border-2 border-black p-4 ml-2 text-black break-inside-avoid font-black">
                                    <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1 font-black">
                                        <h4 className="text-xs font-black uppercase text-black font-black">NAMA PEMINJAM: {getMemberInfoText(teacherName)}</h4>
                                        <span className={`text-[10px] font-black uppercase ${isSettled ? 'text-green-600' : 'text-red-600'}`}>STATUS: {isSettled ? 'LUNAS' : 'TUNGGAKAN'}</span>
                                    </div>
                                    <table className="w-full border-collapse border-2 border-black text-[10px] text-black font-black">
                                        <thead>
                                            <tr className="bg-slate-50 font-black">
                                                <th className="border-2 border-black p-2 w-8 uppercase text-black font-black">BIL</th>
                                                <th className="border-2 border-black p-2 text-left uppercase text-black font-black">JUDUL BUKU</th>
                                                <th className="border-2 border-black p-2 w-24 text-center uppercase text-black font-black">HARGA (RM)</th>
                                                <th className="border-2 border-black p-2 w-36 text-center uppercase text-black font-black">CATATAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {list.map((t, idx) => {
                                                const showPrice = t.resolutionStatus === 'Selesai' && t.resolutionMethod === 'Buku' ? 0 : (t.fineAmount || 0);
                                                return (
                                                    <tr key={t.id} className="font-black">
                                                        <td className="border-2 border-black p-2 text-center font-bold text-black font-black">{idx + 1}</td>
                                                        <td className="border-2 border-black p-2 uppercase font-bold text-black font-black">{t.bookTitle}</td>
                                                        <td className="border-2 border-black p-2 text-center font-black text-black font-black">{showPrice.toFixed(2)}</td>
                                                        <td className={`border-2 border-black p-2 text-center uppercase font-black text-[9px] font-black ${t.resolutionStatus === 'Selesai' ? 'text-green-700 font-black' : 'text-red-700 font-black'}`}>{t.resolutionStatus === 'Selesai' ? `LUNAS (${t.resolutionMethod})` : 'TERTUNGGAK'}</td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-slate-50 font-black">
                                                <td colSpan={2} className="border-2 border-black p-3 text-right uppercase text-black font-black">JUMLAH KOS GANTI:</td>
                                                <td className="border-2 border-black p-3 text-center bg-white text-black underline font-black font-black">RM {total.toFixed(2)}</td>
                                                <td className="border-2 border-black p-3 font-black"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                );
             })()}
          </div>
        </div>
      )}

      {/* --- PRAPAPAR BORANG MURID (LANDSCAPE) --- */}
      {isPrintFormOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-slate-500/50 backdrop-blur-sm z-[9999] flex flex-col overflow-y-auto print-container landscape-print no-scrollbar font-black">
          <div className="p-4 border-b flex justify-between items-center bg-indigo-950 text-white sticky top-0 z-50 no-print font-black shadow-xl">
            <h3 className="text-sm font-black uppercase italic font-black">Prapapar Borang Murid (Melintang)</h3>
            <div className="flex gap-4 font-black">
               <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg transition-transform active:scale-95 hover:bg-emerald-700 font-black"><Printer size={14} className="inline mr-2"/> CETAK</button>
               <button onClick={() => setIsPrintFormOpen(false)} className="p-2 text-white/50 hover:text-white transition-all font-black"><X size={24}/></button>
            </div>
          </div>
          <div className="a4-paper-landscape text-black font-black">
             <div className="border-b-2 border-black pb-4 mb-6 text-center text-black font-black">
                <h2 className="text-lg font-bold uppercase text-black leading-tight font-black">{adminSettings.schoolName}</h2>
                <h1 className="text-2xl font-black uppercase underline text-black font-black">REKOD PINJAMAN & PEMULANGAN BUKU TEKS (SPBT)</h1>
                <h3 className="text-md font-bold mt-1 uppercase text-black font-black">TAHUN {selectedMemberDetail.year} {selectedMemberDetail.className} | SESI {new Date().getFullYear()}</h3>
             </div>
             
             <div className="mb-4 text-[10px] font-bold uppercase text-black flex justify-between font-black">
                <div className="flex gap-2 items-center flex-1 font-black">NAMA MURID: <span className="border-b-2 border-black flex-1 font-black px-2 font-black">{selectedMemberDetail.name}</span></div>
                <div className="w-12"></div>
                <div className="flex gap-2 items-center w-64 font-black">TARIKH: <span className="border-b-2 border-black flex-1 font-black px-2 text-right font-black">{new Date().toLocaleDateString('ms-MY')}</span></div>
             </div>

             <table className="w-full border-collapse border-2 border-black text-[9px] text-black table-fixed font-black">
                <colgroup>
                    <col style={{width: '35px'}} />
                    <col style={{width: '90px'}} />
                    <col style={{width: 'auto'}} />
                    <col style={{width: '60px'}} />
                    <col style={{width: '180px'}} />
                    <col style={{width: '100px'}} />
                    <col style={{width: '100px'}} />
                    <col style={{width: '110px'}} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 font-black">
                    <th className="border-2 border-black p-2 uppercase text-center font-black">BIL</th>
                    <th className="border-2 border-black p-2 uppercase text-center font-black">KOD</th>
                    <th className="border-2 border-black p-2 text-left uppercase pl-2 font-black">JUDUL BUKU (1 BARIS)</th>
                    <th className="border-2 border-black p-2 uppercase text-center font-black">RM</th>
                    <th className="border-2 border-black p-2 uppercase text-center font-black">NO SIRI/PEROLEHAN</th>
                    <th className="border-2 border-black p-2 uppercase text-center font-black">T.TERIMA</th>
                    <th className="border-2 border-black p-2 uppercase text-center font-black">T.PULANG</th>
                    <th className="border-2 border-black p-2 uppercase text-center font-black">CATATAN/STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-100 font-black"><td colSpan={8} className="border-2 border-black px-4 py-1.5 font-black text-center uppercase text-[11px] bg-slate-200">BAHAGIAN 1: BUKU TEKS (WAJIB DIPULANGKAN)</td></tr>
                  {books.filter(b => b.year === selectedMemberDetail.year && b.type === 'Buku Teks').map((b, idx) => {
                    const data = editableFormData[b.id] || { serial: '', receivedDate: '', returnDate: '', status: '' };
                    const isDamaged = data.status.toUpperCase().includes('ROSAK') || data.status.toUpperCase().includes('HILANG');
                    return (
                      <tr key={b.id} className="h-8 font-black">
                        <td className="border-2 border-black p-1 text-center font-bold text-black font-black">{idx + 1}</td>
                        <td className="border-2 border-black p-1 text-center font-black text-black font-black">{b.code}</td>
                        <td className="border-2 border-black p-1 font-bold uppercase pl-2 text-black font-black">
                           <div className="truncate whitespace-nowrap overflow-hidden" style={{maxWidth: '350px'}}>{b.title}</div>
                        </td>
                        <td className="border-2 border-black p-1 text-center font-bold text-black font-black">{b.price.toFixed(2)}</td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.serial} onChange={e => handleUpdateFormData(b.id, 'serial', e.target.value.toUpperCase())} className="w-full h-full text-center font-black text-[10px] outline-none bg-transparent uppercase text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.receivedDate} onChange={e => handleUpdateFormData(b.id, 'receivedDate', e.target.value)} className="w-full h-full text-center text-[10px] outline-none bg-transparent text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.returnDate} onChange={e => handleUpdateFormData(b.id, 'returnDate', e.target.value)} className="w-full h-full text-center text-[10px] outline-none bg-transparent text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.status} onChange={e => handleUpdateFormData(b.id, 'status', e.target.value.toUpperCase())} className="w-full h-full text-center font-black text-[8px] outline-none bg-transparent uppercase" style={{ color: isDamaged ? '#ef4444' : '#000' }} placeholder="BAIK/ROSAK/HILANG" /></td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-black"><td colSpan={8} className="border-2 border-black px-4 py-1.5 font-black text-center uppercase text-[11px] bg-slate-200">BAHAGIAN 2: BUKU AKTIVITI (TIDAK PERLU PULANG)</td></tr>
                  {books.filter(b => b.year === selectedMemberDetail.year && b.type === 'Buku Aktiviti').map((b, idx) => {
                    const data = editableFormData[b.id] || { serial: '', receivedDate: '', returnDate: '', status: '' };
                    return (
                      <tr key={b.id} className="h-8 font-black">
                        <td className="border-2 border-black p-1 text-center font-bold text-black font-black">{idx + 1}</td>
                        <td className="border-2 border-black p-1 text-center font-black text-black font-black">{b.code}</td>
                        <td className="border-2 border-black p-1 font-bold uppercase pl-2 text-black font-black">
                           <div className="truncate whitespace-nowrap overflow-hidden" style={{maxWidth: '350px'}}>{b.title}</div>
                        </td>
                        <td className="border-2 border-black p-1 text-center font-bold text-black font-black">{b.price.toFixed(2)}</td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.serial} onChange={e => handleUpdateFormData(b.id, 'serial', e.target.value.toUpperCase())} className="w-full h-full text-center font-black text-[10px] outline-none bg-transparent uppercase text-black" /></td>
                        <td className="border-2 border-black p-0"><input type="text" value={data.receivedDate} onChange={e => handleUpdateFormData(b.id, 'receivedDate', e.target.value)} className="w-full h-full text-center text-[10px] outline-none bg-transparent text-black" /></td>
                        <td colSpan={2} className="border-2 border-black p-1 text-center italic text-[9px] font-black uppercase bg-slate-50 text-black font-black">MILIK PERIBADI MURID</td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>

             <div className="mt-8 grid grid-cols-2 gap-10 text-black font-black">
                <div className="border-2 border-black p-4 rounded-lg bg-slate-50 font-black">
                    <p className="text-[10px] font-black uppercase mb-1 font-black">AKUAN PENERIMAAN:</p>
                    <p className="text-[8px] leading-tight mb-8 font-black">Saya telah menerima buku-buku tersebut dalam keadaan baik dan berjanji akan menjaganya dengan baik.</p>
                    <div className="flex justify-between items-end font-black">
                        <div className="text-center w-40 font-black">
                            <div className="border-b-2 border-black w-full mb-1"></div>
                            <p className="text-[8px] font-bold text-black font-black">( IBU BAPA / PENJAGA )</p>
                        </div>
                        <div className="text-right italic text-[8px] text-black font-black">Tarikh: ...........................</div>
                    </div>
                </div>
                <div className="border-2 border-black p-4 rounded-lg bg-slate-50 font-black">
                    <p className="text-[10px] font-black uppercase mb-1 font-black">PENGESAHAN PENYELARAS:</p>
                    <p className="text-[8px] leading-tight mb-8 font-black">Urusan direkodkan secara elektronik dalam E-SPBT PINTAR.</p>
                    <div className="flex justify-between items-end font-black">
                        <div className="text-center w-40 font-black">
                            <div className="border-b-2 border-black w-full mb-1"></div>
                            <p className="text-[8px] font-bold text-black font-black">( COP & TANDATANGAN )</p>
                        </div>
                        <div className="text-right italic text-[8px] text-black font-black">Unit SPBT {adminSettings.schoolName}</div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- PRAPAPAR LOG REKOD BULANAN (PORTRAIT) --- */}
      {isPrintHistoryOpen && (
        <div className="fixed inset-0 bg-slate-500/50 backdrop-blur-sm z-[9999] flex flex-col overflow-y-auto print-container portrait-print no-scrollbar font-black">
          <div className="p-4 border-b flex justify-between items-center bg-indigo-950 text-white sticky top-0 z-[100] no-print shadow-xl font-black">
            <div className="flex items-center gap-3 font-black">
               <History size={20} className="text-indigo-400" />
               <h3 className="text-sm font-black uppercase italic font-black">Prapapar Log Rekod (Portrait)</h3>
            </div>
            <div className="flex gap-4 font-black">
               <button onClick={() => window.print()} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase shadow-lg transition-all hover:bg-emerald-700 font-black"><Printer size={16}/> CETAK SEKARANG</button>
               <button onClick={() => setIsPrintHistoryOpen(false)} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><X size={20}/></button>
            </div>
          </div>
          
          <div className="a4-paper-portrait text-black font-black">
             <div className="border-b-4 border-black pb-8 mb-10 text-center font-black">
                <p className="text-md font-bold uppercase mb-1 font-black">{adminSettings.schoolName}</p>
                <h1 className="text-2xl font-black uppercase underline font-black">LOG TRANSAKSI BUKU TEKS ELEKTRONIK</h1>
                <p className="text-sm font-black mt-3 uppercase italic font-black">BAGI BULAN: {MONTHS[historyMonth].toUpperCase()} {new Date().getFullYear()}</p>
             </div>

             <div className="mb-6 flex justify-between items-end text-[10px] font-bold uppercase text-black font-black font-black">
                <div className="font-black">
                   <p className="font-black">Dijana oleh: {adminSettings.adminName}</p>
                   <p className="font-black">Tarikh: {new Date().toLocaleDateString('ms-MY')}</p>
                </div>
                <div className="text-right font-black">
                   <p className="font-black">Jumlah: {transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).length} Rekod</p>
                </div>
             </div>

             <table className="w-full border-collapse border-2 border-black text-[11px] text-black font-black">
                <thead>
                  <tr className="bg-slate-100 font-black">
                    <th className="border-2 border-black p-3 text-center w-12 uppercase font-black">BIL</th>
                    <th className="border-2 border-black p-3 text-left uppercase font-black">AHLI / GURU (IDENTITI LENGKAP)</th>
                    <th className="border-2 border-black p-3 text-left uppercase font-black">JUDUL BUKU</th>
                    <th className="border-2 border-black p-3 text-center w-24 uppercase font-black">TINDAKAN</th>
                    <th className="border-2 border-black p-3 text-right w-32 uppercase font-black">TARIKH & MASA</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).length > 0 ? (
                    transactions.filter(t => new Date(t.createdAt).getMonth() === historyMonth).map((t, idx) => (
                      <tr key={t.id} className="text-black font-black">
                        <td className="border-2 border-black p-3 text-center font-bold text-black font-black">{idx + 1}</td>
                        <td className="border-2 border-black p-3 font-black uppercase text-black font-black">{getMemberInfoText(t.userName)}</td>
                        <td className="border-2 border-black p-3 font-bold uppercase text-black font-black">
                           <div className="truncate whitespace-nowrap overflow-hidden" style={{maxWidth: '220px'}}>{t.bookTitle}</div>
                        </td>
                        <td className="border-2 border-black p-3 text-center font-black uppercase italic text-black font-black">{t.action}</td>
                        <td className="border-2 border-black p-3 text-right font-medium text-black font-black">{t.timestamp}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="font-black">
                      <td colSpan={5} className="border-2 border-black p-10 text-center font-bold italic uppercase opacity-50 text-black font-black">Tiada rekod transaksi dijumpai.</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* MODALS DAN LAIN-LAIN (TIDAK BERUBAH) */}
      {isMemberDetailOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 no-print font-black">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-b-[15px] border-indigo-600 font-black">
            <div className="p-8 border-b bg-indigo-50/50 flex justify-between items-center text-indigo-950 font-black">
              <div className="flex items-center gap-4 font-black">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 font-black">{selectedMemberDetail.name.charAt(0)}</div>
                <div className="font-black">
                   <h3 className="text-xl font-black uppercase italic leading-none font-black">{selectedMemberDetail.name}</h3>
                   <p className="text-[9px] font-black text-indigo-700 uppercase mt-2 font-black">
                      {selectedMemberDetail.type} {selectedMemberDetail.year ? `• TAHUN ${selectedMemberDetail.year} ${selectedMemberDetail.className || ''}` : ''}
                   </p>
                </div>
              </div>
              <div className="flex gap-2 font-black">
                <button onClick={() => { setMemberToEdit({ ...selectedMemberDetail }); setIsEditingMember(true); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg font-black"><Edit2 size={20}/></button>
                <button onClick={() => setIsMemberDetailOpen(false)} className="p-2 text-slate-300 hover:text-rose-500 font-black"><X size={20}/></button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-4 no-scrollbar text-indigo-950 font-black">
              <div className="grid grid-cols-2 gap-2 font-black">
                 <button onClick={() => { setBorrowFilterYear(selectedMemberDetail.year || 1); setIsBorrowModalOpen(true); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg transition-transform active:scale-95 font-black"><Plus className="inline mr-1" size={14}/> PINJAM BARU</button>
                 {selectedMemberDetail.type === 'Murid' && <button onClick={() => setIsPrintFormOpen(true)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg transition-transform active:scale-95 font-black"><FileText className="inline mr-1" size={14}/> CETAK BORANG</button>}
              </div>
              <div className="border-t pt-4 font-black">
                <h4 className="text-[10px] font-black uppercase italic text-indigo-950 mb-4 font-black">Pinjaman Aktif</h4>
                <div className="space-y-2 font-black">
                  {getActiveLoans(selectedMemberDetail.name).map(loan => (
                    <div key={loan.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between font-black">
                      <p className="font-black text-indigo-950 text-[10px] uppercase truncate flex-1 pr-4 font-black">{loan.bookTitle}</p>
                      <div className="flex gap-2 font-black">
                        <button onClick={() => handleAction(loan.bookId, 'Pemulangan', selectedMemberDetail.name, selectedMemberDetail.type)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-[8px] uppercase font-black">PULANG</button>
                        <button onClick={() => handleAction(loan.bookId, 'Pulang Rosak/Hilang', selectedMemberDetail.name, selectedMemberDetail.type)} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-500 hover:text-white transition-all font-black"><AlertTriangle size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {getActiveLoans(selectedMemberDetail.name).length === 0 && <p className="text-center py-10 opacity-60 text-[10px] font-black italic text-indigo-950 uppercase font-black">Tiada pinjaman aktif.</p>}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center font-black">
              <button onClick={() => { if(confirm("Padam ahli?")) { setMembers(prev => prev.filter(m => m.id !== selectedMemberDetail.id)); setIsMemberDetailOpen(false); }}} className="text-rose-600 text-[9px] font-black uppercase flex items-center gap-2 hover:text-rose-800 font-black"><Trash2 size={16}/> PADAM AHLI</button>
              <button onClick={() => setIsMemberDetailOpen(false)} className="px-6 py-3 bg-white border rounded-xl text-[9px] font-black uppercase text-indigo-950 shadow-sm font-black">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      {(isAddingBook || isEditingBook) && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 no-print font-black">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 border-b-[15px] border-indigo-600 shadow-2xl text-indigo-950 animate-in zoom-in duration-200 font-black">
            <h3 className="text-xl font-black uppercase italic mb-8 font-black">Data Inventori Buku</h3>
            <div className="space-y-6 text-indigo-950 font-black">
              <div className="font-black">
                <label className="text-[9px] font-black uppercase text-indigo-700 mb-1 block ml-1 font-black">KOD BUKU (BT/BA)</label>
                <input type="text" className="w-full p-4 border-2 rounded-xl font-black uppercase text-[11px] bg-slate-50 outline-none focus:border-indigo-600 text-indigo-950 font-black" value={isAddingBook ? newBook.code : bookToEdit?.code} onChange={e => isAddingBook ? setNewBook({...newBook, code: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, code: e.target.value.toUpperCase()})} />
              </div>
              <div className="font-black">
                <label className="text-[9px] font-black uppercase text-indigo-700 mb-1 block ml-1 font-black">JUDUL BUKU PENUH</label>
                <input type="text" className="w-full p-4 border-2 rounded-xl font-black uppercase text-[11px] bg-slate-50 outline-none focus:border-indigo-600 text-indigo-950 font-black" value={isAddingBook ? newBook.title : bookToEdit?.title} onChange={e => isAddingBook ? setNewBook({...newBook, title: e.target.value.toUpperCase()}) : setBookToEdit({...bookToEdit!, title: e.target.value.toUpperCase()})} />
              </div>
              <div className="grid grid-cols-2 gap-4 font-black">
                <div className="font-black">
                  <label className="text-[9px] font-black uppercase text-indigo-700 mb-1 block ml-1 font-black">TAHUN</label>
                  <select className="w-full p-4 border-2 rounded-xl font-black text-[11px] bg-slate-50 outline-none text-indigo-950 font-black" value={isAddingBook ? newBook.year : bookToEdit?.year} onChange={e => isAddingBook ? setNewBook({...newBook, year: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, year: Number(e.target.value)})}>{YEARS.map(y => <option key={y} value={y} className="font-black">TAHUN {y}</option>)}</select>
                </div>
                <div className="font-black">
                  <label className="text-[9px] font-black uppercase text-emerald-700 mb-1 block ml-1 font-black">HARGA (RM)</label>
                  <input type="number" step="0.01" className="w-full p-4 border-2 border-emerald-200 rounded-xl font-black text-[11px] bg-emerald-50 text-indigo-950 outline-none font-black" value={isAddingBook ? newBook.price : bookToEdit?.price} onChange={e => isAddingBook ? setNewBook({...newBook, price: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, price: Number(e.target.value)})} />
                </div>
              </div>
              <div className="font-black">
                <label className="text-[9px] font-black uppercase text-blue-700 mb-1 block ml-1 font-black">JUMLAH STOK (UNIT)</label>
                <input type="number" className="w-full p-4 border-2 border-blue-200 rounded-xl font-black text-[11px] bg-blue-50 text-indigo-950 outline-none focus:border-blue-600 font-black" value={isAddingBook ? newBook.stock : bookToEdit?.stock} onChange={e => isAddingBook ? setNewBook({...newBook, stock: Number(e.target.value)}) : setBookToEdit({...bookToEdit!, stock: Number(e.target.value)})} />
              </div>
              <button onClick={isAddingBook ? handleAddNewBook : handleUpdateBook} className="w-full py-5 bg-indigo-600 text-white rounded-2xl uppercase font-black shadow-xl tracking-widest transition-transform active:scale-95 font-black">SIMPAN DATA BUKU</button>
              <button onClick={() => { setIsAddingBook(false); setIsEditingBook(false); }} className="w-full py-2 text-slate-500 uppercase text-[9px] font-black">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {isAddingMember && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 font-black">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 border-b-[15px] border-indigo-600 shadow-2xl text-indigo-950 animate-in zoom-in duration-200 font-black">
            <h3 className="text-xl font-black uppercase italic mb-8 font-black">Pendaftaran Ahli Baru</h3>
            <div className="space-y-6 text-indigo-950 font-black">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl font-black">
                {['Guru', 'Murid'].map(t => (
                  <button key={t} onClick={() => setNewMember({...newMember, type: t as UserType})} className={`flex-1 py-3 rounded-lg font-black text-[9px] uppercase transition-all ${newMember.type === t ? 'bg-indigo-600 text-white shadow-md font-black' : 'text-slate-600 font-black'}`}>{t}</button>
                ))}
              </div>
              <div className="font-black">
                <label className="text-[9px] font-black uppercase text-indigo-700 mb-1 block ml-1 font-black">NAMA PENUH</label>
                <input type="text" className="w-full px-5 py-4 rounded-xl border-2 font-black uppercase text-[11px] bg-slate-50 outline-none text-indigo-950 font-black" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value.toUpperCase()})} />
              </div>
              {newMember.type === 'Murid' && (
                <div className="space-y-4 font-black">
                  <div className="font-black">
                    <label className="text-[9px] font-black uppercase text-indigo-700 mb-1 block ml-1 font-black">TAHUN</label>
                    <div className="flex gap-2 font-black">
                      {YEARS.map(y => <button key={y} onClick={() => setNewMember({...newMember, year: y, className: ''})} className={`flex-1 py-3 rounded-xl border-2 font-black text-[11px] font-black ${newMember.year === y ? 'bg-indigo-600 text-white font-black' : 'bg-slate-50 text-slate-600 font-black'}`}>{y}</button>)}
                    </div>
                  </div>
                  {classesConfig[newMember.year || 1].length > 0 && (
                    <div className="font-black">
                      <label className="text-[9px] font-black uppercase text-indigo-700 mb-1 block ml-1 font-black">PILIH KELAS</label>
                      <select className="w-full p-4 border-2 rounded-xl font-black text-[11px] bg-slate-50 outline-none uppercase text-indigo-950 font-black" value={newMember.className} onChange={e => setNewMember({...newMember, className: e.target.value})}>
                        <option value="" className="font-black">- PILIH KELAS -</option>
                        {classesConfig[newMember.year || 1].map(c => <option key={c} value={c} className="font-black">{c}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleAddMember} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl transition-transform active:scale-95 font-black">DAFTAR AHLI SEKARANG</button>
              <button onClick={() => setIsAddingMember(false)} className="w-full py-3 text-slate-500 uppercase text-[9px] font-black">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {isBorrowModalOpen && selectedMemberDetail && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 no-print font-black">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col border-b-[15px] border-indigo-600 text-indigo-950 animate-in zoom-in duration-300 font-black">
            <div className="p-8 border-b flex justify-between items-center font-black">
              <div className="font-black">
                 <h3 className="text-xl font-black uppercase italic font-black">Pilihan Buku Pinjaman</h3>
                 <p className="text-[10px] font-black text-indigo-600 mt-1 uppercase italic font-black">{selectedMemberDetail.name}</p>
              </div>
              <button onClick={() => {setIsBorrowModalOpen(false); setSelectedBooksToBorrow(new Set());}} className="text-slate-300 hover:text-rose-500 transition-all font-black"><X size={28}/></button>
            </div>
            <div className="px-8 pt-6 font-black">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 font-black">
                {YEARS.map(y => <button key={y} onClick={() => setBorrowFilterYear(y)} className={`min-w-[70px] py-2.5 rounded-lg font-black text-[10px] border-2 uppercase transition-all font-black ${borrowFilterYear === y ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black' : 'bg-slate-50 text-slate-600 font-black'}`}>TAHUN {y}</button>)}
              </div>
            </div>
            <div className="p-8 pt-4 overflow-y-auto max-h-[45vh] grid grid-cols-1 md:grid-cols-2 gap-3 no-scrollbar text-indigo-950 font-black">
              {books.filter(b => b.year === borrowFilterYear).map(book => {
                const isSelected = selectedBooksToBorrow.has(book.id);
                const isAlreadyBorrowed = getActiveLoans(selectedMemberDetail.name).some(l => l.bookId === book.id);
                return (
                  <div key={book.id} onClick={isAlreadyBorrowed ? undefined : () => { const s = new Set(selectedBooksToBorrow); s.has(book.id) ? s.delete(book.id) : s.add(book.id); setSelectedBooksToBorrow(s); }} className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center font-black ${isAlreadyBorrowed ? 'bg-slate-100 opacity-60 font-black' : isSelected ? 'bg-indigo-600 text-white shadow-md font-black' : 'bg-white hover:border-indigo-300 cursor-pointer font-black'}`}>
                    <div className="overflow-hidden flex-1 text-indigo-950 font-black"><h4 className={`font-black text-[10px] uppercase truncate font-black ${isSelected ? 'text-white font-black' : 'text-indigo-950 font-black'}`}>{book.title}</h4><p className={`text-[8px] uppercase mt-1 font-black ${isSelected ? 'text-white/70 font-black' : 'text-slate-600 font-black'}`}>{book.code} • {isAlreadyBorrowed ? 'SUDAH PINJAM' : `STOK: ${book.stock}`}</p></div>
                    {isSelected && <CheckCircle size={16} className="text-white font-black"/>}{isAlreadyBorrowed && <Lock size={14} className="font-black"/>}
                  </div>
                );
              })}
            </div>
            <div className="p-8 border-t flex items-center justify-between bg-slate-50 font-black">
              <span className="text-[11px] font-black uppercase italic text-indigo-950 tracking-widest font-black">{selectedBooksToBorrow.size} UNIT DIPILIH</span>
              <button onClick={() => { 
                Array.from(selectedBooksToBorrow).forEach((id: any) => handleAction(id, 'Pinjaman', selectedMemberDetail.name, selectedMemberDetail.type)); 
                setIsBorrowModalOpen(false); 
                setSelectedBooksToBorrow(new Set()); 
              }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase shadow-xl transition-transform active:scale-95 font-black" disabled={selectedBooksToBorrow.size === 0}>SAHKAN PINJAMAN</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;