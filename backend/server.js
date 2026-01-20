// ===== BANCO =====
const path = require('path');
const dbPath = path.join('/data', 'database.db'); // Render exige /data para persistência
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
  } else {
    console.log('Banco conectado com sucesso!');
  }
});

module.exports = db;

// ===== SERVIDOR =====
const express = require('express');
const app = express();

// ===== MIDDLEWARES =====
app.use(express.json());

// ===== SERVIR UPLOADS =====
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

// ===== DEBUG =====
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

// ===== SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
