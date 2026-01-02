import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { connectDB } from './config/database'
import authRoutes from './routes/auth'
import chatRoutes from './routes/chat'
import calendarRoutes from './routes/calendar'
import campaignRoutes from './routes/campaign'
import uploadRoutes from './routes/upload'
import facebookRoutes from './routes/facebook'
import instagramRoutes from './routes/instagram'
import { errorHandler } from './middleware/errorHandler'
import linkedinRoutes from "./routes/linkedin";
import twitterRoutes from "./routes/twitter";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env vars
dotenv.config()

// Connect to database
connectDB()

const app = express()
const PORT = process.env.PORT || 5000

// CORS configuration - must be FIRST, before any other middleware
// In production, only allow frontend domain. In development, allow all origins.
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:3000', // Development frontend
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true)
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}))

// Body parsing middleware
// Increase limit to 250MB for video uploads (LinkedIn allows up to 200MB videos)
app.use(express.json({ limit: '250mb' }))
app.use(express.urlencoded({ extended: true, limit: '250mb' }))

// Static file serving for uploaded images
// NOTE: On Render, the file system is ephemeral. Files will be lost when the service restarts.
// This is acceptable for testing, but production should use cloud storage (AWS S3, Cloudinary, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/facebook', facebookRoutes)
app.use('/api/instagram', instagramRoutes)
app.use("/linkedin", linkedinRoutes);
app.use("/api/twitter", twitterRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Melo API' })
})

// Error Handler
app.use(errorHandler)

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown handlers
process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught Exception:', error)
  console.error('Stack:', error.stack)
  // Close server gracefully
  server.close(() => {
    console.log('Server closed due to uncaught exception')
    process.exit(1)
  })
})

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[FATAL] Unhandled Rejection at:', promise)
  console.error('Reason:', reason)
  // Close server gracefully
  server.close(() => {
    console.log('Server closed due to unhandled rejection')
    process.exit(1)
  })
})

// Graceful shutdown on SIGTERM and SIGINT
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})
