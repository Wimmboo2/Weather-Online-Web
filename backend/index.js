const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const weatherRoutes = require('./src/routes/weatherRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json());

const allowedOrigin = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (origin === allowedOrigin) {
        return callback(null, true);
      }

      return callback(new Error('CORS blocked for this origin.'));
    }
  })
);

app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: 'Too many requests, please try again later.'
    }
  })
);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/weather', weatherRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Weather backend listening on port ${port}`);
});
