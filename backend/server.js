const db = require('./database');
const express = require('express');
const path = require('path');

const app = express();

// ===== MIDDLEWARES =====
app.use(express.json());

// ===== SERVIR UPLOADS =====
// ===== SERVIR UPLOADS (OBRIGATÓRIO) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ===== SERVIR FRONTEND =====
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ===== ROTAS =====
const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const orcamentosRoutes = require('./routes/orcamentos');
const trabalhosRoutes = require('./routes/trabalhos');
const vidrosRoutes = require('./routes/vidros');


app.use('/clientes', clientesRoutes);
app.use('/produtos', produtosRoutes);
app.use('/orcamentos', orcamentosRoutes);
app.use('/trabalhos', trabalhosRoutes);
app.use('/vidros', vidrosRoutes);


// ===== ROTA RAIZ =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ===== SERVIDOR =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


app.get('/debug/produtos', (req, res) => {
  db.all('PRAGMA table_info(produtos)', (err, rows) => {
    if (err) {
      return res.status(500).json({
        erro: 'Erro ao executar PRAGMA',
        detalhe: err.message
      });
    }

    res.json(rows);
  });
});


