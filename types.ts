export type BookType = 'Buku Teks' | 'Buku Aktiviti' | 'Buku Latihan' | 'Rujukan' | 'Lain-lain';
export type UserType = 'Guru' | 'Murid';
export type TransactionStatus = 'Menunggu' | 'Berjaya' | 'Dipulangkan' | 'Rosak/Hilang';
export type ResolutionStatus = 'Tertunggak' | 'Selesai';
export type ResolutionMethod = 'Buku' | 'Tunai';
export type ActionType = 'Pinjaman' | 'Pemulangan' | 'Pulang Rosak/Hilang' | 'Terima Stok' | 'Rekod Rosak' | 'Pelarasan Manual';

export interface AdminSettings {
  schoolName: string;
  adminName: string;
  adminId: string;
  adminPass: string;
  isRegistered: boolean;
}

export interface Book {
  id: string;
  title: string;
  code: string; // Kod unik buku (e.g. BT001)
  year: number;
  type: BookType;
  stock: number;
  subject: string;
  price: number; 
}

export interface Member {
  id: string;
  name: string;
  type: UserType;
  year?: number; 
  className?: string; // Menambah nama kelas
}

export interface Transaction {
  id: string;
  bookId: string;
  bookTitle: string;
  userName: string;
  userType: UserType;
  quantity: number;
  timestamp: string;
  createdAt: number;
  status: TransactionStatus;
  action: ActionType;
  noPerolehan?: string; 
  fineAmount?: number;
  resolutionStatus?: ResolutionStatus;
  resolutionMethod?: ResolutionMethod;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  isRead: boolean;
}