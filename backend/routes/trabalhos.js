const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configuração do armazenamento
const uploadPath = path.join(__dirname, '..', 'uploads', 'trabalhos');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});


const upload = multer({ storage });

// UPLOAD DA IMAGEM
router.post('/upload', upload.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
  }

  res.json({
    mensagem: 'Upload realizado com sucesso',
    arquivo: req.file.filename
  });
});

// LISTAR IMAGENS
router.get('/', (req, res) => {
  const caminhoUploads = path.join(__dirname, '..', 'uploads', 'trabalhos');

  fs.readdir(caminhoUploads, (err, files) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(files);
  });
});

// APAGAR IMAGEM
router.delete('/:nome', (req, res) => {
  const nomeImagem = req.params.nome;

  const caminho = path.join(
    __dirname,
    '..',
    'uploads',
    'trabalhos',
    nomeImagem
  );

  fs.unlink(caminho, err => {
    if (err) {
      return res.status(404).json({ erro: 'Imagem não encontrada' });
    }

    res.json({ mensagem: 'Imagem apagada com sucesso' });
  });
});


module.exports = router;
