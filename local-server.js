import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// 1. Create the local vault folder if it doesn't exist
const uploadDir = path.join(__dirname, 'public', 'academy_vault');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configure how files are saved
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = Date.now() + '_' + Math.round(Math.random() * 1E9) + ext;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

// 3. Allow React to view the files
app.use('/academy_vault', express.static(uploadDir));

// 4. The Upload Endpoint
app.post('/upload_vault_asset.php', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file received.' });
  }
  
  // Create the localhost URL for the file
  const fileUrl = `http://localhost:5000/academy_vault/${req.file.filename}`;
  
  res.json({ status: 'success', url: fileUrl });
});

app.listen(5000, () => {
  console.log('🛡️ Local Vault Server running at http://localhost:5000');
});