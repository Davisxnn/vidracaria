const express = require('express');
const router = express.Router();
const db = require('../database');

// ================= LISTAR CORES =================
router.get('/cores', (req, res) => {
  db.all(
    `SELECT DISTINCT cor FROM vidros ORDER BY cor`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ================= LISTAR ESPESSURAS POR COR =================
router.get('/espessuras/:cor', (req, res) => {
  const { cor } = req.params;

  db.all(
    `
    SELECT DISTINCT espessura_mm
    FROM vidros
    WHERE cor = ?
    ORDER BY espessura_mm
    `,
    [cor],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
