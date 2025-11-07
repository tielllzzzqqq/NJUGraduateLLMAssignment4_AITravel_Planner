import express from 'express';
import multer from 'multer';
import { voiceService } from '../services/voice';

const router = express.Router();

// Configure multer for audio file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Voice recognition endpoint
router.post('/recognize', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const result = await voiceService.recognizeAudio(req.file.buffer);
    res.json(result);
  } catch (error: any) {
    console.error('Voice recognition error:', error);
    res.status(500).json({ error: error.message || 'Voice recognition failed' });
  }
});

// Get voice recognition status/instructions
router.get('/status', (req, res) => {
  const hasCredentials = !!(
    process.env.XUNFEI_APP_ID &&
    process.env.XUNFEI_API_KEY &&
    process.env.XUNFEI_API_SECRET
  );

  res.json({
    available: hasCredentials,
    instructions: hasCredentials 
      ? 'Voice recognition is available. Use Web Speech API on frontend for better experience.'
      : 'Voice recognition credentials not configured. Please use Web Speech API on frontend.'
  });
});

export default router;

