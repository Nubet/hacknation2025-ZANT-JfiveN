/**
 * OpenRouter AI Service for ZANT Accident Assistant
 * Handles all AI-related operations: data extraction, question generation, response parsing
 */

import {
    EXTRACTION_SYSTEM_PROMPT,
    PARSE_RESPONSE_SYSTEM_PROMPT,
    buildExtractionUserPrompt,
    buildParseResponseUserPrompt
} from './aiPrompts.js';

import {
    getQuestionText,
    generateFirstQuestion,
    buildInitialSummary
} from './questionHelpers.js';

import {
    fallbackExtraction,
    fallbackParseResponse
} from './fallbackHandlers.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Make a request to OpenRouter API
 */
async function callOpenRouter(messages, jsonSchema = null) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'openai/gpt-4o-mini';

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
        console.warn('[OpenRouter] No API key configured, using fallback responses');
        return null;
    }

    const requestBody = {
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000
    };

    if (jsonSchema) {
        requestBody.response_format = { type: 'json_object' };
    }

    try {
        console.log('[OpenRouter] Calling API with model:', model);
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3001',
                'X-Title': 'ZANT Accident Assistant'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[OpenRouter] API error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        console.log('[OpenRouter] API response received');
        return data.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error('[OpenRouter] Request failed:', error.message);
        return null;
    }
}

/**
 * Extract structured data from user's accident narrative
 */
export async function extractDataFromNarrative(description, firstName, lastName, pesel, phoneNumber) {
    const userPrompt = buildExtractionUserPrompt(description, firstName, lastName, pesel, phoneNumber);

    const response = await callOpenRouter([
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
    ], true);

    if (!response) {
        return fallbackExtraction(description, firstName, lastName, pesel, phoneNumber);
    }

    try {
        const parsed = JSON.parse(response);
        console.log('[OpenRouter] Extracted data:', JSON.stringify(parsed, null, 2));
        return parsed;
    } catch (e) {
        console.error('[OpenRouter] Failed to parse extraction response:', e.message);
        return fallbackExtraction(description, firstName, lastName, pesel, phoneNumber);
    }
}

/**
 * Determine what information is still missing and needs to be collected
 */
