import { GoogleGenAI } from "@google/genai";
import { Book, Transaction, Member } from "../types";

export const getStockInsight = async (books: Book[], transactions: Transaction[]) => {
  const prompt = `
    Anda adalah asisten AI untuk pengurusan buku teks sekolah di Malaysia. 
    Berikut adalah data stok semasa: ${JSON.stringify(books)}
    Berikut adalah transaksi pinjaman terakhir: ${JSON.stringify(transactions)}
    
    Berikan rumusan ringkas dalam Bahasa Melayu tentang:
    1. Buku mana yang stoknya kritikal (kurang dari 20 unit).
    2. Trend peminjaman terkini.
    3. Cadangan tindakan untuk admin (e.g. buat pesanan baru atau pelarasan stok).
    Pastikan jawapan dalam format markdown yang kemas dan profesional.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem AI sedang sibuk. Sila cuba lagi nanti.";
  }
};

export const extractMembersFromFile = async (fileData: string, mimeType: string) => {
  const prompt = `
    Anda adalah pakar pemprosesan data pendidikan Malaysia.
    Tugas: Ekstrak senarai murid daripada dokumen ini secara tepat.
    
    Format Output: Mesti dalam format JSON ARRAY sahaja.
    Setiap objek mesti mengandungi: 
    - "name": Nama penuh murid (HURUF BESAR). Bersihkan gelaran atau no. ID jika ada.
    - "year": Nombor tahun (1, 2, 3, 4, 5, atau 6).
    - "className": Nama kelas (HURUF BESAR, contoh: AMANAH, BIJAK).
    
    Peraturan:
    1. Jika tahun tidak dinyatakan, anggap Tahun 1.
    2. Jika kelas tidak dinyatakan, biarkan className sebagai string kosong.
    3. Pastikan tiada teks tambahan sebelum atau selepas JSON.
    
    Fail ini mungkin dalam bentuk jadual atau senarai bertulis. Analisis dengan teliti.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      }
    });

    const text = response.text || "[]";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText) as Partial<Member>[];
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Gagal mengekstrak data. Sila pastikan dokumen jelas (format PDF atau Gambar).");
  }
};
