const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // dari Railway
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
