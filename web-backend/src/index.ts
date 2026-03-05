import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import productsRouter from './routes/products';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import imagesRouter from './routes/images';
import storesRouter from './routes/stores';
import compareRouter from './routes/compare';
import scanRouter from './routes/scan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - accepte localhost ET le domaine de production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://agali.vercel.app', // Hardcoded Vercel URL
  process.env.FRONTEND_URL, // Ex: https://agali.vercel.app
].filter(Boolean) as string[];

const normalizeOrigin = (o: string) => o.replace(/\/$/, '');
const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static images
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Routes
app.use('/api/products', imagesRouter); // Doit être avant productsRouter !
app.use('/api/products', productsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/compare', compareRouter);
app.use('/api/scan', scanRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
