const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const ALBUNS_DIR = path.join(__dirname, '../frontend/public/albuns');
const ALBUNS_JSON = path.join(ALBUNS_DIR, 'albuns.json');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const album = req.body.album;
    if (!album) {
      return cb(new Error('Álbum não especificado'), null);
    }
    const albumPath = path.join(ALBUNS_DIR, album);
    if (!fs.existsSync(albumPath)) {
      fs.mkdirSync(albumPath, { recursive: true });
    }
    cb(null, albumPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

// Helper para ler e salvar o JSON dos álbuns
function readAlbuns() {
  if (!fs.existsSync(ALBUNS_JSON)) return [];
  return JSON.parse(fs.readFileSync(ALBUNS_JSON, 'utf-8'));
}
function saveAlbuns(data) {
  fs.writeFileSync(ALBUNS_JSON, JSON.stringify(data, null, 2));
}

// Rota para criar novo álbum
app.post('/api/albuns', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });
  const albuns = readAlbuns();
  if (albuns.find(a => a.title === title)) {
    return res.status(400).json({ error: 'Álbum já existe' });
  }
  albuns.push({ title, images: [] });
  saveAlbuns(albuns);
  const albumPath = path.join(ALBUNS_DIR, title);
  if (!fs.existsSync(albumPath)) {
    fs.mkdirSync(albumPath, { recursive: true });
  }
  res.json({ success: true });
});

// Rota para upload de imagens para um álbum
app.post('/api/albuns/:album/upload', upload.array('images', 20), (req, res) => {
  const album = req.params.album;
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  const albuns = readAlbuns();
  const albumObj = albuns.find(a => a.title === album);
  if (!albumObj) return res.status(404).json({ error: 'Álbum não encontrado' });
  files.forEach(file => {
    albumObj.images.push(`/albuns/${album}/${file.filename}`);
  });
  saveAlbuns(albuns);
  res.json({ success: true, files: files.map(f => f.filename) });
});

// Rota para editar título do álbum
app.put('/api/albuns/:album', (req, res) => {
  const oldTitle = req.params.album;
  const { newTitle } = req.body;
  if (!newTitle) return res.status(400).json({ error: 'Novo título obrigatório' });
  const albuns = readAlbuns();
  const albumObj = albuns.find(a => a.title === oldTitle);
  if (!albumObj) return res.status(404).json({ error: 'Álbum não encontrado' });
  albumObj.title = newTitle;
  saveAlbuns(albuns);
  // Renomear pasta
  const oldPath = path.join(ALBUNS_DIR, oldTitle);
  const newPath = path.join(ALBUNS_DIR, newTitle);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
  res.json({ success: true });
});

// Rota para listar álbuns
app.get('/api/albuns', (req, res) => {
  const albuns = readAlbuns();
  res.json(albuns);
});

// Rota para deletar uma imagem de um álbum
app.delete('/api/albuns/:album/image', (req, res) => {
  const album = req.params.album;
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Imagem obrigatória' });
  const albuns = readAlbuns();
  const albumObj = albuns.find(a => a.title === album);
  if (!albumObj) return res.status(404).json({ error: 'Álbum não encontrado' });
  // Remove do array de imagens
  albumObj.images = albumObj.images.filter(img => img !== image);
  saveAlbuns(albuns);
  // Remove o arquivo físico
  const imagePath = path.join(__dirname, '../frontend/public', image);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
}); 