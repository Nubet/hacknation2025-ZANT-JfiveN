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
  "poszkodowany": {
    "imie": "imię poszkodowanego lub null",
    "nazwisko": "nazwisko poszkodowanego lub null",
    "pesel": "numer PESEL lub null",
    "data_urodzenia": "data urodzenia w formacie YYYY-MM-DD lub null",
    "dokument_tozsamosci": "numer i rodzaj dokumentu tożsamości (np. dowód osobisty ABC123456) lub null",
    "adres_zamieszkania": "pełny adres zamieszkania lub null",
    "telefon": "numer telefonu lub null"
  },
  "wypadek": {
    "data": "data wypadku w formacie YYYY-MM-DD lub null jeśli nie podano",
    "godzina": "godzina wypadku w formacie HH:MM lub null jeśli nie podano",
    "miejsce": "dokładne miejsce wypadku (np. magazyn firmy X, ulica Y) lub null",
    "opis_okolicznosci": "szczegółowy opis okoliczności lub null"
  },
  "urazy": {
    "opis": "opis doznanych obrażeń lub null",
    "pierwsza_pomoc": {
      "udzielono": "czy udzielono pierwszej pomocy: true/false/null",
      "kto_udzielil": "kto udzielił pierwszej pomocy (np. współpracownik, ratownik) lub null"
    },
    "hospitalizacja": {
      "czy_hospitalizowany": "czy poszkodowany był hospitalizowany: true/false/null",
      "nazwa_placowki": "nazwa szpitala/placówki medycznej lub null",
      "adres_placowki": "adres placówki medycznej lub null"
    }
  },
  "swiadkowie": [
    {
      "imie_nazwisko": "imię i nazwisko świadka lub null",
      "adres": "adres świadka lub null"
    }
  ],
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

