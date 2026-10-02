require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');

const app = express();

// Initialise DB once per cold start — only if TURSO_DATABASE_URL is configured.
// Routes that don't need a DB (e.g. /api/health) work without it.
let dbReady = false;
async function ensureDb(req, res, next) {
  // Skip DB init for health check
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }
  if (!process.env.TURSO_DATABASE_URL) {
    return res.status(503).json({
      error: 'Database not configured. Set TURSO_DATABASE_URL in your Netlify environment variables.',
    });
  }
  try {
    if (!dbReady) {
      await initializeDatabase();
      dbReady = true;
    }
    next();
  } catch (err) {
    next(err);
  }
}

app.use(ensureDb);

app.use(helmet());

// Allow localhost for local dev AND your deployed Netlify domain.
// Set ALLOWED_ORIGIN=https://your-site.netlify.app in your environment.
const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];
if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(process.env.ALLOWED_ORIGIN);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin / non-browser
    const allowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api/docs', (req, res, next) => {
  helmet({ contentSecurityPolicy: false })(req, res, next);
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Park West Inventory API',
  swaggerOptions: { persistAuthorization: true },
}));

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy: origin not allowed.' });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error.' });
});

// Only start a real HTTP server when running locally (not as a Netlify Function).
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
