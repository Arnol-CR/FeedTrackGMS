const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Usuario', sql.NVarChar(50), usuario)
      .input('Contraseña', sql.NVarChar(100), contrasena)
      .execute('VerificarLogin');

    const idUsuario = result.recordset?.[0]?.IdUsuario ?? 0;

    if (!idUsuario || idUsuario === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { idUsuario, usuario },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ token, idUsuario, usuario });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al procesar el login', detalle: err.message });
  }
});

// GET /api/auth/verificar -> valida que el token siga siendo válido
router.get('/verificar', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valido: true, ...payload });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

module.exports = router;
