const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pool = require("./db");

const app = express();

// =============================
// 🔥 CORS SUPER FIXED 🔥
// =============================
app.use(cors({
  origin: [
    "https://verceluploadfixied.vercel.app", // frontend kamu
    "http://localhost:3000"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.options("*", cors()); // Preflight OPTIONS fix

app.use(express.json());

// Multer setup
const upload = multer({ dest: "uploads/" });

// =============================
// 🔥 ROOT ENDPOINT
// =============================
app.get("/", (req, res) => {
  res.json({ status: "Server OK", time: new Date().toISOString() });
});

// =============================
// 🔥 KEEP-ALIVE Railway
// =============================
setInterval(() => {
  console.log("KeepAlive → OK");
}, 1000 * 60 * 4); // 4 menit

// =============================
// 🔥 UPLOAD CSV
// =============================
app.post("/upload-csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Tidak ada file yang diupload" });
    }

    const csvContent = fs.readFileSync(req.file.path, "utf8");
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== "");

    if (lines.length < 2) {
      return res.status(400).json({ error: "CSV kosong atau tidak valid" });
    }

    const headers = lines[0].split(",").map(h => h.trim());
    const expected = [
      "nomor_surat",
      "nama_pegawai",
      "nip",
      "status_verifikasi",
      "created_at",
      "jabatan",
      "perihal"
    ];

    // Validasi header
    for (const h of expected) {
      if (!headers.includes(h)) {
        return res.status(400).json({ error: `Header hilang: ${h}` });
      }
    }

    const client = await pool.connect();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim());
      if (cols.length < 7) continue;

      await client.query(
        `INSERT INTO uploads 
        (nomor_surat, nama_pegawai, nip, status_verifikasi, created_at, jabatan, perihal)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        cols
      );
    }

    client.release();
    fs.unlinkSync(req.file.path);

    res.json({ message: "CSV berhasil disimpan ke database!" });

  } catch (err) {
    console.error("CSV ERROR:", err);
    res.status(500).json({ error: "Gagal memproses CSV" });
  }
});

// =============================
// 🔥 SERVER
// =============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server berjalan di port", PORT);
});
