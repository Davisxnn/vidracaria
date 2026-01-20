const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.nome,
      p.tipo,

      -- preço correto (unitário OU por vão)
      COALESCE(pu.preco, p.preco) AS preco,

      -- mantém separado se precisar
      pu.preco AS preco_unitario

    FROM produtos p
    LEFT JOIN precos_unitarios pu
      ON pu.produto_id = p.id

    WHERE p.ativo = 1
    ORDER BY p.nome
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro ao listar produtos' });
    }
    res.json(rows);
  });
});



/* ================= CADASTRAR PRODUTO ================= */
router.post('/', (req, res) => {
  
  console.log('BODY RECEBIDO:', req.body);

  const { nome, preco, tipo } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome obrigatório' });
  }

  db.run(
  `INSERT INTO produtos (nome, tipo, preco, ativo)
   VALUES (?, ?, ?, 1)`,
  [
    nome,
    tipo,
    tipo === 'unitario' ? 0 : preco
  ],
  function (err) {
    if (err) {
      console.error('ERRO INSERT PRODUTO:', err);
      return res.status(500).json({ erro: 'Erro ao inserir produto' });
    }

    const produtoId = this.lastID;

    // 🔹 PRODUTO UNITÁRIO
    if (tipo === 'unitario') {
      if (preco == null) {
        return res.status(400).json({ erro: 'Preço unitário obrigatório' });
      }

      db.run(
        `INSERT INTO precos_unitarios (produto_id, preco)
         VALUES (?, ?)`,
        [produtoId, preco],
        err => {
          if (err) {
            console.error('ERRO INSERT PRECO UNITARIO:', err);
            return res.status(500).json({ erro: 'Erro ao salvar preço unitário' });
          }
          res.json({ id: produtoId });
        }
      );
    } else {
      // 🔹 PRODUTO POR VÃO
      res.json({ id: produtoId });
    }
  }
);

});


/* ================= EXCLUIR PRODUTO ================= */
router.delete('/:id', (req, res) => {
  db.run(
    'UPDATE produtos SET ativo = 0 WHERE id = ?',
    [req.params.id],
    err => {
      if (err) {
        console.error('ERRO EXCLUIR PRODUTO:', err);
        return res.status(500).json({ erro: 'Erro ao excluir produto' });
      }
      res.json({ sucesso: true });
    }
  );
});

module.exports = router;
