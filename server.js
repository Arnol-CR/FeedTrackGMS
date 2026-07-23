const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRouter = require('./routes/auth');
const reportesRouter = require('./routes/reportes');
const verificarToken = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sirve el frontend estático (HTML/CSS/JS vanilla)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/api/auth', authRouter);
app.use('/api/reportes', verificarToken, reportesRouter);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
