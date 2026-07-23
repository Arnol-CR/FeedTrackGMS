const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// GET /api/usuarios -> lista todos los usuarios
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Usuarios');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// GET /api/usuarios/:id -> obtiene un usuario por id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Usuarios WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el usuario' });
  }
});

// POST /api/usuarios -> crea un usuario
router.post('/', async (req, res) => {
  const { nombre, correo } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('correo', sql.NVarChar, correo)
      .query('INSERT INTO Usuarios (nombre, correo) OUTPUT INSERTED.* VALUES (@nombre, @correo)');

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

// PUT /api/usuarios/:id -> actualiza un usuario
router.put('/:id', async (req, res) => {
  const { nombre, correo } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('nombre', sql.NVarChar, nombre)
      .input('correo', sql.NVarChar, correo)
      .query('UPDATE Usuarios SET nombre = @nombre, correo = @correo OUTPUT INSERTED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

// DELETE /api/usuarios/:id -> elimina un usuario
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Usuarios WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});

module.exports = router;
