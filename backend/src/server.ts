import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
// In Docker/production, environment variables are injected directly
// In development, try to load from .env file
const isProduction = process.env.NODE_ENV === 'production';
const isDocker = process.env.DOCKER_CONTAINER === 'true' || fs.existsSync('/.dockerenv');

if (!isProduction && !isDocker) {
  // Development mode: try to load .env file
  const possiblePaths = [
    path.resolve(process.cwd(), '../.env'), // From backend/ directory
    path.resolve(__dirname, '../../.env'), // From backend/src/ (dev) or backend/dist/ (prod)
    path.resolve(process.cwd(), '.env'), // Current directory
  ];

  let envPath = possiblePaths.find(p => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (envPath) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn('Failed to load .env file:', envPath);
      console.warn('Tried paths:', possiblePaths);
    } else {
      console.log('✅ Loaded .env file from:', envPath);
    }
  } else {
    console.log('ℹ️  No .env file found, using environment variables');
  }
} else {
  // Production/Docker: use environment variables directly
  console.log('ℹ️  Production mode: using environment variables from container');
}

// Import routes
import authRoutes from './routes/auth';
import travelRoutes from './routes/travel';
import voiceRoutes from './routes/voice';
import expenseRoutes from './routes/expense';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/expense', expenseRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

