/**
 * Debug Routes
 * Endpoints for debugging and health checks
 */

import express from 'express';
import caseService from '../services/caseService.js';

const router = express.Router();

router.get('/cases', (req, res) => {
    const cases = caseService.getAllCases();
    res.json({
        count: cases.length,
        cases
    });
});

export default router;