WAŻNE: 
- Ustaw wartość na null tylko gdy informacja NIE została podana w opisie. Nie zgaduj!
- Dla pola swiadkowie, jeśli nie wymieniono żadnych świadków, zwróć pustą tablicę []
- Synchronizuj dane między polami polskimi (poszkodowany, wypadek, urazy, swiadkowie) a angielskimi (accident, injury, witnesses)`;

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
 * Fallback extraction when AI is not available
 */
function fallbackExtraction(description, firstName = '', lastName = '', pesel = '', phoneNumber = '') {
    const dateMatch = description.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/);
    const timeMatch = description.match(/(\d{1,2})[:\.](\d{2})/);

    const hasSlip = /poślizg|poślizną|śliski|mokr/i.test(description);
    const hasFall = /upad|przewróci|spadł/i.test(description);
    const hasMachine = /maszyn|urządzen|narzędzi/i.test(description);
    const hasInjury = /uraz|złam|skalecz|ból|zranien|obraż/i.test(description);
    const hasMedical = /szpital|lekarz|pogotow|SOR|przychodn/i.test(description);
    const hasFirstAid = /pierwsz[aą] pomoc|opatrz|bandaż/i.test(description);

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

    // Extract hospital/medical facility name
    let hospitalName = null;
    const hospitalMatch = description.match(/(?:szpital|SOR|przychodnia|klinika)[^,.]*[^,.]*/i);
    if (hospitalMatch) hospitalName = hospitalMatch[0].trim();

    const accidentDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : null;
    const accidentTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

    return {
        poszkodowany: {
            imie: firstName || null,
            nazwisko: lastName || null,
            pesel: pesel || null,
            data_urodzenia: null,
            dokument_tozsamosci: null,
            adres_zamieszkania: null,
            telefon: phoneNumber || null
        },
        wypadek: {
            data: accidentDate,
            godzina: accidentTime,
            miejsce: place,
            opis_okolicznosci: description.substring(0, 300)
        },
        urazy: {
            opis: injuryDesc || (hasInjury ? 'uraz wymagający weryfikacji' : null),
            pierwsza_pomoc: {
                udzielono: hasFirstAid ? true : null,
                kto_udzielil: null
            },
            hospitalizacja: {
                czy_hospitalizowany: hasMedical ? true : null,
                nazwa_placowki: hospitalName,
                adres_placowki: null
            }
        },
        swiadkowie: [],
        accident: {
            date: accidentDate,
            time: accidentTime,
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
            medical_facility: hospitalName
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

    // === POSZKODOWANY (Injured person data) ===
    // Data urodzenia - can be derived from PESEL but good to have
    if (!extractedData?.poszkodowany?.data_urodzenia && !collectedData?.data_urodzenia) {
        missing.recommended.push({ id: 'data_urodzenia', label: 'Data urodzenia poszkodowanego' });
    }
    // Dokument tożsamości
    if (!extractedData?.poszkodowany?.dokument_tozsamosci && !collectedData?.dokument_tozsamosci) {
        missing.recommended.push({ id: 'dokument_tozsamosci', label: 'Numer i rodzaj dokumentu tożsamości' });
    }
    // Adres zamieszkania
    if (!extractedData?.poszkodowany?.adres_zamieszkania && !collectedData?.adres_zamieszkania) {
        missing.critical.push({ id: 'adres_zamieszkania', label: 'Adres zamieszkania poszkodowanego' });
    }

    // === WYPADEK (Accident data) ===
    // Critical information required for ZUS
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
        missing.critical.push({ id: 'cause', label: 'Przyczyna wypadku' });
    }

    // === URAZY (Injury data) ===
    // Injury information
    if (!extractedData?.injury?.description && !extractedData?.urazy?.opis) {
        missing.critical.push({ id: 'injury_description', label: 'Opis doznanych obrażeń' });
    }
    if (!extractedData?.injury?.body_parts || extractedData.injury.body_parts.length === 0) {
        missing.recommended.push({ id: 'body_parts', label: 'Uszkodzone części ciała' });
    }

    // Pierwsza pomoc (First aid)
    if (extractedData?.urazy?.pierwsza_pomoc?.udzielono === null && collectedData?.pierwsza_pomoc_udzielono === undefined) {
        missing.recommended.push({ id: 'pierwsza_pomoc_udzielono', label: 'Czy udzielono pierwszej pomocy' });
    }
    if ((extractedData?.urazy?.pierwsza_pomoc?.udzielono === true || collectedData?.pierwsza_pomoc_udzielono === true)
        && !extractedData?.urazy?.pierwsza_pomoc?.kto_udzielil && !collectedData?.pierwsza_pomoc_kto) {
        missing.recommended.push({ id: 'pierwsza_pomoc_kto', label: 'Kto udzielił pierwszej pomocy' });
    }

    // Hospitalizacja (Hospitalization)
    if (extractedData?.urazy?.hospitalizacja?.czy_hospitalizowany === null && collectedData?.czy_hospitalizowany === undefined) {
        missing.critical.push({ id: 'czy_hospitalizowany', label: 'Czy poszkodowany był hospitalizowany' });
    }

    // Medical facility information (Placówka medyczna)
    const hasMedicalFacility = extractedData?.injury?.medical_facility
        || extractedData?.urazy?.hospitalizacja?.nazwa_placowki
        || collectedData?.medical_facility
        || collectedData?.nazwa_placowki;

    if (!hasMedicalFacility) {
        missing.critical.push({ id: 'medical_facility', label: 'Nazwa placówki medycznej' });
    }

    const hasMedicalAddress = extractedData?.urazy?.hospitalizacja?.adres_placowki || collectedData?.adres_placowki;
    if (hasMedicalFacility && !hasMedicalAddress) {
        missing.recommended.push({ id: 'adres_placowki', label: 'Adres placówki medycznej' });
    }

    if (collectedData?.has_medical_docs !== true) {
        missing.documents.push({ id: 'medical_docs', label: 'Dokumentacja medyczna potwierdzająca uraz' });
    }

    // === ŚWIADKOWIE (Witnesses) ===
    // Witness information
    const witnessPresent = extractedData?.witnesses?.were_present ?? collectedData?.witnesses_present;
    if (witnessPresent === null || witnessPresent === undefined) {
        missing.critical.push({ id: 'witness_presence', label: 'Informacja o obecności świadków' });
    } else if (witnessPresent === true) {
        // Check if we have witness data
        const hasWitnessData = (extractedData?.witnesses?.witness_data?.length > 0)
            || (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie.some(s => s.imie_nazwisko))
            || collectedData?.witness_data;

        if (!hasWitnessData) {
            missing.critical.push({ id: 'witness_data', label: 'Dane świadka (imię, nazwisko)' });
        } else {
            // Check if we have witness address
            const hasWitnessAddress = (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie.some(s => s.adres))
                || collectedData?.witness_address;
            if (!hasWitnessAddress) {
                missing.recommended.push({ id: 'witness_address', label: 'Adres świadka' });
            }
        }
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
  "question_id": "ID pytania z listy: accident_date|accident_time|accident_place|circumstances|cause|injury_description|body_parts|medical_facility|adres_placowki|medical_docs|witness_presence|witness_data|witness_address|task_performed|additional_info|data_urodzenia|dokument_tozsamosci|adres_zamieszkania|pierwsza_pomoc_udzielono|pierwsza_pomoc_kto|czy_hospitalizowany",
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
                firstQuestion = 'W jakiej placówce medycznej udzielono Ci pomocy? Podaj nazwę (np. SOR Szpitala X).';
                break;
            case 'adres_placowki':
                firstQuestion = 'Proszę podać adres placówki medycznej, w której udzielono Ci pomocy.';
                break;
            case 'witness_presence':
                firstQuestion = 'Czy w momencie wypadku był obecny jakiś świadek zdarzenia?';
                break;
            case 'witness_data':
                firstQuestion = 'Proszę podać imię i nazwisko świadka wypadku.';
                break;
            case 'witness_address':
                firstQuestion = 'Proszę podać adres zamieszkania świadka.';
                break;
            case 'adres_zamieszkania':
                firstQuestion = 'Proszę podać swój adres zamieszkania (ulica, numer, kod pocztowy, miasto).';
                break;
            case 'czy_hospitalizowany':
                firstQuestion = 'Czy po wypadku byłeś/aś hospitalizowany/a (przyjęty/a do szpitala na oddział)?';
                break;
            default:
                firstQuestion = `Proszę uzupełnić informację: ${firstMissing.label}`;
        }
    } else if (missingInfo.recommended.length > 0) {
        // If no critical missing, ask about recommended
        const firstRecommended = missingInfo.recommended[0];
        questionId = firstRecommended.id;

        switch (firstRecommended.id) {
            case 'accident_time':
                firstQuestion = 'O której godzinie doszło do wypadku (w przybliżeniu)?';
                break;
            case 'body_parts':
                firstQuestion = 'Które części ciała zostały uszkodzone w wyniku wypadku?';
                break;
            case 'task_performed':
                firstQuestion = 'Jaką dokładnie czynność wykonywałeś/aś w momencie wypadku?';
                break;
            case 'data_urodzenia':
                firstQuestion = 'Proszę podać datę urodzenia (dzień, miesiąc, rok).';
                break;
            case 'dokument_tozsamosci':
                firstQuestion = 'Proszę podać numer i rodzaj dokumentu tożsamości (np. dowód osobisty ABC123456).';
                break;
            case 'pierwsza_pomoc_udzielono':
                firstQuestion = 'Czy bezpośrednio po wypadku udzielono Ci pierwszej pomocy?';
                break;
            case 'pierwsza_pomoc_kto':
                firstQuestion = 'Kto udzielił Ci pierwszej pomocy? (np. współpracownik, ratownik medyczny)';
                break;
            default:
                firstQuestion = `Proszę uzupełnić dodatkową informację: ${firstRecommended.label}`;
        }
    }

    // Build summary based on what we know
    const facts = [];
    if (extractedData?.accident?.date || extractedData?.wypadek?.data)
        facts.push(`data: ${extractedData?.accident?.date || extractedData?.wypadek?.data}`);
    if (extractedData?.accident?.time || extractedData?.wypadek?.godzina)
        facts.push(`godzina: ${extractedData?.accident?.time || extractedData?.wypadek?.godzina}`);
    if (extractedData?.accident?.place || extractedData?.wypadek?.miejsce)
        facts.push(`miejsce: ${extractedData?.accident?.place || extractedData?.wypadek?.miejsce}`);
    if (extractedData?.injury?.description || extractedData?.urazy?.opis)
        facts.push(`uraz: ${extractedData?.injury?.description || extractedData?.urazy?.opis}`);

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
    "accident_date": "data wypadku jeśli podana (YYYY-MM-DD) lub null",
    "accident_time": "godzina wypadku jeśli podana (HH:MM) lub null",
    "accident_place": "miejsce wypadku jeśli podane lub null",
    "cause": "przyczyna wypadku jeśli podana lub null",
    "injury_description": "opis urazu jeśli podany lub null",
    "body_parts": ["części ciała jeśli podane"] lub null,
    "medical_facility": "nazwa placówki medycznej jeśli podana lub null",
    "adres_placowki": "adres placówki medycznej jeśli podany lub null",
    "has_medical_docs": true/false/null,
    "witnesses_present": true/false/null,
    "witness_data": "imię i nazwisko świadka jeśli podane lub null",
    "witness_address": "adres świadka jeśli podany lub null",
    "task_performed": "czynność wykonywana jeśli podana lub null",
    "data_urodzenia": "data urodzenia jeśli podana (YYYY-MM-DD) lub null",
    "dokument_tozsamosci": "numer i rodzaj dokumentu tożsamości jeśli podany lub null",
    "adres_zamieszkania": "adres zamieszkania poszkodowanego jeśli podany lub null",
    "pierwsza_pomoc_udzielono": true/false/null,
    "pierwsza_pomoc_kto": "kto udzielił pierwszej pomocy jeśli podane lub null",
    "czy_hospitalizowany": true/false/null,
    "additional_facts": ["inne istotne fakty z odpowiedzi"]
  },
  "assistant_reply": "Naturalna, pomocna odpowiedź po polsku. Potwierdź co zanotowałeś i zadaj następne pytanie.",
  "next_question_id": "ID następnego pytania z listy: accident_date|accident_time|accident_place|circumstances|cause|injury_description|body_parts|medical_facility|adres_placowki|medical_docs|witness_presence|witness_data|witness_address|task_performed|additional_info|data_urodzenia|dokument_tozsamosci|adres_zamieszkania|pierwsza_pomoc_udzielono|pierwsza_pomoc_kto|czy_hospitalizowany lub null jeśli zebrano wszystko",
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
        'adres_placowki': 'Proszę podać adres placówki medycznej.',
        'medical_docs': 'Czy posiadasz dokumentację medyczną?',
        'witness_presence': 'Czy był świadek wypadku?',
        'witness_data': 'Proszę podać dane świadka (imię i nazwisko).',
        'witness_address': 'Proszę podać adres świadka.',
        'task_performed': 'Jaką czynność wykonywałeś w momencie wypadku?',
        'additional_info': 'Czy jest coś jeszcze do dodania?',
        // New questions for expanded Polish structure
        'data_urodzenia': 'Proszę podać datę urodzenia.',
        'dokument_tozsamosci': 'Proszę podać numer i rodzaj dokumentu tożsamości (np. dowód osobisty).',
        'adres_zamieszkania': 'Proszę podać adres zamieszkania.',
        'pierwsza_pomoc_udzielono': 'Czy bezpośrednio po wypadku udzielono Ci pierwszej pomocy?',
        'pierwsza_pomoc_kto': 'Kto udzielił Ci pierwszej pomocy? (np. współpracownik, ratownik)',
        'czy_hospitalizowany': 'Czy byłeś/aś hospitalizowany/a po wypadku?'
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
            witness_name: extracted.witness_data || extracted.witness_name || null,
            witness_address: extracted.witness_address || null,
            medical_facility_name: extracted.medical_facility || extracted.nazwa_placowki || null,
            medical_facility_address: extracted.adres_placowki || null,
            has_medical_docs: extracted.has_medical_docs,
            task_performed: extracted.task_performed || null,
            additional_facts: extracted.additional_facts || [],
            // New Polish fields
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
            adres_zamieszkania: extracted.adres_zamieszkania || null,
            data_urodzenia: extracted.data_urodzenia || null,
            dokument_tozsamosci: extracted.dokument_tozsamosci || null,
            pierwsza_pomoc_udzielono: extracted.pierwsza_pomoc_udzielono ?? null,
            pierwsza_pomoc_kto: extracted.pierwsza_pomoc_kto || null,
            czy_hospitalizowany: extracted.czy_hospitalizowany ?? null,
            nazwa_placowki: extracted.nazwa_placowki || null,
            adres_placowki: extracted.adres_placowki || null
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
        additional_facts: [],
        // New fields for Polish structure
        data_urodzenia: null,
        dokument_tozsamosci: null,
        adres_zamieszkania: null,
        pierwsza_pomoc_udzielono: null,
        pierwsza_pomoc_kto: null,
        czy_hospitalizowany: null,
        nazwa_placowki: null,
        adres_placowki: null
    };
    const case_updates = {};

    // Helper to get next missing question
    const getNextQuestion = (updatedCollected) => {
        const missingInfo = determineMissingInfo(extractedData, { ...collectedData, ...updatedCollected });
        if (missingInfo.critical.length > 0) {
            return missingInfo.critical[0].id;
        } else if (missingInfo.recommended.length > 0) {
            return missingInfo.recommended[0].id;
        }
        return 'additional_info';
    };

    switch (questionId) {
        case 'confirm_description':
            // Check what's missing and ask the first missing thing
            nextQuestionId = getNextQuestion({});
            if (nextQuestionId === 'additional_info') {
                assistantReply = 'Dziękuję za potwierdzenie. Zebrane informacje są kompletne. Czy jest coś jeszcze, co chciałbyś dodać?';
            } else {
                assistantReply = `Dziękuję za potwierdzenie. ${getQuestionText(nextQuestionId)}`;
            }
            break;

        case 'adres_zamieszkania':
            extracted_info.adres_zamieszkania = message.trim();
            extracted_info.additional_facts.push(`Adres zamieszkania: ${message}`);
            case_updates.adres_zamieszkania = message.trim();
            nextQuestionId = getNextQuestion({ adres_zamieszkania: message.trim() });
            assistantReply = `Dziękuję, zanotowałem adres zamieszkania. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'data_urodzenia':
            extracted_info.data_urodzenia = message.trim();
            case_updates.data_urodzenia = message.trim();
            nextQuestionId = getNextQuestion({ data_urodzenia: message.trim() });
            assistantReply = `Dziękuję, zanotowałem datę urodzenia. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'dokument_tozsamosci':
            extracted_info.dokument_tozsamosci = message.trim();
            case_updates.dokument_tozsamosci = message.trim();
            nextQuestionId = getNextQuestion({ dokument_tozsamosci: message.trim() });
            assistantReply = `Dziękuję, zanotowałem dane dokumentu tożsamości. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'pierwsza_pomoc_udzielono':
            if (lowerMessage.includes('tak') || lowerMessage.includes('udziel')) {
                extracted_info.pierwsza_pomoc_udzielono = true;
                case_updates.pierwsza_pomoc_udzielono = true;
                nextQuestionId = 'pierwsza_pomoc_kto';
                assistantReply = 'Rozumiem, że udzielono pierwszej pomocy. Kto udzielił Ci pierwszej pomocy? (np. współpracownik, ratownik medyczny)';
            } else {
                extracted_info.pierwsza_pomoc_udzielono = false;
                case_updates.pierwsza_pomoc_udzielono = false;
                nextQuestionId = getNextQuestion({ pierwsza_pomoc_udzielono: false });
                assistantReply = `Zanotowałem, że nie udzielono pierwszej pomocy. ${getQuestionText(nextQuestionId)}`;
            }
            break;

        case 'pierwsza_pomoc_kto':
            extracted_info.pierwsza_pomoc_kto = message.trim();
            case_updates.pierwsza_pomoc_kto = message.trim();
            nextQuestionId = getNextQuestion({ pierwsza_pomoc_kto: message.trim() });
            assistantReply = `Dziękuję, zanotowałem informację o osobie udzielającej pierwszej pomocy. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'czy_hospitalizowany':
            if (lowerMessage.includes('tak') || lowerMessage.includes('był') || lowerMessage.includes('szpital')) {
                extracted_info.czy_hospitalizowany = true;
                case_updates.czy_hospitalizowany = true;
                nextQuestionId = 'medical_facility';
                assistantReply = 'Rozumiem, że byłeś/aś hospitalizowany/a. W jakiej placówce medycznej? Podaj nazwę szpitala.';
            } else {
                extracted_info.czy_hospitalizowany = false;
                case_updates.czy_hospitalizowany = false;
                nextQuestionId = getNextQuestion({ czy_hospitalizowany: false });
                assistantReply = `Zanotowałem, że nie było hospitalizacji. ${getQuestionText(nextQuestionId)}`;
            }
            break;

        case 'witness_presence':
            if (lowerMessage.includes('tak') || lowerMessage.includes('był') || lowerMessage.includes('świadek') || lowerMessage.includes('obecn')) {
                assistantReply = 'Rozumiem, że był świadek zdarzenia. Proszę podać imię i nazwisko świadka.';
                nextQuestionId = 'witness_data';
                case_updates.witnesses_present = true;
            } else {
                assistantReply = 'Zanotowałem, że nie było świadków zdarzenia. ';
                case_updates.witnesses_present = false;
                nextQuestionId = getNextQuestion({ witnesses_present: false });
                assistantReply += getQuestionText(nextQuestionId);
            }
            break;

        case 'witness_data':
            extracted_info.witness_name = message.trim();
            extracted_info.additional_facts.push(`Świadek: ${message}`);
            case_updates.witness_data = message.trim();
            nextQuestionId = 'witness_address';
            assistantReply = 'Dziękuję. Proszę teraz podać adres zamieszkania świadka.';
            break;

        case 'witness_address':
            extracted_info.witness_address = message.trim();
            extracted_info.additional_facts.push(`Adres świadka: ${message}`);
            case_updates.witness_address = message.trim();
            nextQuestionId = getNextQuestion({ witness_address: message.trim() });
            assistantReply = `Dziękuję, zanotowałem adres świadka. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'medical_facility':
            extracted_info.medical_facility_name = message.trim();
            extracted_info.nazwa_placowki = message.trim();
            extracted_info.additional_facts.push(`Placówka medyczna: ${message}`);
            case_updates.medical_facility = message.trim();
            case_updates.nazwa_placowki = message.trim();
            nextQuestionId = 'adres_placowki';
            assistantReply = 'Dziękuję za informację o placówce medycznej. Proszę podać adres tej placówki.';
            break;

        case 'adres_placowki':
            extracted_info.medical_facility_address = message.trim();
            extracted_info.adres_placowki = message.trim();
            extracted_info.additional_facts.push(`Adres placówki: ${message}`);
            case_updates.adres_placowki = message.trim();
            nextQuestionId = 'medical_docs';
            assistantReply = 'Dziękuję. Czy posiadasz dokumentację medyczną z tej wizyty (np. kartę informacyjną z SOR, zaświadczenie lekarskie)?';
            break;

        case 'medical_docs':
            if (lowerMessage.includes('tak') || lowerMessage.includes('mam') || lowerMessage.includes('posiadam')) {
                extracted_info.has_medical_docs = true;
                case_updates.has_medical_docs = true;
                nextQuestionId = getNextQuestion({ has_medical_docs: true });
                assistantReply = `Świetnie, dokumentacja medyczna jest bardzo ważna. ${getQuestionText(nextQuestionId)}`;
            } else {
                extracted_info.has_medical_docs = false;
                case_updates.has_medical_docs = false;
                nextQuestionId = getNextQuestion({ has_medical_docs: false });
                assistantReply = `Rozumiem. Zalecam uzyskanie dokumentacji medycznej - jest istotna dla ZUS. ${getQuestionText(nextQuestionId)}`;
            }
            break;

        case 'task_performed':
            extracted_info.task_performed = message.trim();
            extracted_info.additional_facts.push(`Wykonywana czynność: ${message}`);
            case_updates.task_performed = message.trim();
            nextQuestionId = getNextQuestion({ task_performed: message.trim() });
            assistantReply = `Dziękuję, zanotowałem. ${getQuestionText(nextQuestionId)}`;
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
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję, zanotowałem datę. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'accident_time':
            const timeMatch = message.match(/(\d{1,2})[:\.](\d{2})/);
            if (timeMatch) {
                extracted_info.accident_time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
            }
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję, zanotowałem godzinę. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'accident_place':
            extracted_info.accident_place = message.trim();
            nextQuestionId = getNextQuestion({});
            assistantReply = `Zanotowałem miejsce wypadku. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'injury_description':
            extracted_info.injury_description = message.trim();
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję za opis obrażeń. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'body_parts':
            extracted_info.body_parts = message.split(/[,;]/).map(p => p.trim()).filter(p => p);
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję, zanotowałem uszkodzone części ciała. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'cause':
            extracted_info.cause = message.trim();
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję, zanotowałem przyczynę wypadku. ${getQuestionText(nextQuestionId)}`;
            break;

        case 'circumstances':
            extracted_info.additional_facts.push(`Okoliczności: ${message}`);
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję za opis okoliczności. ${getQuestionText(nextQuestionId)}`;
            break;

        default:
            nextQuestionId = getNextQuestion({});
            assistantReply = `Dziękuję za informację. ${getQuestionText(nextQuestionId)}`;
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

