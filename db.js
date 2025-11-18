const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres:DIXOzTOqpeQvPNhuXKtwEriggeGuJjIy@yamabiko.proxy.rlwy.net:29574/railway",  // dari Railway
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
