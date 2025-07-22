const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'dh23z6xk8',
  api_key: '422224444864797',
  api_secret: 'JUAEIqGq3Hgp98mwDvHFrWW--sw'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'albuns',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  }
});

const upload = multer({ storage });

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const ALBUNS_DIR = path.join(__dirname, '../frontend/public/albuns');
const ALBUNS_JSON = path.join(ALBUNS_DIR, 'albuns.json');

const MONGO_URI = 'mongodb+srv://hiann:momo123@momos.tjswmt3.mongodb.net/?retryWrites=true&w=majority'; // Substitua <SENHA> pela sua senha
const client = new MongoClient(MONGO_URI);
let albunsCollection;

async function connectMongo() {
  await client.connect();
  const db = client.db('momo');
  albunsCollection = db.collection('albuns');
  console.log('Conectado ao MongoDB Atlas!');
}
connectMongo();

// Helper para ler e salvar o JSON dos álbuns
function readAlbuns() {
  if (!fs.existsSync(ALBUNS_JSON)) return [];
  return JSON.parse(fs.readFileSync(ALBUNS_JSON, 'utf-8'));
}
function saveAlbuns(data) {
  fs.writeFileSync(ALBUNS_JSON, JSON.stringify(data, null, 2));
}

// Rota para criar novo álbum
app.post('/api/albuns', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });
  const exists = await albunsCollection.findOne({ title });
  if (exists) return res.status(400).json({ error: 'Álbum já existe' });
  await albunsCollection.insertOne({ title, images: [] });
  const albumPath = path.join(ALBUNS_DIR, title);
  if (!fs.existsSync(albumPath)) {
    fs.mkdirSync(albumPath, { recursive: true });
  }
  res.json({ success: true });
});

// Rota para upload de imagens para um álbum
app.post('/api/albuns/:album/upload', upload.array('images', 20), async (req, res) => {
  const album = req.params.album;
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  const albumObj = await albunsCollection.findOne({ title: album });
  if (!albumObj) return res.status(404).json({ error: 'Álbum não encontrado' });
  const newImages = files.map(file => file.path); // file.path é a URL do Cloudinary
  await albunsCollection.updateOne(
    { title: album },
    { $push: { images: { $each: newImages } } }
  );
  res.json({ success: true, files: newImages });
});

// Rota para editar título do álbum
app.put('/api/albuns/:album', async (req, res) => {
  const oldTitle = req.params.album;
  const { newTitle } = req.body;
  if (!newTitle) return res.status(400).json({ error: 'Novo título obrigatório' });
  const albumObj = await albunsCollection.findOne({ title: oldTitle });
  if (!albumObj) return res.status(404).json({ error: 'Álbum não encontrado' });
  await albunsCollection.updateOne(
    { title: oldTitle },
    { $set: { title: newTitle } }
  );
  // Renomear pasta
  const oldPath = path.join(ALBUNS_DIR, oldTitle);
  const newPath = path.join(ALBUNS_DIR, newTitle);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
  res.json({ success: true });
});

// Rota para listar álbuns
app.get('/api/albuns', async (req, res) => {
  const albuns = await albunsCollection.find().toArray();
  res.json(albuns);
});

// Rota para deletar uma imagem de um álbum
app.delete('/api/albuns/:album/image', async (req, res) => {
  const album = req.params.album;
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Imagem obrigatória' });
  const albumObj = await albunsCollection.findOne({ title: album });
  if (!albumObj) return res.status(404).json({ error: 'Álbum não encontrado' });
  // Remove do array de imagens
  await albunsCollection.updateOne(
    { title: album },
    { $pull: { images: image } }
  );
  // Remove o arquivo físico
  const imagePath = path.join(__dirname, '../frontend/public', image);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
  res.json({ success: true });
});

// Servir arquivos estáticos da pasta de álbuns
app.use('/albuns', express.static(path.join(__dirname, '../frontend/public/albuns')));

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
}); 