const express = require('express');
const router = express.Router();
const db = require('../database');
const PDFDocument = require('pdfkit');

// ================= LISTAR =================
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.nome,

      -- preço unitário (se existir)
      (
        SELECT pu.preco 
        FROM precos_unitarios pu 
        WHERE pu.produto_id = p.id
        LIMIT 1
      ) AS preco_unitario,

      -- tipo do produto
      CASE 
        WHEN EXISTS (
          SELECT 1 
          FROM precos_unitarios pu 
          WHERE pu.produto_id = p.id
        )
        THEN 'unitario'
        ELSE 'vao'
      END AS tipo

    FROM produtos p
    WHERE p.ativo = 1
    ORDER BY p.nome
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('ERRO LISTAR PRODUTOS:', err);
      return res.status(500).json({ erro: 'Erro ao listar produtos' });
    }
    res.json(rows);
  });
});


// ================= CRIAR =================
router.post('/', async (req, res) => {
  const { cliente_id, itens } = req.body;

  if (!cliente_id || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  db.run(
    `INSERT INTO orcamentos (cliente_id, valor_total, data)
     VALUES (?, 0, datetime('now'))`,
    [cliente_id],
    async function (err) {
      if (err) return res.status(500).json(err);

      const orcamentoId = this.lastID;
      let totalOrcamento = 0;

      // ✅ MÃO DE OBRA COBRADA UMA ÚNICA VEZ
      const maoObraUnica = Number(itens[0]?.mao_obra) || 0;

      try {
        for (const item of itens) {
          const itemSeguro = {
            ...item,
            largura: Number(item.largura) || 0,
            altura: Number(item.altura) || 0,
            area:
              Number(item.area) ||
              (Number(item.largura) * Number(item.altura)) ||
              0,
            preco_m2: Number(item.preco_m2) || 0,
            mao_obra: 0, // 🔒 mão de obra nunca entra no item
            valor: Number(item.valor) || 0
          };

          const totalItem = await calcularItem(itemSeguro, orcamentoId);
          totalOrcamento += totalItem;
        }

        // ✅ SOMA MÃO DE OBRA UMA VEZ NO FINAL
        totalOrcamento += maoObraUnica;

        // ✅ SALVA TOTAL + MÃO DE OBRA
        db.run(
          `UPDATE orcamentos 
           SET valor_total = ?, mao_obra = ?
           WHERE id = ?`,
          [totalOrcamento, maoObraUnica, orcamentoId],
          function (err) {
            if (err) {
              console.error('Erro ao atualizar orçamento:', err.message);
              return res.status(500).json({ erro: err.message });
            }

            res.json({
              mensagem: 'Orçamento criado com sucesso',
              id: orcamentoId,
              total: Number(totalOrcamento).toFixed(2)
            });
          }
        );
      } catch (e) {
        console.error('ERRO AO GERAR ORÇAMENTO:', e.message);
        res.status(500).json({ erro: e.message });
      }
    }
  );
});

// ================= LISTAR ORÇAMENTOS =================
router.get('/lista', (req, res) => {
  db.all(
    `
    SELECT
      o.id,
      c.nome AS cliente,
      o.valor_total,
      o.mao_obra,
      o.data
    FROM orcamentos o
    JOIN clientes c ON c.id = o.cliente_id
    ORDER BY o.id DESC
    `,
    (err, rows) => {
      if (err) {
        console.error('ERRO AO LISTAR ORÇAMENTOS:', err.message);
        return res.status(500).json({ erro: err.message });
      }

      res.json(rows);
    }
  );
});


// ================= FUNÇÃO DE CÁLCULO =================
// ================= FUNÇÃO DE CÁLCULO =================
function calcularItem(item, orcamentoId) {
  return new Promise((resolve, reject) => {

    if (!item.produto_id) {
      return reject(new Error('Produto inválido'));
    }

    /* =====================================================
       🟡 1️⃣ PRODUTO UNITÁRIO (PREÇO FIXO)
       ===================================================== */

    db.get(
  `SELECT preco FROM precos_unitarios WHERE produto_id = ?`,
  [item.produto_id],
  (err, unitario) => {
    if (err) return reject(err);

    /* =====================================================
       🟢 1️⃣ PRODUTO UNITÁRIO (INALTERADO)
       ===================================================== */
    if (unitario) {
      const valorProduto = Number(unitario.preco) || 0;
      const totalItem = valorProduto;

      return db.run(
        `
        INSERT INTO orcamento_itens
        (orcamento_id, produto_id, largura, altura, area, valor_produto, mao_obra, valor_total)
        VALUES (?, ?, 0, 0, 0, ?, 0, ?)
        `,
        [
          orcamentoId,
          item.produto_id,
          valorProduto,
          totalItem
        ],
        err => {
          if (err) return reject(err);
          resolve(totalItem);
        }
      );
    }

    /* =====================================================
       🔵 2️⃣ PRODUTO POR VÃO (VALOR VEM DO FRONTEND)
       ===================================================== */

    const largura = Number(item.largura) || 0;
    const altura = Number(item.altura) || 0;
    const area = largura * altura;

    const valorProduto = Number(item.valor) || 0;

    if (valorProduto <= 0) {
      return reject(
        new Error('Valor do produto por vão inválido')
      );
    }

    const totalItem = valorProduto;

    return db.run(
      `
      INSERT INTO orcamento_itens
      (orcamento_id, produto_id, largura, altura, area, valor_produto, mao_obra, valor_total)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `,
      [
        orcamentoId,
        item.produto_id,
        largura,
        altura,
        area,
        valorProduto,
        totalItem
      ],
      err => {
        if (err) return reject(err);
        resolve(totalItem);
      }
    );
  }
);

      }
    );
  };





// ================= PDF =================
// ================= PDF =================
// ================= PDF =================
router.get('/:id/pdf', (req, res) => {
  const id = req.params.id;
  const dataEmissao = new Date();
const dataValidade = new Date();
dataValidade.setDate(dataEmissao.getDate() + 10);

const formatarData = data =>
  data.toLocaleDateString('pt-BR');


  db.get(`
    SELECT 
      o.valor_total,
      o.mao_obra,
      o.data,
      c.nome AS cliente
    FROM orcamentos o
    JOIN clientes c ON c.id = o.cliente_id
    WHERE o.id = ?
  `, [id], (err, orc) => {
    if (!orc) return res.status(404).send('Não encontrado');

    db.all(`
      SELECT 
        p.nome,
        i.largura,
        i.altura,
        i.valor_total
      FROM orcamento_itens i
      JOIN produtos p ON p.id = i.produto_id
      WHERE i.orcamento_id = ?
    `, [id], (err, itens) => {

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      /* ================= CABEÇALHO ================= */
      doc
        .fontSize(18)
        .text('DFJ VIDROS', { align: 'center' })
        .moveDown(0.3);

      doc
        .fontSize(12)
        .text('ORÇAMENTO', { align: 'center' })
        .moveDown();

      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Cliente: ${orc.cliente}`);
      doc.text(`Data: ${new Date(orc.data).toLocaleDateString()}`);
      doc.moveDown();

      /* ================= ITENS ================= */
      doc
        .fontSize(12)
        .text('Itens do Orçamento', { underline: true })
        .moveDown(0.5);

      itens.forEach(i => {
        doc
          .fontSize(11)
          .text(`${i.nome} (${i.largura} x ${i.altura})`, {
            continued: true
          })
          .text(` R$ ${i.valor_total.toFixed(2)}`, {
            align: 'right'
          });
      });

      doc.moveDown();
      doc
  .fontSize(10)
  .fillColor('#444')
  .text(`Data de emissão: ${formatarData(dataEmissao)}`)
  .text(`Validade do orçamento: ${formatarData(dataValidade)}`)
  .moveDown();


      /* ================= MÃO DE OBRA ================= */
      if (Number(orc.mao_obra) > 0) {
        doc
          .fontSize(11)
          .text('Mão de obra', { continued: true })
          .text(` R$ ${Number(orc.mao_obra).toFixed(2)}`, {
            align: 'right'
          });

        doc.moveDown();
      }

      /* ================= TOTAL ================= */
      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown();

      doc
        .fontSize(14)
        .text(
          `TOTAL GERAL: R$ ${Number(orc.valor_total).toFixed(2)}`,
          { align: 'right', underline: true }
        );

      /* ================= ASSINATURA ================= */
      doc.moveDown(4);

      doc
        .moveTo(300, doc.y)
        .lineTo(520, doc.y)
        .stroke();

      doc
        .fontSize(10)
        .text('DFJ Vidros', 300, doc.y + 5, {
          align: 'center',
          width: 220
        });

      doc.end();
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    // 1️⃣ apaga itens do orçamento
    db.run(
      `DELETE FROM orcamento_itens WHERE orcamento_id = ?`,
      [id],
      function (err) {
        if (err) {
          console.error('Erro ao excluir itens:', err.message);
          return res.status(500).json({ erro: err.message });
        }

        // 2️⃣ apaga o orçamento
        db.run(
          `DELETE FROM orcamentos WHERE id = ?`,
          [id],
          function (err) {
            if (err) {
              console.error('Erro ao excluir orçamento:', err.message);
              return res.status(500).json({ erro: err.message });
            }

            res.json({ mensagem: 'Orçamento excluído com sucesso' });
          }
        );
      }
    );
  });
});




module.exports = router;
