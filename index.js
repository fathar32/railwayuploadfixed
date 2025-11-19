const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Create uploads folder if not exists
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

const upload = multer({ dest: "uploads/" });

// Root
app.get("/", (req, res) => {
  res.send("API READY - KEEPALIVE ACTIVE");
});

// Upload CSV
app.post("/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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

// ---- KEEP ALIVE FIXED (AMAN UNTUK RAILWAY) ----
setInterval(() => {
  const url = "https://railwayuploadfixed-production.up.railway.app/";

  fetch(url)
    .then(() => console.log("KeepAlive sent →", url))
    .catch((err) =>
      console.log("KeepAlive error:", err.message)
    );
}, 4 * 60 * 1000); // 4 menit

// Anti Crash
process.on("SIGTERM", () => console.log("SIGTERM diterima"));
process.on("SIGINT", () => console.log("SIGINT diterima"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server berjalan di port", PORT));
