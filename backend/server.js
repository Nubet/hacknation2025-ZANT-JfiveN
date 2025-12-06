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
import caseService from './services/caseService.js';

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
// API ENDPOINTS
// ==========================================

/**
 * POST /api/cases/init
 * Initialize a new accident case
 */
app.post('/api/cases/init', async (req, res) => {
    console.log('[Server] POST /api/cases/init');
    console.log('[Server] Request body:', JSON.stringify(req.body, null, 2));

    const { first_name, last_name, pesel, phone_number, description } = req.body;

    // Validation
    if (!first_name || !last_name || !pesel || !description) {
        console.log('[Server] Validation error - missing required fields');
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'Wszystkie wymagane pola muszą być wypełnione',
            details: {
                missingFields: ['first_name', 'last_name', 'pesel', 'description'].filter(
                    f => !req.body[f]
                )
            }
        });
    }

    try {
        const result = await caseService.createCase({
            first_name,
            last_name,
            pesel,
            phone_number,
            description
        });

        console.log(`[Server] Case created: ${result.caseId}`);
        res.status(201).json(result);
    } catch (error) {
        console.error('[Server] Error creating case:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message: 'Wystąpił błąd podczas tworzenia sprawy',
            details: { error: error.message }
        });
    }
});

/**
 * GET /api/cases/:caseId/status
 * Get current status of a case
 */
app.get('/api/cases/:caseId/status', (req, res) => {
    const caseId = decodeURIComponent(req.params.caseId);
    console.log(`[Server] GET /api/cases/${caseId}/status`);

    const status = caseService.getCaseStatus(caseId);

    if (!status) {
        console.log(`[Server] Case not found: ${caseId}`);
        return res.status(404).json({
            code: 'CASE_NOT_FOUND',
            message: 'Sprawa o podanym identyfikatorze nie istnieje.'
        });
    }

    console.log(`[Server] Returning status for ${caseId}, progress: ${status.progressPercent}%`);
    res.json(status);
});

/**
 * GET /api/cases/:caseId/documents
 * Get document previews for a case
 */
app.get('/api/cases/:caseId/documents', (req, res) => {
    const caseId = decodeURIComponent(req.params.caseId);
    console.log(`[Server] GET /api/cases/${caseId}/documents`);

    const documents = caseService.getDocumentsPreview(caseId);

    if (!documents) {
        console.log(`[Server] Case not found: ${caseId}`);
        return res.status(404).json({
            code: 'CASE_NOT_FOUND',
            message: 'Sprawa o podanym identyfikatorze nie istnieje.'
        });
    }

    console.log(`[Server] Returning documents preview for ${caseId}`);
    res.json(documents);
});

/**
 * POST /api/cases/:caseId/chat
 * Send a chat message for a case
 */
app.post('/api/cases/:caseId/chat', async (req, res) => {
    const caseId = decodeURIComponent(req.params.caseId);
    const { message, questionId } = req.body;

    console.log(`[Server] POST /api/cases/${caseId}/chat`);
    console.log('[Server] Message:', message);
    console.log('[Server] QuestionId:', questionId);

    if (!message) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'Wiadomość nie może być pusta'
        });
    }

    try {
        const result = await caseService.processChat(caseId, message, questionId);

        if (!result) {
            console.log(`[Server] Case not found: ${caseId}`);
            return res.status(404).json({
                code: 'CASE_NOT_FOUND',
                message: 'Sprawa o podanym identyfikatorze nie istnieje.'
            });
        }

        console.log(`[Server] Chat processed for ${caseId}, next question: ${result.nextQuestionId}`);
        res.json(result);
    } catch (error) {
        console.error('[Server] Error processing chat:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message: 'Wystąpił błąd podczas przetwarzania wiadomości',
            details: { error: error.message }
        });
    }
});

/**
 * GET /api/cases/:caseId/chat
 * Get chat history for a case
 */
app.get('/api/cases/:caseId/chat', (req, res) => {
    const caseId = decodeURIComponent(req.params.caseId);
    console.log(`[Server] GET /api/cases/${caseId}/chat`);

    const chatHistory = caseService.getChatHistory(caseId);

    if (!chatHistory) {
        console.log(`[Server] Case not found: ${caseId}`);
        return res.status(404).json({
            code: 'CASE_NOT_FOUND',
            message: 'Sprawa o podanym identyfikatorze nie istnieje.'
        });
    }

    console.log(`[Server] Returning chat history for ${caseId}, ${chatHistory.messages.length} messages`);
    res.json(chatHistory);
});

// ==========================================
// DEBUG ENDPOINTS
// ==========================================

/**
 * GET /api/debug/cases
 * List all cases (for debugging)
 */
app.get('/api/debug/cases', (req, res) => {
    const cases = caseService.getAllCases();
    res.json({
        count: cases.length,
        cases
    });
});

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
app.use((err, req, res, next) => {
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

