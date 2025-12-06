/**
 * OpenRouter AI Service for ZANT Accident Assistant
 * Handles all AI-related operations: data extraction, question generation, response parsing
 */

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

    // Add JSON response format if schema provided
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
    const systemPrompt = `Jesteś asystentem prawnym specjalizującym się w wypadkach przy pracy w Polsce.
Twoim zadaniem jest wyciągnięcie strukturyzowanych danych z opisu wypadku.

Zawsze odpowiadaj TYLKO w formacie JSON, bez żadnego tekstu przed ani po.

Struktura odpowiedzi:
{
  "accident": {
    "date": "data wypadku w formacie YYYY-MM-DD lub null jeśli nie podano",
    "time": "godzina wypadku w formacie HH:MM lub null jeśli nie podano",
    "place": "dokładne miejsce wypadku (np. magazyn firmy X, ulica Y) lub null",
    "place_type": "WAREHOUSE|OFFICE|ROAD|HOME|CONSTRUCTION|OTHER lub null",
    "circumstances": "szczegółowy opis okoliczności lub null",
    "cause": "przyczyna wypadku (np. mokra podłoga, uszkodzone narzędzie) lub null",
    "mechanism": "SLIP_TRIP_FALL|MACHINE|TRAFFIC|FALLING_OBJECT|MANUAL_HANDLING|OTHER lub null"
  },
  "injury": {
    "description": "opis doznanych obrażeń lub null",
    "body_parts": ["lista uszkodzonych części ciała, np. kolano, ręka, głowa"],
    "medical_help": "czy udzielono pomocy medycznej: true/false/null",
    "medical_facility": "nazwa i adres placówki medycznej lub null"
  },
  "work_context": {
    "task_performed": "czynność wykonywana w momencie wypadku lub null",
    "was_during_work": "czy podczas wykonywania pracy/działalności: true/false/null",
    "employer_or_business": "nazwa firmy lub działalności lub null"
  },
  "witnesses": {
    "were_present": "czy byli świadkowie: true/false/null (null jeśli nie wiadomo)",
    "witness_data": ["lista świadków z danymi jeśli podano, np. 'Jan Kowalski, ul. Przykładowa 1, Warszawa'"]
  },
  "surface_condition": "DRY|WET|ICY|SLIPPERY|null",
  "extracted_facts": ["lista wszystkich kluczowych faktów wyciągniętych z opisu"]
}

WAŻNE: Ustaw wartość na null tylko gdy informacja NIE została podana w opisie. Nie zgaduj!`;

    const userPrompt = `Przeanalizuj poniższy opis wypadku i wyciągnij WSZYSTKIE dostępne informacje.

Dane poszkodowanego:
- Imię: ${firstName}
- Nazwisko: ${lastName}
- PESEL: ${pesel}
${phoneNumber ? `- Telefon: ${phoneNumber}` : ''}

Opis wypadku napisany przez poszkodowanego:
"${description}"

Odpowiedz TYLKO w formacie JSON.`;

    const response = await callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], true);

    if (!response) {
        return fallbackExtraction(description);
    }

    try {
        const parsed = JSON.parse(response);
        console.log('[OpenRouter] Extracted data:', JSON.stringify(parsed, null, 2));
        return parsed;
    } catch (e) {
        console.error('[OpenRouter] Failed to parse extraction response:', e.message);
        return fallbackExtraction(description);
    }
}

/**
 * Fallback extraction when AI is not available
 */
