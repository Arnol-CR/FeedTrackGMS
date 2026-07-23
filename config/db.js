const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // true para Azure, false para SQL Server local
    trustServerCertificate: true // útil en desarrollo local
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

async function getPool() {
  if (pool && pool.connected) return pool;
  try {
    pool = await sql.connect(config);
    pool.on('error', (err) => {
      console.error('Error en el pool de SQL Server:', err.message);
      pool = null; // fuerza reconexión en el próximo request
    });
    console.log('Conectado a SQL Server correctamente.');
    return pool;
  } catch (err) {
    pool = null;
    console.error('Error al conectar a SQL Server:', err.message);
    throw err;
  }
}

module.exports = { sql, getPool };
