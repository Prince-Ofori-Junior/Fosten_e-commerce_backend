require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const hsts = require('hsts');
const csurf = require('csurf');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
const logger = require('./config/logger');
const redisClient = require('./config/redis');
const { pool } = require('./config/db');
const nodemailerTransporter = require('./config/mailer');
const path = require('path');

// -------------------- ROUTES --------------------
const authRoutes = require('./model/auth/auth.routes');
const productRoutes = require('./model/products/product.routes');
const orderRoutes = require('./model/orders/order.routes');
const reviewRoutes = require('./model/reviews/review.routes');
const adminRoutes = require('./model/admin/admin.routes');
const deliveryRoutes = require('./model/delivery/delivery.routes');
const notificationRoutes = require('./model/notification/notification.routes');
const wishlistRoutes = require('./model/wishlist/wishlist.routes');
const promotionRoutes = require('./model/promotions/promotion.routes');
const { errorHandler } = require('./middleware/errorMiddleware');
const paymentRoutes = require('./routes/payment');
const checkoutRoutes = require('./routes/checkout');

const app = express();
app.set('trust proxy', 1);

// -------------------- SECURITY MIDDLEWARE --------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  })
);
app.use(hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// -------------------- CORS --------------------
const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [
  'https://fosten-e-commerce-frontend.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman/curl
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
    ],
    credentials: true,
  })
);

// -------------------- GLOBAL MIDDLEWARE --------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xssClean());
app.use(hpp());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(compression());

// -------------------- CSRF (Fixed for Render + Vercel) --------------------
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None', // ✅ Must be None for cross-site between Render & Vercel
  },
});

// ✅ Always expose CSRF route before applying CSRF globally
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.status(200).json({ csrfToken: req.csrfToken() });
});

// ✅ Apply CSRF only for non-API routes (safe for REST APIs like React frontends)
app.use((req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  // Skip CSRF entirely for API endpoints
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Skip for safe HTTP methods
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Apply CSRF protection only to non-API routes (like admin panels, server-rendered views)
  return csrfProtection(req, res, next);
});

// -------------------- STATIC FILES --------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------- LOGGING --------------------
if (process.env.NODE_ENV === 'production') {
  app.use(
    morgan('combined', {
      skip: (req) => req.url.includes('/api/docs') || req.url.includes('/health'),
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
} else {
  app.use(morgan('dev'));
}

// -------------------- ROUTES --------------------
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/checkout', checkoutRoutes);

// Test routes
app.get('/hello', (req, res) => res.send('Hello from your backend!'));
app.get('/test', (req, res) => res.send('This is a test route!'));

// Swagger docs (non-prod)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// -------------------- HEALTH CHECKS --------------------
const healthAuth = (req, res, next) => {
  const token = req.headers['x-monitoring-token'];
  if (!token || token !== process.env.HEALTH_TOKEN) {
    logger.warn('Unauthorized health check attempt', { ip: req.ip, path: req.originalUrl });
    return res.status(403).json({ status: 'forbidden', message: 'Unauthorized access to health endpoint' });
  }
  next();
};

app.get('/health/redis', healthAuth, async (req, res) => {
  try {
    const ping = await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
    ]);
    res
      .status(ping === 'PONG' ? 200 : 503)
      .json({ status: ping === 'PONG' ? 'ok' : 'unhealthy', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Redis health check failed', { stack: err.stack });
    res.status(503).json({ status: 'error', message: 'Redis unreachable' });
  }
});

app.get('/health', healthAuth, async (req, res) => {
  const health = { redis: 'unknown', db: 'unknown', email: 'unknown', timestamp: new Date().toISOString() };

  try {
    const ping = await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
    ]);
    health.redis = ping === 'PONG' ? 'ok' : 'unhealthy';
  } catch (err) {
    health.redis = 'unreachable';
    logger.error('Redis health check failed', { stack: err.stack });
  }

  try {
    await pool.query('SELECT 1');
    health.db = 'ok';
  } catch (err) {
    health.db = 'unreachable';
    logger.error('DB health check failed', { stack: err.stack });
  }

  try {
    await nodemailerTransporter.verify();
    health.email = 'ok';
  } catch (err) {
    health.email = 'unreachable';
    logger.error('SMTP health check failed', { stack: err.stack });
  }

  const allOk = Object.values(health).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'error', services: health });
});

// -------------------- ERROR HANDLING --------------------
app.use(errorHandler);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({ success: false, message: `Cannot find ${req.originalUrl}` });
});

// Disable x-powered-by
app.disable('x-powered-by');

module.exports = app;
