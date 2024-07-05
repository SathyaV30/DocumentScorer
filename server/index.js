const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const Tesseract = require('tesseract.js');
const path = require('path');

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://sathyavenugopal2003:e1OaL0PVc2YUXZvl@cluster0.w2anvaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
});

// Define a schema and model for paragraphs
const paragraphSchema = new mongoose.Schema({
  text: String,
  score: Number,
});

const Paragraph = mongoose.model('Paragraph', paragraphSchema);

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const extractParagraphs = (text) => {
  return text.split(/(\r?\n\s*\r?\n)+/).filter(p => p.trim());
};

const readPdf = async (buffer) => {
  return await new Promise(async (resolve) => {
    try {
      const data = await pdfParse(buffer);
      resolve(data.text);
    } catch (error) {
      resolve(error);
    }
  });
};

const readDocx = async (buffer) => {
  return await new Promise(async (resolve) => {
    try {
      const result = await mammoth.extractRawText({ buffer });
      resolve(result.value);
    } catch (error) {
      resolve('Error reading DOCX:', error);
    }
  });
};

const readDoc = async (buffer) => {
  return await new Promise((resolve, reject) => {
    textract.fromBufferWithMime('application/msword', buffer, (error, text) => {
      if (error) {
        resolve(`Error reading DOC: ${error}`);
      } else {
        resolve(text);
      }
    });
  });
};

const readTxt = async (buffer) => {
  return await new Promise(async (resolve) => {
    try {
      const data = buffer.toString('utf8');
      resolve(data);
    } catch (error) {
      resolve('Error reading TXT:', error);
    }
  });
};

// API endpoint to handle document upload and processing
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const fileBuffer = req.file.buffer;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
      text = await readPdf(fileBuffer);
    } else if (ext === '.txt') {
      text = await readTxt(fileBuffer);
    } else if (ext === '.docx') {
      text = await readDocx(fileBuffer);
    } else if (ext === '.doc') {
      text = await readDoc(fileBuffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const paragraphs = extractParagraphs(text);

    const savedParagraphs = await Promise.all(paragraphs.map(async (text) => {
      let paragraph = await Paragraph.findOne({ text });
      let alreadyExists = true;

      if (!paragraph) {
        paragraph = new Paragraph({ text, score: 0 });
        await paragraph.save();
        alreadyExists = false;
      }

      return { paragraph, alreadyExists };
    }));

    res.json({ paragraphs: savedParagraphs });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Error processing file.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
