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
const path = require("path");

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
const paymentRoutes = require("./routes/payment"); // Paystack initialize/verify
const checkoutRoutes = require("./routes/checkout"); // New checkout route

const app = express();

// -------------------- SECURITY MIDDLEWARE --------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "wss:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
}));
app.use(hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});


const allowedOrigins = [
  'https://fosten-e-commerce-frontend.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from frontend or server-to-server (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Optional: respond to preflight requests
app.options('*', cors());

// -------------------- GLOBAL MIDDLEWARE --------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xssClean());
app.use(hpp());
app.use(cookieParser(process.env.COOKIE_SECRET));


// -------------------- CSRF FIX --------------------
// Initialize csurf once
const csrfProtection = csurf({
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict' }
});

// Apply CSRF only to non-API routes
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next(); // skip API
    csrfProtection(req, res, next); // protect server-rendered routes
  });

  // Optional: expose CSRF token for server-rendered forms
  app.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
}


app.use(compression());

// -------------------- STATIC FILES --------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // <-- This serves uploaded files

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req) => req.url.includes('/api/docs') || req.url.includes('/health'),
    stream: { write: message => logger.info(message.trim()) }
  }));
} else {
  app.use(morgan('dev'));
}

// -------------------- ROUTES --------------------
// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promotions', promotionRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/checkout", checkoutRoutes);

app.get('/hello', (req, res) => {
  res.send('Hello from your backend!');
});

app.get('/test', (req, res) => {
  res.send('This is a test route!');
});

// Swagger docs (non-prod)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

//-------------------- HEALTH AUTH --------------------
const healthAuth = (req, res, next) => {
  const token = req.headers['x-monitoring-token'];
  if (!token || token !== process.env.HEALTH_TOKEN) {
    logger.warn('Unauthorized health check attempt', { ip: req.ip, path: req.originalUrl });
    return res.status(403).json({ status: 'forbidden', message: 'Unauthorized access to health endpoint' });
  }
  next();
};

// -------------------- HEALTH CHECKS --------------------
// Redis health
app.get('/health/redis', healthAuth, async (req, res) => {
  try {
    const ping = await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
    ]);
    res.status(ping === 'PONG' ? 200 : 503).json({ status: ping === 'PONG' ? 'ok' : 'unhealthy', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Redis health check failed', { stack: err.stack });
    res.status(503).json({ status: 'error', message: 'Redis unreachable' });
  }
});

// Combined health
app.get('/health', healthAuth, async (req, res) => {
  const health = { redis: 'unknown', db: 'unknown', email: 'unknown', timestamp: new Date().toISOString() };

  try {
    const ping = await Promise.race([redisClient.ping(), new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))]);
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

  const allOk = Object.values(health).every(v => v === 'ok');
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
