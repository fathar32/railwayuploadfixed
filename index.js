const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");

const app = express();

// FIX PENTING UNTUK CORS
app.use(cors({
  origin: "https://verceluploadfixied.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// izinkan preflight
app.options("*", cors());

app.use(express.json());

// pastikan folder uploads ada
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// multer setup
const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("API READY - Railway Anti-Idle Version");
});

// CSV upload route
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
        res.status(500).json({ error: "Gagal menyimpan data" });
      }
    });
});

// SIGTERM handler — anti crash saat stop
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down...");
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Exiting...");
});

// Railway PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server berjalan di port", PORT));
