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
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem AI sedang sibuk. Sila cuba lagi nanti.";
  }
};

export const extractMembersFromFile = async (fileData: string, mimeType: string) => {
  const prompt = `Ekstrak senarai murid daripada dokumen ini secara tepat. 
  Pastikan nama murid dalam HURUF BESAR, tahun antara 1-6, dan nama kelas dalam HURUF BESAR.`;

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
                description: "Tahun/Darjah murid (1-6).",
              },
              className: {
                type: Type.STRING,
                description: "Nama kelas murid dalam HURUF BESAR.",
              }
            },
            required: ["name", "year", "className"]
          }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text) as Partial<Member>[];
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Gagal mengekstrak data. Sila pastikan dokumen jelas.");
  }
};