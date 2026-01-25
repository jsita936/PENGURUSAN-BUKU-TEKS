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
  const prompt = `TUGAS: Ekstrak senarai murid daripada dokumen/imej ini.
  
  ARAHAN TEKNIKAL:
  1. Kenalpasti TAHUN (1-6) dengan teliti. Lihat pada tajuk dokumen atau kolum 'Tahun/Darjah'. Jika keseluruhan dokumen adalah untuk satu tahun sahaja (contoh: "SENARAI NAMA TAHUN 1"), pastikan SEMUA murid diberikan nilai tahun yang sama. JANGAN sesekali memandai (hallucinate) menukar tahun jika tidak dinyatakan.
  2. Ekstrak NAMA penuh murid dalam HURUF BESAR.
  3. Ekstrak KELAS dalam HURUF BESAR (contoh: AMANAH, BESTARI).
  4. Jika maklumat kelas tidak dijumpai dalam baris murid, cuba cari di bahagian atas (header) dokumen.
  
  FORMAT OUTPUT: JSON Array.`;

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
                description: "Nama penuh murid dalam HURUF BESAR.",
              },
              year: {
                type: Type.INTEGER,
                description: "Tahun atau darjah murid (nombor 1 hingga 6 sahaja).",
              },
              className: {
                type: Type.STRING,
                description: "Nama kelas murid (contoh: AMANAH, CERDIK).",
              }
            },
            required: ["name", "year", "className"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);
    
    // Pastikan data adalah array dan bersihkan jika perlu
    if (!Array.isArray(data)) return [];
    
    return data as Partial<Member>[];
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Gagal mengekstrak data. Sila pastikan dokumen atau gambar yang dimuat naik adalah jelas dan mengandungi senarai nama murid.");
  }
};