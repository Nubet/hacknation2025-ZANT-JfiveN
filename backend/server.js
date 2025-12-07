/**
 * ZANT Accident Assistant Backend Server
 * Express.js server with OpenRouter AI integration
 *
 * Run with: npm start
 * Development: npm run dev
 * Server runs on http://localhost:3001
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import caseRoutes from './routes/caseRoutes.js';
import debugRoutes from './routes/debugRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/cases', caseRoutes);
app.use('/api/debug', debugRoutes);

// ==========================================
// HEALTH CHECK & INFO
// ==========================================

app.get('/health', (req, res) => {
    const hasApiKey = process.env.OPENROUTER_API_KEY &&
                      process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here';

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        aiEnabled: hasApiKey,
        model: process.env.AI_MODEL || 'openai/gpt-4o-mini'
    });
});

app.get('/', (req, res) => {
    const hasApiKey = process.env.OPENROUTER_API_KEY &&
                      process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here';

    res.json({
        message: 'ZANT Backend Server with AI Integration',
        version: '1.0.0',
        aiStatus: hasApiKey ? 'enabled' : 'disabled (using fallback responses)',
        endpoints: {
            'POST /api/cases/init': 'Initialize a new accident case',
            'GET /api/cases/:caseId/status': 'Get case status',
            'GET /api/cases/:caseId/documents': 'Get document previews',
            'POST /api/cases/:caseId/chat': 'Send chat message',
            'GET /api/cases/:caseId/chat': 'Get chat history',
            'GET /api/debug/cases': 'List all cases (debug)',
            'GET /health': 'Health check'
        }
    });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

// Global error handler
app.use((err, req, res) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Wystąpił nieoczekiwany błąd serwera',
        details: process.env.NODE_ENV === 'development' ? { error: err.message } : null
    });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    const hasApiKey = process.env.OPENROUTER_API_KEY &&
                      process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here';

    console.log('');
    console.log('========================================');
    console.log('   ZANT Backend Server');
    console.log('========================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('');
    console.log(`AI Integration: ${hasApiKey ? 'ENABLED' : 'DISABLED (using fallback responses)'}`);
    if (hasApiKey) {
        console.log(`AI Model: ${process.env.AI_MODEL || 'openai/gpt-4o-mini'}`);
    } else {
        console.log('To enable AI, set OPENROUTER_API_KEY in .env file');
    }
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST   /api/cases/init');
    console.log('  GET    /api/cases/:caseId/status');
    console.log('  GET    /api/cases/:caseId/documents');
    console.log('  POST   /api/cases/:caseId/chat');
    console.log('  GET    /api/cases/:caseId/chat');
    console.log('  GET    /health');
    console.log('========================================');
    console.log('');
});