export function determineMissingInfo(extractedData, collectedData = {}) {
    const missing = {
        critical: [],
        recommended: [],
        documents: []
    };

    // POSZKODOWANY (Injured person data)
    if (!extractedData?.poszkodowany?.data_urodzenia && !collectedData?.data_urodzenia) {
        missing.recommended.push({ id: 'data_urodzenia', label: 'Data urodzenia poszkodowanego' });
    }
    if (!extractedData?.poszkodowany?.dokument_tozsamosci && !collectedData?.dokument_tozsamosci) {
        missing.recommended.push({ id: 'dokument_tozsamosci', label: 'Numer i rodzaj dokumentu tożsamości' });
    }
    if (!extractedData?.poszkodowany?.adres_zamieszkania && !collectedData?.adres_zamieszkania) {
        missing.critical.push({ id: 'adres_zamieszkania', label: 'Adres zamieszkania poszkodowanego' });
    }

    // WYPADEK (Accident data)
    if (!extractedData?.accident?.date && !extractedData?.wypadek?.data) {
        missing.critical.push({ id: 'accident_date', label: 'Data wypadku' });
    }
    if (!extractedData?.accident?.time && !extractedData?.wypadek?.godzina) {
        missing.recommended.push({ id: 'accident_time', label: 'Godzina wypadku' });
    }
    if (!extractedData?.accident?.place && !extractedData?.wypadek?.miejsce) {
        missing.critical.push({ id: 'accident_place', label: 'Miejsce wypadku' });
    }
    if (!extractedData?.accident?.circumstances && !extractedData?.wypadek?.opis_okolicznosci) {
        missing.critical.push({ id: 'circumstances', label: 'Okoliczności wypadku' });
    }
    if (!extractedData?.accident?.cause) {
        missing.recommended.push({ id: 'cause', label: 'Przyczyna wypadku' });
    }

    // URAZ (Injury data)
    if (!extractedData?.injury?.description && !extractedData?.urazy?.opis) {
        missing.critical.push({ id: 'injury_description', label: 'Opis doznanych obrażeń' });
    }
    if (!extractedData?.injury?.body_parts || extractedData.injury.body_parts.length === 0) {
        missing.recommended.push({ id: 'body_parts', label: 'Uszkodzone części ciała' });
    }

    // Pierwsza pomoc
    if (extractedData?.urazy?.pierwsza_pomoc?.udzielono === null &&
        collectedData?.pierwsza_pomoc_udzielono === undefined) {
        missing.recommended.push({ id: 'pierwsza_pomoc_udzielono', label: 'Czy udzielono pierwszej pomocy' });
    }
    if ((extractedData?.urazy?.pierwsza_pomoc?.udzielono === true ||
         collectedData?.pierwsza_pomoc_udzielono === true) &&
        !extractedData?.urazy?.pierwsza_pomoc?.kto_udzielil &&
        !collectedData?.pierwsza_pomoc_kto) {
        missing.recommended.push({ id: 'pierwsza_pomoc_kto', label: 'Kto udzielił pierwszej pomocy' });
    }

    // Hospitalizacja
    if (extractedData?.urazy?.hospitalizacja?.czy_hospitalizowany === null &&
        collectedData?.czy_hospitalizowany === undefined) {
        missing.critical.push({ id: 'czy_hospitalizowany', label: 'Czy był hospitalizowany' });
    }

    const hasMedicalFacility = extractedData?.injury?.medical_facility ||
                              extractedData?.urazy?.hospitalizacja?.nazwa_placowki ||
                              collectedData?.medical_facility ||
                              collectedData?.nazwa_placowki;

    if (!hasMedicalFacility) {
        missing.critical.push({ id: 'medical_facility', label: 'Nazwa placówki medycznej' });
    }

    const hasMedicalAddress = extractedData?.urazy?.hospitalizacja?.adres_placowki ||
                             collectedData?.adres_placowki;
    if (hasMedicalFacility && !hasMedicalAddress) {
        missing.recommended.push({ id: 'adres_placowki', label: 'Adres placówki medycznej' });
    }

    if (!collectedData?.has_medical_docs) {
        missing.recommended.push({ id: 'medical_docs', label: 'Dokumentacja medyczna' });
    }

    // ŚWIADKOWIE (Witnesses)
    const witnessPresent = extractedData?.witnesses?.were_present ?? collectedData?.witnesses_present;
    if (witnessPresent === null || witnessPresent === undefined) {
        missing.critical.push({ id: 'witness_presence', label: 'Czy byli świadkowie' });
    } else if (witnessPresent === true) {
        const hasWitnessData = (extractedData?.witnesses?.witness_data?.length > 0) ||
                              (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie.some(s => s.imie_nazwisko)) ||
                              collectedData?.witness_data;

        if (!hasWitnessData) {
            missing.critical.push({ id: 'witness_data', label: 'Dane świadka (imię, nazwisko)' });
        } else {
            const hasWitnessAddress = (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie.some(s => s.adres)) ||
                                     collectedData?.witness_address;
            if (!hasWitnessAddress) {
                missing.recommended.push({ id: 'witness_address', label: 'Adres świadka' });
            }
        }
    }

    // ZWIĄZEK Z PRACĄ (Work context)
    if (!extractedData?.work_context?.task_performed && !collectedData?.task_performed) {
        missing.recommended.push({ id: 'task_performed', label: 'Czynność wykonywana w momencie wypadku' });
    }

   // Documents
    if (extractedData?.injury?.description || (extractedData?.urazy?.opis)) {
        if (!collectedData?.has_medical_docs) {
            missing.documents.push('Dokumentacja medyczna potwierdzająca uraz');
        }
    }

    if (extractedData?.accident?.mechanism === 'TRAFFIC') {
        missing.documents.push('Notatka policji z miejsca zdarzenia (wypadek komunikacyjny)');
    }

    if (collectedData?.witnesses_present === true) {
        missing.documents.push('Oświadczenie świadka zdarzenia');
    }

    missing.documents.push('Kopia dokumentu potwierdzającego prowadzenie działalności gospodarczej (CEIDG, KRS)');

    return missing;
}

/**
 * Generate follow-up questions based on extracted data
 */
