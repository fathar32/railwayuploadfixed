const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Setup CORS agar hanya frontend Vercel yang boleh
app.use(cors({
  origin: "https://vercelupload-p8rkr1mi1-fathars-projects.vercel.app",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

// Pastikan folder upload ada
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

const upload = multer({ dest: "uploads/" });

app.post("/upload-csv", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        for (const r of results) {
          await pool.query(
            `INSERT INTO pegawai (nomor_surat, nama_pegawai, nip, status_verifikasi, created_at, jabatan, perihal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              r.nomor_surat,
              r.nama_pegawai,
              r.nip,
              r.status_verifikasi,
              r.created_at,
              r.jabatan,
              r.perihal
            ]
          );
        }
        fs.unlinkSync(filePath);
        res.json({ message: "Data CSV berhasil disimpan." });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal menyimpan data." });
      }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
