/**
 * Case Service
 * Handles all case-related operations including storage and retrieval
 */

import { v4 as uuidv4 } from 'uuid';
import { extractDataFromNarrative, generateFollowUpQuestions, parseUserResponse } from './openrouterService.js';
import { evaluateDefinition, calculateProgress, computeMissingInfo, computeEntitlementDecision } from './definitionService.js';
import { generateDocuments } from './documentService.js';
import { updateCaseFromParsedResponse } from './caseDataUpdater.js';

// In-memory storage for cases
const cases = new Map();
let caseCounter = 123;


export async function createCase(initialData) {
    const { first_name, last_name, pesel, phone_number, description } = initialData;

    // Generate case ID
    const caseId = `ZANT/2025/${String(caseCounter++).padStart(6, '0')}`;
    const createdAt = new Date().toISOString();

    console.log(`[CaseService] Creating case ${caseId}`);

    // Extract structured data from narrative using AI
    const extractedData = await extractDataFromNarrative(description, first_name, last_name, pesel, phone_number);
    console.log('[CaseService] Extracted data:', JSON.stringify(extractedData, null, 2));

    // Generate initial questions based on extracted data
    const questionsData = await generateFollowUpQuestions(extractedData, { first_name, last_name, description });
    console.log('[CaseService] Questions data:', JSON.stringify(questionsData, null, 2));

    // Create initial assistant message
    const initialMessage = {
        id: uuidv4(),
        type: 'assistant',
        content: `${questionsData.initial_summary}\n\n${questionsData.first_question}`,
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    };

    // Create case object
    const caseData = {
        caseId,
        createdAt,
        first_name,
        last_name,
        pesel,
        phone_number,
        description,
        extractedData,
        collected_data: {},
        chatHistory: [initialMessage],
        currentQuestionId: questionsData.question_id || 'confirm_description',
        questionsData
    };

    // Store case
    cases.set(caseId, caseData);
    console.log(`[CaseService] Case ${caseId} created successfully`);

    return {
        caseId,
        createdAt
    };
}

export function getCase(caseId) {
    return cases.get(caseId) || null;
}

export function getCaseStatus(caseId) {
    const caseData = cases.get(caseId);
    if (!caseData) {
        return null;
    }

    const extractedData = caseData.extractedData || {};

    // Evaluate definition status
    const definition = evaluateDefinition(extractedData, caseData);

    // Calculate progress
    const progressPercent = calculateProgress(extractedData, caseData);

    // Compute missing info
    const missingInfo = computeMissingInfo(extractedData, definition, caseData);

    // Compute entitlement decision
    const entitlementDecision = computeEntitlementDecision(definition);

    return {
        caseId,
        progressPercent,
        definition,
        missingInfo,
        entitlementDecision
    };
}

export function getDocumentsPreview(caseId) {
    const caseData = cases.get(caseId);
    if (!caseData) {
        return null;
    }

    const extractedData = caseData.extractedData || {};
    const definition = evaluateDefinition(extractedData, caseData);

    return generateDocuments(caseData, extractedData, definition);
}

export function getChatHistory(caseId) {
    const caseData = cases.get(caseId);
    if (!caseData) {
        return null;
    }

    return {
        messages: caseData.chatHistory || [],
        currentQuestionId: caseData.currentQuestionId || ''
    };
}

export async function processChat(caseId, message, questionId) {
    const caseData = cases.get(caseId);
    if (!caseData) {
        return null;
    }

    const currentQuestionId = questionId || caseData.currentQuestionId;
    console.log(`[CaseService] Processing chat for case ${caseId}, questionId: ${currentQuestionId}`);

    // Add user message to history
    const userMessage = {
        id: uuidv4(),
        type: 'user',
        content: message,
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    };
    caseData.chatHistory.push(userMessage);

    // Parse user response using AI
    const parseResult = await parseUserResponse(message, currentQuestionId, caseData.extractedData, caseData);
    console.log('[CaseService] Parse result:', JSON.stringify(parseResult, null, 2));

    // Update case data based on parsed response
    updateCaseFromParsedResponse(caseData, parseResult);

    // Update current question ID
    caseData.currentQuestionId = parseResult.next_question_id || 'complete';

    // Add assistant message to history
    const assistantMessage = {
        id: uuidv4(),
        type: 'assistant',
        content: parseResult.assistant_reply,
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    };
    caseData.chatHistory.push(assistantMessage);

    // Recompute status and documents
    const extractedData = caseData.extractedData || {};
    const definition = evaluateDefinition(extractedData, caseData);
    const progressPercent = calculateProgress(extractedData, caseData);
    const missingInfo = computeMissingInfo(extractedData, definition, caseData);
    const entitlementDecision = computeEntitlementDecision(definition);
    const documentsPreview = generateDocuments(caseData, extractedData, definition);

    const caseStatus = {
        caseId,
        progressPercent,
        definition,
        missingInfo,
        entitlementDecision
    };

    return {
        assistantReply: parseResult.assistant_reply,
        nextQuestionId: parseResult.next_question_id,
        caseStatus,
        missingInfo,
        documentsPreview
    };
}


export function getEmployeeDocumentsPreview(caseId) {
    const caseData = cases.get(caseId);
    if (!caseData) {
        return null;
    }

    const extractedData = caseData.extractedData || {};
    const definition = evaluateDefinition(extractedData, caseData);

    // Include opinion document for employee view
    return generateDocuments(caseData, extractedData, definition, true);
}

export function getAllCases() {
    return Array.from(cases.entries()).map(([id, data]) => ({
        caseId: id,
        createdAt: data.createdAt,
        firstName: data.first_name,
        lastName: data.last_name
    }));
}

export default {
    createCase,
    getCase,
    getCaseStatus,
    getDocumentsPreview,
    getEmployeeDocumentsPreview,
    getChatHistory,
    processChat,
    getAllCases
};

