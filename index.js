// ==========================
// DEPENDENCIES
// ==========================
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");

const app = express();

// ==========================
// CORS AMAN UNTUK VERCEL & SEMUA DOMAIN
// ==========================
app.use(
  cors({
    origin: (origin, callback) => callback(null, true), // izinkan semua origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ==========================
// TEMP FOLDER UNTUK RAILWAY
// ==========================
const uploadDir = "/tmp/uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer ke folder yang aman
const upload = multer({ dest: uploadDir });

// ==========================
// TEST ROOT
// ==========================
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Server berjalan normal" });
});

// ==========================
// UPLOAD CSV → DATABASE
// ==========================
app.post("/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const path = req.file.path;
  const results = [];

  fs.createReadStream(path)
    .pipe(csv())
    .on("data", (row) => results.push(row))
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

        fs.unlinkSync(path); // hapus file
        res.json({ message: "CSV berhasil diproses!" });
      } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).json({ error: "Gagal menyimpan data ke database" });
      }
    });
});

// ==========================
// LISTEN WAJIB 0.0.0.0
// ==========================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server berjalan di port", PORT);
});
