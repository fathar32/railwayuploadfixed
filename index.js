import express from "express";
import pg from "pg";
import multer from "multer";
import csvParser from "csv-parser";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();
const app = express();

// ====== DATABASE ======
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ====== MIDDLEWARE ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Biar Frontend Aman
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Folder Upload
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup
const upload = multer({ dest: "uploads/" });

// ====== ROUTES ======
app.get("/", (req, res) => {
  res.send("API is running (Railway alive).");
});


/* -----------------------
   UPLOAD CSV
------------------------*/
app.post("/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File CSV tidak ditemukan" });
  }

  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        for (const row of results) {
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

// ====== KEEP ALIVE (ANTI-IDLE) ======
setInterval(() => {
  fetch("https://railwayuploadfixed-production.up.railway.app/")
    .then(() => console.log("Keep-alive ping sent"))
    .catch(() => {});
}, 1000 * 60 * 5); // setiap 5 menit

// ====== START SERVER ======
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
