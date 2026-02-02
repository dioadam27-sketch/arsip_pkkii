import { GoogleGenAI, Type } from "@google/genai";
import { AIParsedData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLetterContent = async (text: string): Promise<AIParsedData> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Anda adalah pustakawan AI Universitas Airlangga. Tugas anda adalah mengindeks dokumen untuk pengarsipan digital.
      
      Teks Dokumen:
      "${text}"
      
      Instruksi:
      1. Ekstrak Nomor Dokumen (jika ada, misal No SK, No Surat).
      2. Buat Judul yang sangat jelas dan ringkas (maks 10 kata).
      3. Klasifikasikan Kategori menjadi salah satu dari berikut: "SK Rektor", "Surat Tugas", "Dokumen Akademik", "Laporan Kegiatan", atau "Lainnya".
      4. Identifikasi Tahun dokumen tersebut dibuat (Format YYYY).
      5. Buat Deskripsi singkat untuk memudahkan pencarian (maks 2 kalimat).
      6. Buat 3-5 Tags (kata kunci) relevan untuk pencarian.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nomor_dokumen: { type: Type.STRING, description: "Nomor identifikasi dokumen" },
            judul: { type: Type.STRING, description: "Judul dokumen yang baku" },
            kategori: { type: Type.STRING, description: "Kategori dokumen" },
            tahun: { type: Type.STRING, description: "Tahun dokumen (YYYY)" },
            deskripsi: { type: Type.STRING, description: "Ringkasan isi untuk indeks" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Kata kunci pencarian"
            }
          },
          required: ["judul", "kategori", "tahun", "deskripsi"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
        throw new Error("No data returned from AI");
    }
    return JSON.parse(resultText) as AIParsedData;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};