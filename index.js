// ==========================
// DEPENDENCIES
// ==========================
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");
const fetch = require("node-fetch"); // Untuk Railway keep-alive

const app = express();

// ==========================
// CORS (AMAN UNTUK VERCEL & LOCALHOST)
// ==========================
app.use(cors({
  origin: [
    "https://verceluploadfixied.vercel.app",
    "http://localhost:3000",
    "*"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// ==========================
// BUAT FOLDER UPLOADS JIKA BELUM ADA
// ==========================
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Multer
const upload = multer({ dest: "uploads/" });

// ==========================
// ROUTE ROOT
// ==========================
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server berjalan normal" });
});

// ==========================
// UPLOAD CSV → INPUT DATABASE
// ==========================
app.post("/upload-csv", upload.single("file"), async (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        for (let row of results) {
          await pool.query(
            `INSERT INTO pegawai 
            (nomor_surat, nama_pegawai, nip, status_verifikasi, created_at, jabatan, perihal)
            VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              row.nomor_surat || null,
              row.nama_pegawai || null,
              row.nip || null,
              row.status_verifikasi || null,
              row.created_at || new Date(),
              row.jabatan || null,
              row.perihal || null,
            ]
          );
        }

        fs.unlinkSync(filePath);
        res.json({ message: "CSV berhasil diproses!" });

      } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).json({ error: "Gagal menyimpan data ke database" });
      }
    });
});

// ==========================
// KEEP-ALIVE UNTUK RAILWAY
// ==========================
setInterval(() => {
  fetch("https://railwayuploadfixed-production.up.railway.app/")
    .then(() => console.log("KeepAlive → OK"))
    .catch(() => {});
}, 280000); // 4 menit 40 detik

// ==========================
// ANTI-CRASH RAILWAY
// ==========================
process.on("SIGTERM", () => console.log("SIGTERM received"));
process.on("SIGINT", () => console.log("SIGINT received"));

// ==========================
// LISTEN WAJIB 0.0.0.0
// ==========================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server berjalan di port", PORT);
});