function fallbackExtraction(description) {
    const dateMatch = description.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/);
    const timeMatch = description.match(/(\d{1,2})[:\.](\d{2})/);

    const hasSlip = /poślizg|poślizną|śliski|mokr/i.test(description);
    const hasFall = /upad|przewróci|spadł/i.test(description);
    const hasMachine = /maszyn|urządzen|narzędzi/i.test(description);
    const hasInjury = /uraz|złam|skalecz|ból|zranien|obraż/i.test(description);
    const hasMedical = /szpital|lekarz|pogotow|SOR|przychodn/i.test(description);

    let mechanism = null;
    if (hasSlip || hasFall) mechanism = 'SLIP_TRIP_FALL';
    else if (hasMachine) mechanism = 'MACHINE';

    // Extract place from common patterns
    let place = null;
    const placeMatch = description.match(/w (magazynie|biurze|sklepie|hali|budynku|zakładzie)[^,.]*/i);
    if (placeMatch) place = placeMatch[0];

    // Extract injury description
    let injuryDesc = null;
    const injuryMatch = description.match(/uraz[^,.]*|złaman[^,.]*|skaleczen[^,.]*/i);
    if (injuryMatch) injuryDesc = injuryMatch[0];

    return {
        accident: {
            date: dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : null,
            time: timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null,
            place: place,
            place_type: place ? 'OTHER' : null,
            circumstances: description.substring(0, 300),
            cause: hasSlip ? 'mokra/śliska powierzchnia' : null,
            mechanism: mechanism
        },
        injury: {
            description: injuryDesc || (hasInjury ? 'uraz wymagający weryfikacji' : null),
            body_parts: [],
            medical_help: hasMedical ? true : null,
            medical_facility: null
        },
        work_context: {
            task_performed: null,
            was_during_work: true,
            employer_or_business: null
        },
        witnesses: {
            were_present: null,
            witness_data: []
        },
        surface_condition: hasSlip ? 'WET' : null,
        extracted_facts: [description.substring(0, 150)]
    };
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

    // Critical information required for ZUS
    if (!extractedData?.accident?.date) {
        missing.critical.push({ id: 'accident_date', label: 'Data wypadku' });
    }
    if (!extractedData?.accident?.time) {
        missing.recommended.push({ id: 'accident_time', label: 'Godzina wypadku' });
    }
    if (!extractedData?.accident?.place) {
        missing.critical.push({ id: 'accident_place', label: 'Miejsce wypadku' });
    }
    if (!extractedData?.accident?.circumstances) {
        missing.critical.push({ id: 'circumstances', label: 'Okoliczności wypadku' });
    }
    if (!extractedData?.accident?.cause) {
        missing.critical.push({ id: 'cause', label: 'Przyczyna wypadku' });
    }

    // Injury information
    if (!extractedData?.injury?.description) {
        missing.critical.push({ id: 'injury_description', label: 'Opis doznanych obrażeń' });
    }
    if (!extractedData?.injury?.body_parts || extractedData.injury.body_parts.length === 0) {
        missing.recommended.push({ id: 'body_parts', label: 'Uszkodzone części ciała' });
    }

    // Medical information
    if (!extractedData?.injury?.medical_facility && !collectedData?.medical_facility) {
        missing.critical.push({ id: 'medical_facility', label: 'Nazwa i adres placówki medycznej' });
    }
    if (collectedData?.has_medical_docs !== true) {
        missing.documents.push({ id: 'medical_docs', label: 'Dokumentacja medyczna potwierdzająca uraz' });
    }

    // Witness information
    if (extractedData?.witnesses?.were_present === null && collectedData?.witnesses_present === undefined) {
        missing.critical.push({ id: 'witness_presence', label: 'Informacja o obecności świadków' });
    } else if ((extractedData?.witnesses?.were_present === true || collectedData?.witnesses_present === true)
               && (!extractedData?.witnesses?.witness_data?.length && !collectedData?.witness_data)) {
        missing.critical.push({ id: 'witness_data', label: 'Dane świadka (imię, nazwisko, adres)' });
    }

    // Work context
    if (!extractedData?.work_context?.task_performed) {
        missing.recommended.push({ id: 'task_performed', label: 'Czynność wykonywana w chwili wypadku' });
    }

    return missing;
}

/**
 * Generate follow-up questions based on missing data
 */
