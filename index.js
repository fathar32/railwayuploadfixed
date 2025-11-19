const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Buat folder upload jika belum ada
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Multer
const upload = multer({ dest: "uploads/" });

// Root endpoint
app.get("/", (req, res) => {
  res.send("API READY - RAILWAY STABLE VERSION");
});

// Upload CSV
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
              row.perihal || null
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

// ------------------------------------------------------------------
// ✔ KEEP ALIVE — ANTI IDLE — 100% AMAN UNTUK RAILWAY
// ------------------------------------------------------------------
setInterval(() => {
  fetch("https://railwayuploadfixed-production.up.railway.app/")
    .then(() => console.log("KeepAlive → OK"))
    .catch(err => console.log("KeepAlive error:", err.message));
}, 4 * 60 * 1000); // setiap 4 menit

// Anti crash Railway
process.on("SIGTERM", () => console.log("SIGTERM diterima, shutdown..."));
process.on("SIGINT", () => console.log("SIGINT diterima, exit..."));

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server berjalan di port", PORT));
