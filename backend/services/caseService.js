/**
 * Case Service
 * Handles all case-related operations including storage and retrieval
 */

import { v4 as uuidv4 } from 'uuid';
import { extractDataFromNarrative, generateFollowUpQuestions, parseUserResponse } from './openrouterService.js';
import { evaluateDefinition, calculateProgress, computeMissingInfo, computeEntitlementDecision } from './definitionService.js';
import { generateDocuments } from './documentService.js';

// In-memory storage for cases
const cases = new Map();
let caseCounter = 123;

/**
 * Create a new case from initial form data
 */
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

/**
 * Get case by ID
 */
export function getCase(caseId) {
    return cases.get(caseId) || null;
}

/**
 * Get case status
 */
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

/**
 * Get documents preview
 */
export function getDocumentsPreview(caseId) {
    const caseData = cases.get(caseId);
    if (!caseData) {
        return null;
    }

    const extractedData = caseData.extractedData || {};
    const definition = evaluateDefinition(extractedData, caseData);

    return generateDocuments(caseData, extractedData, definition);
}

/**
 * Get chat history
 */
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

/**
 * Process chat message
 */
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

/**
 * Update case data from parsed AI response
 */
function updateCaseFromParsedResponse(caseData, parseResult) {
    const extractedInfo = parseResult.extracted_info || {};
    const caseUpdates = parseResult.case_updates || {};

    // Initialize collected_data if needed
    if (!caseData.collected_data) {
        caseData.collected_data = {};
    }

    // Initialize extractedData if needed
    if (!caseData.extractedData) {
        caseData.extractedData = { accident: {}, injury: {}, work_context: {}, witnesses: {} };
    }

    // Update accident info in extractedData
    if (extractedInfo.accident_date) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.date = extractedInfo.accident_date;
    }
    if (extractedInfo.accident_time) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.time = extractedInfo.accident_time;
    }
    if (extractedInfo.accident_place) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.place = extractedInfo.accident_place;
    }
    if (extractedInfo.cause) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.cause = extractedInfo.cause;
    }

    // Update injury info in extractedData
    if (extractedInfo.injury_description) {
        caseData.extractedData.injury = caseData.extractedData.injury || {};
        caseData.extractedData.injury.description = extractedInfo.injury_description;
    }
    if (extractedInfo.body_parts && extractedInfo.body_parts.length > 0) {
        caseData.extractedData.injury = caseData.extractedData.injury || {};
        caseData.extractedData.injury.body_parts = extractedInfo.body_parts;
    }

    // Update work context
    if (extractedInfo.task_performed) {
        caseData.extractedData.work_context = caseData.extractedData.work_context || {};
        caseData.extractedData.work_context.task_performed = extractedInfo.task_performed;
        caseData.collected_data.task_performed = extractedInfo.task_performed;
    }

    // Update witness info
    if (caseUpdates.witnesses_present !== undefined) {
        caseData.collected_data.witnesses_present = caseUpdates.witnesses_present;
        caseData.extractedData.witnesses = caseData.extractedData.witnesses || {};
        caseData.extractedData.witnesses.were_present = caseUpdates.witnesses_present;
    }
    if (extractedInfo.witness_name) {
        caseData.collected_data.witness_data = extractedInfo.witness_name;
        caseData.extractedData.witnesses = caseData.extractedData.witnesses || {};
        caseData.extractedData.witnesses.witness_data = [extractedInfo.witness_name];
        if (extractedInfo.witness_address) {
            caseData.collected_data.witness_data += `, ${extractedInfo.witness_address}`;
        }
    }

    // Update medical info
    if (extractedInfo.medical_facility_name) {
        caseData.collected_data.medical_facility = extractedInfo.medical_facility_name;
        if (extractedInfo.medical_facility_address) {
            caseData.collected_data.medical_facility += `, ${extractedInfo.medical_facility_address}`;
        }
    }
    if (extractedInfo.has_medical_docs !== undefined && extractedInfo.has_medical_docs !== null) {
        caseData.collected_data.has_medical_docs = extractedInfo.has_medical_docs;
    }
    if (caseUpdates.has_medical_docs !== undefined) {
        caseData.collected_data.has_medical_docs = caseUpdates.has_medical_docs;
    }

    // Update extracted data with additional facts
    if (extractedInfo.additional_facts?.length > 0) {
        if (!caseData.extractedData.extracted_facts) {
            caseData.extractedData.extracted_facts = [];
        }
        caseData.extractedData.extracted_facts.push(...extractedInfo.additional_facts);
    }

    console.log('[CaseService] Updated collected_data:', caseData.collected_data);
}

/**
 * Get all cases (for debugging)
 */
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
    getChatHistory,
    processChat,
    getAllCases
};

