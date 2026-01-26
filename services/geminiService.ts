import { GoogleGenAI, Type } from "@google/genai";
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
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem AI sedang sibuk. Sila cuba lagi nanti.";
  }
};

export const extractMembersFromFile = async (fileData: string, mimeType: string) => {
  const prompt = `TUGAS: Anda adalah robot pengekstrak data OCR yang sangat teliti. Ekstrak senarai nama murid daripada dokumen ini.

SOP KETAT (WAJIB PATUH):
1. CARI "GLOBAL YEAR": Lihat pada tajuk besar dokumen atau bahagian atas (Header). Jika tertulis "TAHUN 1" atau "DARJAH 1", maka SEMUA murid dalam fail ini MESTI diletakkan sebagai Year: 1.
2. DILARANG KERAS menukar tahun secara rawak (seperti 1, 2, 3...) mengikut baris. Jika dokumen itu dokumen Tahun 1, pastikan output SEMUA rekod adalah tahun 1.
3. NAMA MURID: Ekstrak dengan ejaan tepat dalam HURUF BESAR.
4. KELAS: Jika tajuk dokumen menyatakan nama kelas (contoh: "1 AMANAH"), gunakan "AMANAH" untuk semua murid tersebut kecuali jika ada kolum kelas yang berbeza bagi setiap baris.
5. Jika tiada maklumat tahun dikesan langsung, gunakan nilai default: 1.
6. JANGAN REKA DATA. Jika ada 20 nama, pulangkan 20 objek sahaja.

OUTPUT: Mesti dalam JSON Array.`;

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
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Nama penuh murid (HURUF BESAR).",
              },
              year: {
                type: Type.INTEGER,
                description: "Angka tahun 1-6 sahaja. Mesti konsisten dengan konteks dokumen.",
              },
              className: {
                type: Type.STRING,
                description: "Nama kelas (HURUF BESAR).",
              }
            },
            required: ["name", "year", "className"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);
    
    if (!Array.isArray(data)) return [];
    
    // Pembersihan tambahan di peringkat kod untuk memastikan data selamat
    return data.map(m => ({
      name: String(m.name || 'TANPA NAMA').toUpperCase(),
      year: Number(m.year) || 1,
      className: String(m.className || '').toUpperCase()
    })) as Partial<Member>[];

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Gagal mengekstrak data. Pastikan fail/gambar adalah jelas.");
  }
};