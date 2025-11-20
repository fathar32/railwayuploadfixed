// ==========================
// DEPENDENCIES
// ==========================
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const pool = require("./db");
const fetch = require("node-fetch"); // PENTING untuk Railway

const app = express();

// ==========================
// CORS (AMANKAN DOMAIN FRONTEND)
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
// BUAT FOLDER UPLOADS
// ==========================
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Multer versi stabil
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

  const filePath = req