export async function generateFollowUpQuestions(extractedData, caseData, collectedData = {}) {
    const missingInfo = determineMissingInfo(extractedData, collectedData);

    const systemPrompt = `Jesteś asystentem pomagającym w zgłaszaniu wypadków przy pracy w Polsce.
Analizujesz zebrane dane i określasz, które informacje są jeszcze potrzebne.

Musisz wygenerować JEDNO konkretne pytanie dotyczące PIERWSZEJ brakującej krytycznej informacji.

Odpowiedz TYLKO w formacie JSON:
{
  "initial_summary": "Krótkie (2-3 zdania) podsumowanie tego, co już wiesz o wypadku. Wymień konkretne fakty.",
  "first_question": "Jedno konkretne pytanie o pierwszą brakującą informację. Pytanie powinno być jasne i łatwe do odpowiedzenia.",
  "question_id": "ID pytania z listy: accident_date|accident_time|accident_place|circumstances|cause|injury_description|body_parts|medical_facility|medical_docs|witness_presence|witness_data|task_performed|additional_info",
  "missing_critical": ["lista POLSKICH nazw brakujących krytycznych informacji"],
  "missing_recommended": ["lista POLSKICH nazw brakujących zalecanych informacji"]
}`;

    const userPrompt = `Dane poszkodowanego:
- Imię: ${caseData.first_name}
- Nazwisko: ${caseData.last_name}

Wyciągnięte dane z opisu wypadku:
${JSON.stringify(extractedData, null, 2)}

Dodatkowe zebrane dane:
${JSON.stringify(collectedData, null, 2)}

Lista brakujących informacji:
- KRYTYCZNE: ${missingInfo.critical.map(m => m.label).join(', ') || 'brak'}
- ZALECANE: ${missingInfo.recommended.map(m => m.label).join(', ') || 'brak'}
- DOKUMENTY: ${missingInfo.documents.map(m => m.label).join(', ') || 'brak'}

Oryginalny opis wypadku:
"${caseData.description}"

Wygeneruj podsumowanie i JEDNO pytanie o pierwszą brakującą krytyczną informację.`;

    const response = await callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], true);

    if (!response) {
        return fallbackQuestions(extractedData, missingInfo);
    }

    try {
        const parsed = JSON.parse(response);
        console.log('[OpenRouter] Generated questions:', JSON.stringify(parsed, null, 2));
        return parsed;
    } catch (e) {
        console.error('[OpenRouter] Failed to parse questions response:', e.message);
        return fallbackQuestions(extractedData, missingInfo);
    }
}

/**
 * Fallback questions when AI is not available
 */
function fallbackQuestions(extractedData, missingInfo = null) {
    if (!missingInfo) {
        missingInfo = determineMissingInfo(extractedData, {});
    }

    const missing_critical = missingInfo.critical.map(m => m.label);
    const missing_recommended = missingInfo.recommended.map(m => m.label);

    // Determine first question based on what's missing
    let firstQuestion = 'Czy możesz potwierdzić, że opis wypadku jest kompletny?';
    let questionId = 'confirm_description';

    if (missingInfo.critical.length > 0) {
        const firstMissing = missingInfo.critical[0];
        questionId = firstMissing.id;

        switch (firstMissing.id) {
            case 'accident_date':
                firstQuestion = 'Proszę podać dokładną datę wypadku (dzień, miesiąc, rok).';
                break;
            case 'accident_place':
                firstQuestion = 'Proszę podać dokładne miejsce, gdzie doszło do wypadku (adres, nazwa firmy/lokalizacji).';
                break;
            case 'cause':
                firstQuestion = 'Co było bezpośrednią przyczyną wypadku? (np. mokra podłoga, uszkodzone narzędzie, itp.)';
                break;
            case 'injury_description':
                firstQuestion = 'Proszę opisać jakich obrażeń doznałeś/aś w wyniku wypadku.';
                break;
            case 'medical_facility':
                firstQuestion = 'W jakiej placówce medycznej udzielono Ci pomocy? Podaj nazwę i adres (np. SOR Szpitala X, ul. Y).';
                break;
            case 'witness_presence':
                firstQuestion = 'Czy w momencie wypadku był obecny jakiś świadek zdarzenia?';
                break;
            case 'witness_data':
                firstQuestion = 'Proszę podać dane świadka wypadku: imię, nazwisko oraz adres zamieszkania.';
                break;
            default:
                firstQuestion = `Proszę uzupełnić informację: ${firstMissing.label}`;
        }
    }

    // Build summary based on what we know
    const facts = [];
    if (extractedData?.accident?.date) facts.push(`data: ${extractedData.accident.date}`);
    if (extractedData?.accident?.time) facts.push(`godzina: ${extractedData.accident.time}`);
    if (extractedData?.accident?.place) facts.push(`miejsce: ${extractedData.accident.place}`);
    if (extractedData?.injury?.description) facts.push(`uraz: ${extractedData.injury.description}`);

    const summary = facts.length > 0
        ? `Dziękuję za zgłoszenie. Z opisu wynika: ${facts.join(', ')}. Muszę zebrać kilka dodatkowych informacji wymaganych przez ZUS.`
        : 'Dziękuję za zgłoszenie wypadku. Muszę zadać kilka pytań, aby zebrać wszystkie informacje wymagane przez ZUS.';

    return {
        initial_summary: summary,
        first_question: firstQuestion,
        question_id: questionId,
        missing_critical,
        missing_recommended
    };
}

