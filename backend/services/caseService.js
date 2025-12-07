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
        caseData.extractedData = {
            accident: {},
            injury: {},
            work_context: {},
            witnesses: {},
            poszkodowany: {},
            wypadek: {},
            urazy: {
                pierwsza_pomoc: {},
                hospitalizacja: {}
            },
            swiadkowie: []
        };
    }

    // Initialize Polish structure if needed
    if (!caseData.extractedData.poszkodowany) {
        caseData.extractedData.poszkodowany = {};
    }
    if (!caseData.extractedData.wypadek) {
        caseData.extractedData.wypadek = {};
    }
    if (!caseData.extractedData.urazy) {
        caseData.extractedData.urazy = { pierwsza_pomoc: {}, hospitalizacja: {} };
    }
    if (!caseData.extractedData.urazy.pierwsza_pomoc) {
        caseData.extractedData.urazy.pierwsza_pomoc = {};
    }
    if (!caseData.extractedData.urazy.hospitalizacja) {
        caseData.extractedData.urazy.hospitalizacja = {};
    }
    if (!caseData.extractedData.swiadkowie) {
        caseData.extractedData.swiadkowie = [];
    }

    // === POSZKODOWANY (Injured person) ===
    if (extractedInfo.adres_zamieszkania || caseUpdates.adres_zamieszkania) {
        const value = extractedInfo.adres_zamieszkania || caseUpdates.adres_zamieszkania;
        caseData.extractedData.poszkodowany.adres_zamieszkania = value;
        caseData.collected_data.adres_zamieszkania = value;
    }
    if (extractedInfo.data_urodzenia || caseUpdates.data_urodzenia) {
        const value = extractedInfo.data_urodzenia || caseUpdates.data_urodzenia;
        caseData.extractedData.poszkodowany.data_urodzenia = value;
        caseData.collected_data.data_urodzenia = value;
    }
    if (extractedInfo.dokument_tozsamosci || caseUpdates.dokument_tozsamosci) {
        const value = extractedInfo.dokument_tozsamosci || caseUpdates.dokument_tozsamosci;
        caseData.extractedData.poszkodowany.dokument_tozsamosci = value;
        caseData.collected_data.dokument_tozsamosci = value;
    }

    // === WYPADEK (Accident) ===
    // Update accident info in extractedData (both Polish and English)
    if (extractedInfo.accident_date) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.date = extractedInfo.accident_date;
        caseData.extractedData.wypadek.data = extractedInfo.accident_date;
    }
    if (extractedInfo.accident_time) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.time = extractedInfo.accident_time;
        caseData.extractedData.wypadek.godzina = extractedInfo.accident_time;
    }
    if (extractedInfo.accident_place) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.place = extractedInfo.accident_place;
        caseData.extractedData.wypadek.miejsce = extractedInfo.accident_place;
    }
    if (extractedInfo.cause) {
        caseData.extractedData.accident = caseData.extractedData.accident || {};
        caseData.extractedData.accident.cause = extractedInfo.cause;
    }

    // === URAZY (Injuries) ===
    // Update injury info in extractedData (both Polish and English)
    if (extractedInfo.injury_description) {
        caseData.extractedData.injury = caseData.extractedData.injury || {};
        caseData.extractedData.injury.description = extractedInfo.injury_description;
        caseData.extractedData.urazy.opis = extractedInfo.injury_description;
    }
    if (extractedInfo.body_parts && extractedInfo.body_parts.length > 0) {
        caseData.extractedData.injury = caseData.extractedData.injury || {};
        caseData.extractedData.injury.body_parts = extractedInfo.body_parts;
    }

    // Pierwsza pomoc (First aid)
    if (extractedInfo.pierwsza_pomoc_udzielono !== undefined && extractedInfo.pierwsza_pomoc_udzielono !== null) {
        caseData.extractedData.urazy.pierwsza_pomoc.udzielono = extractedInfo.pierwsza_pomoc_udzielono;
        caseData.collected_data.pierwsza_pomoc_udzielono = extractedInfo.pierwsza_pomoc_udzielono;
    }
    if (caseUpdates.pierwsza_pomoc_udzielono !== undefined) {
        caseData.extractedData.urazy.pierwsza_pomoc.udzielono = caseUpdates.pierwsza_pomoc_udzielono;
        caseData.collected_data.pierwsza_pomoc_udzielono = caseUpdates.pierwsza_pomoc_udzielono;
    }
    if (extractedInfo.pierwsza_pomoc_kto || caseUpdates.pierwsza_pomoc_kto) {
        const value = extractedInfo.pierwsza_pomoc_kto || caseUpdates.pierwsza_pomoc_kto;
        caseData.extractedData.urazy.pierwsza_pomoc.kto_udzielil = value;
        caseData.collected_data.pierwsza_pomoc_kto = value;
    }

    // Hospitalizacja (Hospitalization)
    if (extractedInfo.czy_hospitalizowany !== undefined && extractedInfo.czy_hospitalizowany !== null) {
        caseData.extractedData.urazy.hospitalizacja.czy_hospitalizowany = extractedInfo.czy_hospitalizowany;
        caseData.collected_data.czy_hospitalizowany = extractedInfo.czy_hospitalizowany;
    }
    if (caseUpdates.czy_hospitalizowany !== undefined) {
        caseData.extractedData.urazy.hospitalizacja.czy_hospitalizowany = caseUpdates.czy_hospitalizowany;
        caseData.collected_data.czy_hospitalizowany = caseUpdates.czy_hospitalizowany;
    }

    // Medical facility (Placówka medyczna)
    if (extractedInfo.medical_facility_name || extractedInfo.nazwa_placowki || caseUpdates.nazwa_placowki) {
        const value = extractedInfo.medical_facility_name || extractedInfo.nazwa_placowki || caseUpdates.nazwa_placowki;
        caseData.collected_data.medical_facility = value;
        caseData.collected_data.nazwa_placowki = value;
        caseData.extractedData.urazy.hospitalizacja.nazwa_placowki = value;
    }
    if (extractedInfo.medical_facility_address || extractedInfo.adres_placowki || caseUpdates.adres_placowki) {
        const value = extractedInfo.medical_facility_address || extractedInfo.adres_placowki || caseUpdates.adres_placowki;
        if (caseData.collected_data.medical_facility && !caseData.collected_data.medical_facility.includes(value)) {
            caseData.collected_data.medical_facility += `, ${value}`;
        }
        caseData.collected_data.adres_placowki = value;
        caseData.extractedData.urazy.hospitalizacja.adres_placowki = value;
    }
    if (extractedInfo.has_medical_docs !== undefined && extractedInfo.has_medical_docs !== null) {
        caseData.collected_data.has_medical_docs = extractedInfo.has_medical_docs;
    }
    if (caseUpdates.has_medical_docs !== undefined) {
        caseData.collected_data.has_medical_docs = caseUpdates.has_medical_docs;
    }

    // Update work context
    if (extractedInfo.task_performed) {
        caseData.extractedData.work_context = caseData.extractedData.work_context || {};
        caseData.extractedData.work_context.task_performed = extractedInfo.task_performed;
        caseData.collected_data.task_performed = extractedInfo.task_performed;
    }

    // === ŚWIADKOWIE (Witnesses) ===
    if (caseUpdates.witnesses_present !== undefined) {
        caseData.collected_data.witnesses_present = caseUpdates.witnesses_present;
        caseData.extractedData.witnesses = caseData.extractedData.witnesses || {};
        caseData.extractedData.witnesses.were_present = caseUpdates.witnesses_present;
    }
    if (extractedInfo.witness_name || caseUpdates.witness_data) {
        const witnessName = extractedInfo.witness_name || caseUpdates.witness_data;
        caseData.collected_data.witness_data = witnessName;
        caseData.extractedData.witnesses = caseData.extractedData.witnesses || {};
        caseData.extractedData.witnesses.witness_data = [witnessName];

        // Update Polish swiadkowie array
        if (caseData.extractedData.swiadkowie.length === 0) {
            caseData.extractedData.swiadkowie.push({ imie_nazwisko: witnessName, adres: null });
        } else {
            caseData.extractedData.swiadkowie[0].imie_nazwisko = witnessName;
        }
    }
    if (extractedInfo.witness_address || caseUpdates.witness_address) {
        const witnessAddress = extractedInfo.witness_address || caseUpdates.witness_address;
        if (caseData.collected_data.witness_data) {
            caseData.collected_data.witness_data += `, ${witnessAddress}`;
        }
        caseData.collected_data.witness_address = witnessAddress;

        // Update Polish swiadkowie array
        if (caseData.extractedData.swiadkowie.length > 0) {
            caseData.extractedData.swiadkowie[0].adres = witnessAddress;
        }
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

