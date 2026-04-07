const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Security: Helmet - Set secure HTTP headers
app.use(helmet());

// Security: CORS - Configure allowed origins
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security: Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS

// Security: Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Security: Prevent HTTP Parameter Pollution
app.use(hpp());

// XSS Protection middleware
app.use((req, res, next) => {
  if (req.body) {
    const xss = require('xss');
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/habits', require('./routes/habitRoutes'));
app.use('/api/pet', require('./routes/petRoutes'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'TaskFire API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} - Rate limiting removed`);
});
