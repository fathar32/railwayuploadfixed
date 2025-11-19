const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// HEALTH ROUTE
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ROOT
app.get("/", (req, res) => {
  res.send("API is running!");
});

// Multer
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");     // buat folder jika belum ada
}

const upload = multer({ dest: "uploads/" });

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
              row.nomor_surat,
              row.nama_pegawai,
              row.nip,
              row.status_verifikasi,
              row.created_at,
              row.jabatan,
              row.perihal,
            ]
          );
        }

        fs.unlinkSync(filePath);
        res.json({ message: "Data CSV berhasil diupload!" });

      } catch (err) {
        console.error("DB ERROR:", err);
        res.status(500).json({ error: "Gagal menyimpan data" });
      }
    })
    .on("error", (err) => {
      console.log("CSV ERROR:", err);
      res.status(500).json({ error: "File CSV rusak" });
    });
});

// LOG saat Railway stop container
process.on("SIGTERM", () => {
  console.log("❗ SIGTERM RECEIVED — Railway shutting down");
});

// PORT Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server berjalan di port " + PORT));