/**
 * Parse user's chat response and extract data, then determine next question
 */
export async function parseUserResponse(message, questionId, extractedData, caseData) {
    const collectedData = caseData.collected_data || {};
    const missingInfo = determineMissingInfo(extractedData, collectedData);

    const systemPrompt = `Jesteś asystentem przetwarzającym odpowiedzi użytkownika dotyczące wypadku przy pracy.

ZADANIE:
1. Wyciągnij informacje z odpowiedzi użytkownika
2. Określ następne pytanie na podstawie listy brakujących informacji
3. Wygeneruj naturalną odpowiedź asystenta

Odpowiedz TYLKO w formacie JSON:
{
  "extracted_info": {
    "accident_date": "data jeśli podana (YYYY-MM-DD) lub null",
    "accident_time": "godzina jeśli podana (HH:MM) lub null",
    "accident_place": "miejsce jeśli podane lub null",
    "cause": "przyczyna jeśli podana lub null",
    "injury_description": "opis urazu jeśli podany lub null",
    "body_parts": ["części ciała jeśli podane"] lub null,
    "medical_facility": "placówka medyczna jeśli podana lub null",
    "has_medical_docs": true/false/null,
    "witnesses_present": true/false/null,
    "witness_data": "dane świadka jeśli podane lub null",
    "task_performed": "czynność wykonywana jeśli podana lub null",
    "additional_facts": ["inne istotne fakty z odpowiedzi"]
  },
  "assistant_reply": "Naturalna, pomocna odpowiedź po polsku. Potwierdź co zanotowałeś i zadaj następne pytanie.",
  "next_question_id": "ID następnego pytania lub null jeśli zebrano wszystko",
  "data_complete": false
}

WAŻNE: 
- Jeśli użytkownik odpowiedział na pytanie, ZAWSZE zadaj następne pytanie z listy brakujących informacji
- Odpowiedź asystenta powinna być naturalna i potwierdzać otrzymane informacje
- Jeśli nie ma więcej pytań, ustaw next_question_id na null i data_complete na true`;

    const userPrompt = `Aktualne pytanie (ID: ${questionId}): ${getQuestionText(questionId)}

Odpowiedź użytkownika: "${message}"

Aktualnie zebrane dane o wypadku:
${JSON.stringify(extractedData, null, 2)}

Dodatkowe zebrane dane:
${JSON.stringify(collectedData, null, 2)}

Lista WCIĄŻ brakujących informacji (po tej odpowiedzi użytkownika):
- KRYTYCZNE: ${missingInfo.critical.map(m => `${m.id}: ${m.label}`).join(', ') || 'brak'}
- ZALECANE: ${missingInfo.recommended.map(m => `${m.id}: ${m.label}`).join(', ') || 'brak'}

Przetwórz odpowiedź, wyciągnij dane i określ następne pytanie.`;

    const response = await callOpenRouter([
        { role: 'system', content: systemPrompt },
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
 * Get question text by ID for context
 */
function getQuestionText(questionId) {
    const questions = {
        'confirm_description': 'Czy opis wypadku jest kompletny?',
        'accident_date': 'Proszę podać datę wypadku.',
        'accident_time': 'Proszę podać godzinę wypadku.',
        'accident_place': 'Proszę podać miejsce wypadku.',
        'circumstances': 'Proszę opisać okoliczności wypadku.',
        'cause': 'Co było przyczyną wypadku?',
        'injury_description': 'Jakich obrażeń doznałeś/aś?',
        'body_parts': 'Które części ciała zostały uszkodzone?',
        'medical_facility': 'W jakiej placówce medycznej udzielono pomocy?',
        'medical_docs': 'Czy posiadasz dokumentację medyczną?',
        'witness_presence': 'Czy był świadek wypadku?',
        'witness_data': 'Proszę podać dane świadka.',
        'task_performed': 'Jaką czynność wykonywałeś w momencie wypadku?',
        'additional_info': 'Czy jest coś jeszcze do dodania?'
    };
    return questions[questionId] || questionId;
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
            witness_name: extracted.witness_data || null,
            witness_address: null,
            medical_facility_name: extracted.medical_facility || null,
            medical_facility_address: null,
            has_medical_docs: extracted.has_medical_docs,
            task_performed: extracted.task_performed || null,
            additional_facts: extracted.additional_facts || []
        },
        assistant_reply: aiResponse.assistant_reply || 'Dziękuję za informację.',
        next_question_id: aiResponse.next_question_id || null,
        case_updates: {
            witnesses_present: extracted.witnesses_present,
            has_medical_docs: extracted.has_medical_docs
        },
        data_complete: aiResponse.data_complete || false
    };
}

/**
 * Fallback response parsing when AI is not available
 */
function fallbackParseResponse(message, questionId, extractedData, collectedData) {
    const lowerMessage = message.toLowerCase();
    let assistantReply = '';
    let nextQuestionId = null;
    const extracted_info = {
        field_updated: null,
        new_value: null,
        accident_date: null,
        accident_time: null,
        accident_place: null,
        cause: null,
        injury_description: null,
        body_parts: null,
        witness_name: null,
        witness_address: null,
        medical_facility_name: null,
        medical_facility_address: null,
        has_medical_docs: null,
        task_performed: null,
        additional_facts: []
    };
    const case_updates = {};

    // Determine what's still missing after this answer
    const updatedCollected = { ...collectedData };

    switch (questionId) {
        case 'confirm_description':
            // Check what's missing and ask the first missing thing
            if (extractedData?.witnesses?.were_present === null) {
                assistantReply = 'Dziękuję za potwierdzenie. Czy w momencie wypadku był obecny jakiś świadek zdarzenia?';
                nextQuestionId = 'witness_presence';
            } else if (!extractedData?.injury?.medical_facility && !collectedData?.medical_facility) {
                assistantReply = 'Dziękuję. W jakiej placówce medycznej udzielono Ci pierwszej pomocy? Podaj nazwę i adres.';
                nextQuestionId = 'medical_facility';
            } else {
                assistantReply = 'Dziękuję. Czy jest coś jeszcze, co chciałbyś dodać do zgłoszenia?';
                nextQuestionId = 'additional_info';
            }
            break;

        case 'witness_presence':
            if (lowerMessage.includes('tak') || lowerMessage.includes('był') || lowerMessage.includes('świadek') || lowerMessage.includes('obecn')) {
                assistantReply = 'Rozumiem, że był świadek zdarzenia. Proszę podać dane świadka: imię, nazwisko oraz adres zamieszkania. Te informacje są wymagane w dokumentacji ZUS.';
                nextQuestionId = 'witness_data';
                case_updates.witnesses_present = true;
            } else {
                assistantReply = 'Zanotowałem, że nie było świadków zdarzenia. W jakiej placówce medycznej udzielono Ci pierwszej pomocy? Podaj proszę nazwę i adres.';
                nextQuestionId = 'medical_facility';
                case_updates.witnesses_present = false;
            }
            break;

        case 'witness_data':
            extracted_info.witness_name = message.trim();
            extracted_info.additional_facts.push(`Świadek: ${message}`);
            assistantReply = 'Dziękuję, zanotowałem dane świadka. W jakiej placówce medycznej udzielono Ci pierwszej pomocy? Podaj proszę nazwę i adres.';
            nextQuestionId = 'medical_facility';
            break;

        case 'medical_facility':
            extracted_info.medical_facility_name = message.trim();
            extracted_info.additional_facts.push(`Placówka medyczna: ${message}`);
            assistantReply = 'Dziękuję za informację o placówce medycznej. Czy posiadasz dokumentację medyczną z tej wizyty (np. kartę informacyjną z SOR, zaświadczenie lekarskie)?';
            nextQuestionId = 'medical_docs';
            break;

        case 'medical_docs':
            if (lowerMessage.includes('tak') || lowerMessage.includes('mam') || lowerMessage.includes('posiadam')) {
                extracted_info.has_medical_docs = true;
                case_updates.has_medical_docs = true;
                // Check if we need task_performed
                if (!extractedData?.work_context?.task_performed && !collectedData?.task_performed) {
                    assistantReply = 'Świetnie, dokumentacja medyczna jest bardzo ważna. Proszę opisać, jaką dokładnie czynność wykonywałeś/aś w momencie wypadku.';
                    nextQuestionId = 'task_performed';
                } else {
                    assistantReply = 'Świetnie! Zebrałem wszystkie niezbędne informacje. Możesz przejrzeć wygenerowane dokumenty w panelu po prawej stronie. Czy jest coś jeszcze, co chciałbyś dodać?';
                    nextQuestionId = 'additional_info';
                }
            } else {
                extracted_info.has_medical_docs = false;
                case_updates.has_medical_docs = false;
                assistantReply = 'Rozumiem. Zalecam uzyskanie dokumentacji medycznej - jest istotna dla ZUS. ';
                if (!extractedData?.work_context?.task_performed && !collectedData?.task_performed) {
                    assistantReply += 'Proszę opisać, jaką dokładnie czynność wykonywałeś/aś w momencie wypadku.';
                    nextQuestionId = 'task_performed';
                } else {
                    assistantReply += 'Czy jest coś jeszcze, co chciałbyś dodać do zgłoszenia?';
                    nextQuestionId = 'additional_info';
                }
            }
            break;

        case 'task_performed':
            extracted_info.task_performed = message.trim();
            extracted_info.additional_facts.push(`Wykonywana czynność: ${message}`);
            assistantReply = 'Dziękuję, zanotowałem. Zebrałem wszystkie podstawowe informacje. Możesz przejrzeć wygenerowane dokumenty w panelu po prawej stronie. Czy jest coś jeszcze, co chciałbyś dodać?';
            nextQuestionId = 'additional_info';
            break;

        case 'additional_info':
            if (lowerMessage.includes('nie') && lowerMessage.length < 30) {
                assistantReply = 'Dziękuję za wszystkie informacje. Dokumenty zostały wygenerowane i możesz je przejrzeć w panelu po prawej stronie. W razie pytań jestem do dyspozycji.';
                nextQuestionId = null;
            } else {
                extracted_info.additional_facts.push(message);
                assistantReply = 'Dziękuję za dodatkowe informacje, zostały uwzględnione w dokumentacji. Czy chciałbyś dodać coś jeszcze?';
                nextQuestionId = 'additional_info';
            }
            break;

        case 'accident_date':
            // Try to extract date
            const dateMatch = message.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/);
            if (dateMatch) {
                extracted_info.accident_date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
            }
            assistantReply = 'Dziękuję, zanotowałem datę. ';
            // Next missing item
            if (!extractedData?.accident?.place) {
                assistantReply += 'Proszę podać dokładne miejsce, gdzie doszło do wypadku.';
                nextQuestionId = 'accident_place';
            } else if (extractedData?.witnesses?.were_present === null) {
                assistantReply += 'Czy w momencie wypadku był obecny jakiś świadek?';
                nextQuestionId = 'witness_presence';
            } else {
                nextQuestionId = 'medical_facility';
                assistantReply += 'W jakiej placówce medycznej udzielono Ci pomocy?';
            }
            break;

        case 'accident_place':
            extracted_info.accident_place = message.trim();
            assistantReply = 'Zanotowałem miejsce wypadku. ';
            if (extractedData?.witnesses?.were_present === null) {
                assistantReply += 'Czy w momencie wypadku był obecny jakiś świadek?';
                nextQuestionId = 'witness_presence';
            } else {
                assistantReply += 'W jakiej placówce medycznej udzielono Ci pomocy?';
                nextQuestionId = 'medical_facility';
            }
            break;

        case 'injury_description':
            extracted_info.injury_description = message.trim();
            assistantReply = 'Dziękuję za opis obrażeń. ';
            if (!collectedData?.medical_facility && !extractedData?.injury?.medical_facility) {
                assistantReply += 'W jakiej placówce medycznej udzielono Ci pomocy? Podaj nazwę i adres.';
                nextQuestionId = 'medical_facility';
            } else if (extractedData?.witnesses?.were_present === null) {
                assistantReply += 'Czy w momencie wypadku był obecny jakiś świadek?';
                nextQuestionId = 'witness_presence';
            } else {
                assistantReply += 'Czy jest coś jeszcze, co chciałbyś dodać?';
                nextQuestionId = 'additional_info';
            }
            break;

        default:
            assistantReply = 'Dziękuję za informację. Czy jest coś jeszcze, co chciałbyś dodać do zgłoszenia?';
            nextQuestionId = 'additional_info';
    }

    return {
        extracted_info,
        assistant_reply: assistantReply,
        next_question_id: nextQuestionId,
        case_updates,
        data_complete: nextQuestionId === null
    };
}

export default {
    extractDataFromNarrative,
    generateFollowUpQuestions,
    parseUserResponse,
    determineMissingInfo
};

