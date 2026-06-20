import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Initialize the GoogleGenAI SDK with server-side API Key & Telemetry header
const api_key = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: api_key,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Report Generation API
app.post("/api/generate-summary", async (req, res) => {
  try {
    const { month, apbdData, bludData } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "Kunci API Gemini (GEMINI_API_KEY) tidak ditemukan di sistem. Silakan konfigurasikan kunci API terlebih dahulu di menu Pengaturan / file lingkungan." 
      });
    }

    const monthNames: Record<string, string> = {
      all: "Akumulatif Tahunan (Satu Tahun Penuh 2026)",
      jan: "Januari",
      feb: "Februari",
      mar: "Maret",
      apr: "April",
      mei: "Mei",
      jun: "Juni",
      jul: "Juli",
      agu: "Agustus",
      sep: "September",
      okt: "Oktober",
      nov: "November",
      des: "Desember"
    };

    const monthLabel = monthNames[month as string] || "Desember";

    // Format APBD entries safely
    const apbdSummary = apbdData && apbdData.length > 0 
      ? apbdData.map((item: any) => `- **${item.name}** (Kode: ${item.code})\n  - Pagu Anggaran Rp${(item.budget || 0).toLocaleString('id-ID')}\n  - Realisasi Bulan Ini: Rp${(item.realisasiBulanIni || 0).toLocaleString('id-ID')}\n  - Total Realisasi Kumulatif: Rp${(item.totalTerpakai || 0).toLocaleString('id-ID')}`).join("\n")
      : "Tidak ada rincian transaksi belanja APBD untuk bulan ini.";

    // Format BLUD entries safely
    const bludSummary = bludData && bludData.length > 0
      ? bludData.map((item: any) => `- **${item.kegiatan}**\n  - Anggaran Asli: Rp${(item.anggaran || 0).toLocaleString('id-ID')}\n  - Realisasi Bulan Ini: Rp${(item.realisasi || 0).toLocaleString('id-ID')}`).join("\n")
      : "Tidak ada rincian transaksi belanja Jasa Layanan BLUD untuk bulan ini.";

    const systemPrompt = `Anda adalah analis keuangan utama dan penasihat strategis senior untuk Direksi RSUD dr. H. Jusuf SK di Tarakan, Provinsi Kalimantan Utara.
Tugas Anda adalah membuat Ringkasan Eksekutif Keuangan Otomatis (Executive Summary Report) yang sangat rapi, mendalam, taktis, dan mudah dipahami oleh pembuat keputusan.
Gunakan data rincian pengeluaran (APBD Daerah vs Jasa Layanan BLUD) untuk periode: ${monthLabel} 2026.

Persyaratan Laporan:
1. Bahasanya harus formal, obyektif, optimis namun realistis, dan berwibawa khas pengambil keputusan anggaran daerah.
2. Gunakan format Markdown mewah dengan visualisasi Bullet points, Bold text, serta tabel jika dirasa perlu.
3. Struktur laporan wajib mencakup:
   * **🚀 RINGKASAN EKSEKUTIF & SENTIMEN UTAMA**: Performa penyerapan agregat (APBD + BLUD) untuk periode ${monthLabel}.
   * **📈 DAFTAR SEKTOR BELANJA DENGAN ALOKASI TERBESAR**: Sebutkan rincian kegiatan atau sub-bidang mana saja yang menyerap dana paling signifikan secara nominal.
   * **⚠️ EVALUASI EFISIENSI & KEPATUHAN ANGGARAN**: Apakah ada sisa saldo (under-spending) yang terlalu besar atau sebaliknya pola over-budget yang patut diwaspadai?
   * **💡 REKOMENDASI TAKTIS REKORELATIF**: 3 sampai 4 poin usulan konkret, realistis, dan strategis bagi jajaran manajemen RSUD untuk optimasi anggaran bulan berikutnya.

Hilangkan jargon teknis yang tidak perlu, tekankan akurasi angka dari data yang disajikan, dan berikan narasi yang lancar serta profesional.`;

    const userPrompt = `Berikut merupakan data resmi rincian anggaran dan realisasi belanja RSUD dr. H. Jusuf SK periode ${monthLabel} 2026:

==================================================
1. BELANJA ANGGARAN PENDAPATAN BELANJA DAERAH (APBD)
==================================================
${apbdSummary}

==================================================
2. BELANJA JASA LAYANAN BADAN LAYANAN UMUM DAERAH (BLUD)
==================================================
${bludSummary}

Analisislah data tersebut dan buatlah Ringkasan Laporan Naratif Eksekutif yang mengesankan sekarang.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error generating summary via Gemini model:", error);
    res.status(500).json({ error: error.message || "Gagal memproses analisis otomatis AI." });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Gagal memulai server SIPANDA Backend:", error);
});