export async function generateFollowUpQuestions(extractedData, caseContext) {
    const missingInfo = determineMissingInfo(extractedData, {});

    const { firstQuestion, questionId } = generateFirstQuestion(missingInfo);
    const summary = buildInitialSummary(extractedData);

    return {
        initial_summary: summary,
        first_question: firstQuestion,
        question_id: questionId,
        missing_critical: missingInfo.critical,
        missing_recommended: missingInfo.recommended
    };
}

/**
 * Parse user's chat response and extract data, then determine next question
 */
export async function parseUserResponse(message, questionId, extractedData, caseData) {
    const collectedData = caseData.collected_data || {};
    const missingInfo = determineMissingInfo(extractedData, collectedData);

    const userPrompt = buildParseResponseUserPrompt(
        message,
        questionId,
        extractedData,
        collectedData,
        missingInfo,
        getQuestionText
    );

    const response = await callOpenRouter([
        { role: 'system', content: PARSE_RESPONSE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
    ], true);

    if (!response) {
        return fallbackParseResponse(message, questionId, extractedData, collectedData);
    }

    try {
        const parsed = JSON.parse(response);
        console.log('[OpenRouter] Parsed response:', JSON.stringify(parsed, null, 2));
        return transformAIResponse(parsed);
    } catch (e) {
        console.error('[OpenRouter] Failed to parse chat response:', e.message);
        return fallbackParseResponse(message, questionId, extractedData, collectedData);
    }
}

/**
 * Transform AI response to expected format
 */
function transformAIResponse(aiResponse) {
    const extracted = aiResponse.extracted_info || {};

    return {
        extracted_info: {
            field_updated: null,
            new_value: null,
            accident_date: extracted.accident_date || null,
            accident_time: extracted.accident_time || null,
            accident_place: extracted.accident_place || null,
            cause: extracted.cause || null,
            injury_description: extracted.injury_description || null,
            body_parts: extracted.body_parts || null,
            witness_name: extracted.witness_data || extracted.witness_name || null,
            witness_address: extracted.witness_address || null,
            medical_facility_name: extracted.medical_facility || extracted.nazwa_placowki || null,
            medical_facility_address: extracted.adres_placowki || null,
            has_medical_docs: extracted.has_medical_docs,
            task_performed: extracted.task_performed || null,
            additional_facts: extracted.additional_facts || [],
            data_urodzenia: extracted.data_urodzenia || null,
            dokument_tozsamosci: extracted.dokument_tozsamosci || null,
            adres_zamieszkania: extracted.adres_zamieszkania || null,
            pierwsza_pomoc_udzielono: extracted.pierwsza_pomoc_udzielono ?? extracted.pierwsza_pomoc?.udzielono ?? null,
            pierwsza_pomoc_kto: extracted.pierwsza_pomoc_kto || extracted.pierwsza_pomoc?.kto_udzielil || null,
            czy_hospitalizowany: extracted.czy_hospitalizowany ?? extracted.hospitalizacja?.czy_hospitalizowany ?? null,
            nazwa_placowki: extracted.nazwa_placowki || extracted.hospitalizacja?.nazwa_placowki || null,
            adres_placowki: extracted.adres_placowki || extracted.hospitalizacja?.adres_placowki || null
        },
        assistant_reply: aiResponse.assistant_reply || 'Dziękuję za informację.',
        next_question_id: aiResponse.next_question_id || null,
        case_updates: {
            witnesses_present: extracted.witnesses_present,
            has_medical_docs: extracted.has_medical_docs,
            data_urodzenia: extracted.data_urodzenia,
            dokument_tozsamosci: extracted.dokument_tozsamosci,
            adres_zamieszkania: extracted.adres_zamieszkania,
            pierwsza_pomoc_udzielono: extracted.pierwsza_pomoc_udzielono,
            pierwsza_pomoc_kto: extracted.pierwsza_pomoc_kto,
            czy_hospitalizowany: extracted.czy_hospitalizowany,
            nazwa_placowki: extracted.nazwa_placowki,
            adres_placowki: extracted.adres_placowki,
            witness_data: extracted.witness_data,
            witness_address: extracted.witness_address,
            medical_facility: extracted.medical_facility || extracted.nazwa_placowki
        },
        data_complete: aiResponse.data_complete || false
    };
}

export default {
    extractDataFromNarrative,
    generateFollowUpQuestions,
    parseUserResponse,
    determineMissingInfo
};

