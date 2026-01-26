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
    3. Cadangan tindakan untuk admin.
    Pastikan jawapan dalam format markdown yang kemas.
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
  const prompt = `Anda ialah sistem yang mengekstrak data senarai murid sekolah di Malaysia.

TUGAS:
Daripada input yang diberi (PDF / imej / teks), ekstrak MAKLUMAT MURID sahaja.

PERATURAN:
1. Kembalikan output dalam format JSON sahaja.
2. Jangan sertakan penerangan, ayat tambahan, markdown atau simbol lain.
3. Jika data tidak lengkap, isikan nilai sebagai null.
4. Pastikan JSON boleh terus digunakan dalam aplikasi.

FORMAT OUTPUT WAJIB:
{
  "murid": [
    {
      "bil": 1,
      "nama": "NAMA PENUH MURID",
      "kelas": "CONTOH: 1A / 2 CEMERLANG / 5 IBNU SINA",
      "tahun": 1
    }
  ]
}

GARIS PANDUAN:
- "bil" mesti nombor bermula dari 1 dan bertambah.
- "nama" dalam huruf besar.
- "tahun" mestilah nombor sahaja (1–6).
- Abaikan teks lain seperti tajuk, logo, nama sekolah, tarikh, tandatangan.
- Fokus hanya kepada senarai murid.

MULA EKSTRAK SEKARANG.`;

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
          type: Type.OBJECT,
          properties: {
            murid: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bil: { type: Type.INTEGER },
                  nama: { type: Type.STRING },
                  kelas: { type: Type.STRING },
                  tahun: { type: Type.INTEGER }
                },
                required: ["bil", "nama", "kelas", "tahun"]
              }
            }
          },
          required: ["murid"]
        }
      }
    });

    const text = response.text || "{\"murid\": []}";
    const parsed = JSON.parse(text);
    const data = parsed.murid || [];
    
    // Pembersihan tambahan & mapping ke format aplikasi
    return data.map((m: any) => ({
      name: String(m.nama || 'TANPA NAMA').toUpperCase(),
      year: Number(m.tahun) || 1,
      className: String(m.kelas || '').toUpperCase().trim()
    })) as Partial<Member>[];

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Gagal mengekstrak data. Pastikan fail/gambar adalah jelas.");
  }
};