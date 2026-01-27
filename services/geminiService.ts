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

const EXTRACTION_PROMPT = `TUGAS: Anda adalah robot pengekstrak data yang sangat teliti. Ekstrak senarai nama murid daripada input yang diberikan.

SOP KETAT (WAJIB PATUH):
1. CARI TAHUN & KELAS: Kenalpasti tahun (1-6) dan nama kelas daripada teks. Jika teks menyatakan satu kelas sahaja untuk semua murid (cth: "Senarai Nama 4 Amanah"), gunakan tahun 4 dan kelas Amanah untuk SEMUA murid.
2. NAMA MURID: Ekstrak dengan ejaan tepat dalam HURUF BESAR.
3. Jika tiada maklumat tahun dikesan langsung, gunakan nilai default: 1.
4. JANGAN REKA DATA. Pulangkan objek JSON sahaja.

OUTPUT: Mesti dalam JSON Array mengikut schema yang ditetapkan.`;

export const extractMembersFromFile = async (fileData: string, mimeType: string) => {
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
          { text: EXTRACTION_PROMPT }
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
              name: { type: Type.STRING },
              year: { type: Type.INTEGER },
              className: { type: Type.STRING }
            },
            required: ["name", "year", "className"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);
    return (Array.isArray(data) ? data : []).map(m => ({
      name: String(m.name || 'TANPA NAMA').toUpperCase(),
      year: Number(m.year) || 1,
      className: String(m.className || '').toUpperCase()
    })) as Partial<Member>[];
  } catch (error) {
    console.error("Gemini File Error:", error);
    throw new Error("Gagal mengekstrak data daripada fail.");
  }
};

export const extractMembersFromText = async (userInput: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Berikut adalah teks senarai nama: \n\n${userInput}\n\n${EXTRACTION_PROMPT}`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              year: { type: Type.INTEGER },
              className: { type: Type.STRING }
            },
            required: ["name", "year", "className"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);
    return (Array.isArray(data) ? data : []).map(m => ({
      name: String(m.name || 'TANPA NAMA').toUpperCase(),
      year: Number(m.year) || 1,
      className: String(m.className || '').toUpperCase()
    })) as Partial<Member>[];
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw new Error("Gagal memproses teks. Pastikan teks mengandungi senarai nama murid.");
  }
};