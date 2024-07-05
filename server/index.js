const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth'); // Import mammoth for DOCX file parsing
const Tesseract = require('tesseract.js'); // Import Tesseract for OCR

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
  return text.split(/\n{2,}/).filter(p => p.trim());
};

// API endpoint to handle document upload and processing
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    let text = '';
    const fileBuffer = req.file.buffer;

    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      text = data.text;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value;
    } else if (req.file.mimetype.startsWith('image/')) {
      const { data } = await Tesseract.recognize(fileBuffer, 'eng', {
        logger: m => console.log(m),
      });
      text = data.text;
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
