const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
  path.resolve(__dirname, 'database.db'),
  err => {
    if (err) {
      console.error('Erro ao abrir banco:', err.message);
    } else {
      console.log('Banco conectado com sucesso');
    }
  }
);

db.serialize(() => {

  /* ================= CLIENTES ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT
    )
  `);

  /* ================= CORES DO VIDRO ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS cores_vidro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      acrescimo_percentual REAL DEFAULT 0
    )
  `);

  /* ================= VIDROS ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS vidros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cor_id INTEGER NOT NULL,
      espessura_mm INTEGER NOT NULL,
      preco_m2 REAL NOT NULL,
      FOREIGN KEY (cor_id) REFERENCES cores_vidro(id)
    )
  `);

  /* ================= PRODUTOS ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('vao', 'unitario')),
      preco REAL NOT NULL,
      ativo INTEGER DEFAULT 1
    )
  `);

  /* ================= ORÇAMENTOS ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      valor_total REAL DEFAULT 0,
      data TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `);
    /* ================= AJUSTE SEGURO: MÃO DE OBRA ================= */
  db.all(`PRAGMA table_info(orcamentos)`, (err, columns) => {
    if (err) {
      console.error('Erro ao verificar colunas de orcamentos:', err.message);
      return;
    }

    const existeMaoObra = columns.some(col => col.name === 'mao_obra');

    if (!existeMaoObra) {
      db.run(
        `ALTER TABLE orcamentos ADD COLUMN mao_obra REAL DEFAULT 0`,
        err => {
          if (err) {
            console.error('Erro ao adicionar coluna mao_obra:', err.message);
          } else {
            console.log('Coluna mao_obra adicionada com sucesso');
          }
        }
      );
    }
  });


  /* ================= ITENS DO ORÇAMENTO ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS orcamento_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      largura REAL,
      altura REAL,
      area REAL,
      valor_produto REAL,
      mao_obra REAL,
      valor_total REAL,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  /* ================= PREÇOS POR VÃO ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS precos_vao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      largura_max REAL NOT NULL,
      altura_max REAL NOT NULL,
      preco REAL NOT NULL,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  /* ================= PREÇOS UNITÁRIOS ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS precos_unitarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      preco REAL NOT NULL,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  /* ================= ACRÉSCIMOS ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS acrescimos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('fixo', 'percentual')),
      valor REAL NOT NULL,
      aplica_em TEXT NOT NULL CHECK (aplica_em IN ('item', 'orcamento'))
    )
  `);

  /* ================= PRODUTOS SIMPLES ================= */
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos_simples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL
    )
  `);


  /* ================= SEEDS ================= */
  //db.run(`DELETE FROM cores_vidro`);
  //db.run(`DELETE FROM vidros`);
  //db.run(`DELETE FROM precos_vao`);

  const cores = [
    ['Incolor', 0],
    ['Fumê', 8],
    ['Verde', 8],
    ['Bronze', 10],
    ['Reflecta', 12],
    ['Canelado', 10],
    ['Mini Boreal', 10]
  ];

  const coresStmt = db.prepare(
    `INSERT INTO cores_vidro (nome, acrescimo_percentual) VALUES (?, ?)`
  );
  cores.forEach(c => coresStmt.run(c));
  coresStmt.finalize();

  const vidros = [
    ['Vidro Comum', 1, 4, 82.00],
    ['Vidro Comum', 1, 6, 90.00],
    ['Vidro Comum', 2, 4, 90.00],
    ['Espelho', 1, 4, 155.00],
    ['Vidro Laminado', 1, 8, 215.00]
  ];

  const vidrosStmt = db.prepare(
    `INSERT INTO vidros (nome, cor_id, espessura_mm, preco_m2) VALUES (?, ?, ?, ?)`
  );
  vidros.forEach(v => vidrosStmt.run(v));
  vidrosStmt.finalize();

  const precos = [
    [1, 0.60, 0.60, 182.04],
    [1, 0.60, 1.20, 203.64],
    [1, 0.80, 0.80, 191.71],
    [1, 1.00, 1.20, 238.00]
  ];

  const precosStmt = db.prepare(
    `INSERT INTO precos_vao (produto_id, largura_max, altura_max, preco)
     VALUES (?, ?, ?, ?)`
  );
  precos.forEach(p => precosStmt.run(p));
  precosStmt.finalize();

});

module.exports = db;
