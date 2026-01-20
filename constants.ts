
import { Book } from './types';

const generateBooks = (): Book[] => {
  const books: Book[] = [];
  const subjects = [
    { name: 'Bahasa Melayu', code: 'BM', price: 15.50 },
    { name: 'English', code: 'BI', price: 18.20 },
    { name: 'Matematik', code: 'MAT', price: 12.00 },
    { name: 'Sains', code: 'SC', price: 14.50 },
    { name: 'Pendidikan Islam', code: 'PI', price: 10.00 },
    { name: 'Pendidikan Moral', code: 'PM', price: 10.00 },
    { name: 'Sejarah', code: 'SEJ', price: 13.00 },
    { name: 'RBT', code: 'RBT', price: 11.50 },
  ];

  for (let year = 1; year <= 6; year++) {
    subjects.forEach((sub) => {
      const isUpper = year >= 4;
      
      if (['BM', 'BI', 'MAT', 'SC', 'PI', 'PM'].includes(sub.code)) {
        books.push({
          id: `${year}-bt-${sub.code.toLowerCase()}`,
          title: `Buku Teks ${sub.name} Tahun ${year}`,
          year: year,
          type: 'Buku Teks',
          stock: 100,
          subject: sub.code,
          price: sub.price
        });
        books.push({
          id: `${year}-ba-${sub.code.toLowerCase()}`,
          title: `Buku Aktiviti ${sub.name} Tahun ${year}`,
          year: year,
          type: 'Buku Aktiviti',
          stock: 50,
          subject: sub.code,
          price: sub.price * 0.5
        });
      }

      if (isUpper && ['SEJ', 'RBT'].includes(sub.code)) {
        books.push({
          id: `${year}-bt-${sub.code.toLowerCase()}`,
          title: `Buku Teks ${sub.name} Tahun ${year}`,
          year: year,
          type: 'Buku Teks',
          stock: 100,
          subject: sub.code,
          price: sub.price
        });
      }
    });
  }
  return books;
};

export const INITIAL_BOOKS: Book[] = generateBooks();
export const YEARS = [1, 2, 3, 4, 5, 6];
export const CATEGORIES: ('Buku Teks' | 'Buku Aktiviti')[] = ['Buku Teks', 'Buku Aktiviti'];
