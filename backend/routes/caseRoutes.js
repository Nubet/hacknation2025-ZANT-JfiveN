import express from 'express';
import caseService from '../services/caseService.js';

const router = express.Router();

router.post('/init', async (req, res) => {
    console.log('[Server] POST /api/cases/init');
    console.log('[Server] Request body:', JSON.stringify(req.body, null, 2));

    const { first_name, last_name, pesel, phone_number, description } = req.body;

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

router.get('/:caseId/status', (req, res) => {
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

router.get('/:caseId/documents', (req, res) => {
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

router.get('/:caseId/documents/employee', (req, res) => {
    const caseId = decodeURIComponent(req.params.caseId);
    console.log(`[Server] GET /api/cases/${caseId}/documents/employee`);

    const documents = caseService.getEmployeeDocumentsPreview(caseId);

    if (!documents) {
        console.log(`[Server] Case not found: ${caseId}`);
        return res.status(404).json({
            code: 'CASE_NOT_FOUND',
            message: 'Sprawa o podanym identyfikatorze nie istnieje.'
        });
    }

    console.log(`[Server] Returning employee documents preview for ${caseId} (with opinion)`);
    res.json(documents);
});

router.post('/:caseId/chat', async (req, res) => {
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

router.get('/:caseId/chat', (req, res) => {
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

export default router;

