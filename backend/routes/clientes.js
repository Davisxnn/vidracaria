const express = require('express');
const router = express.Router();
const db = require('../database');

// ================= LISTAR CLIENTES =================
router.get('/', (req, res) => {
  db.all(
    'SELECT id, nome, telefone FROM clientes',
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ================= CADASTRAR CLIENTE =================
router.post('/', (req, res) => {
  const { nome, telefone } = req.body;

  db.run(
    'INSERT INTO clientes (nome, telefone) VALUES (?, ?)',
    [nome, telefone],
    function (err) {
      if (err) return res.status(500).json(err);

      res.json({
        id: this.lastID,
        nome,
        telefone
      });
    }
  );
});

// ================= LIMPAR TODOS OS CLIENTES =================
router.delete('/limpar', (req, res) => {
  db.run('DELETE FROM clientes', err => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    res.json({ message: 'Clientes removidos com sucesso' });
  });
});

// ================= REMOVER CLIENTE ESPECÍFICO =================
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.run(
    'DELETE FROM clientes WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.json({ removidos: this.changes });
    }
  );
});

module.exports = router;
