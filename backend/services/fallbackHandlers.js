export function fallbackExtraction(description, firstName = '', lastName = '', pesel = '', phoneNumber = '') {
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

    let place = null;
    const placeMatch = description.match(/w (magazynie|biurze|sklepie|hali|budynku|zakładzie)[^,.]*/i);
    if (placeMatch) place = placeMatch[0];

    let injuryDesc = null;
    const injuryMatch = description.match(/uraz[^,.]*|złaman[^,.]*|skaleczen[^,.]*/i);
    if (injuryMatch) injuryDesc = injuryMatch[0];

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
 * Get next question to ask based on collected data
 */
function getNextQuestion(collectedData) {
    // Priority list of questions
    if (!collectedData.accident_date) return 'accident_date';
    if (!collectedData.accident_place) return 'accident_place';
    if (!collectedData.injury_description) return 'injury_description';
    if (!collectedData.accident_time) return 'accident_time';
    if (collectedData.czy_hospitalizowany && !collectedData.medical_facility) return 'medical_facility';
    if (!collectedData.adres_zamieszkania) return 'adres_zamieszkania';
    if (collectedData.witnesses_present && !collectedData.witness_data) return 'witness_data';
    if (collectedData.witnesses_present && !collectedData.witness_address) return 'witness_address';
    if (!collectedData.pierwsza_pomoc_udzielono) return 'pierwsza_pomoc_udzielono';
    if (!collectedData.task_performed) return 'task_performed';
    if (!collectedData.has_medical_docs) return 'medical_docs';
    return null;
}

/**
 * Fallback response parser when AI is not available
 */
export function fallbackParseResponse(message, questionId, extractedData, collectedData) {
    const lowerMessage = message.toLowerCase().trim();
    let extracted_info = {
        field_updated: questionId,
        new_value: message,
        additional_facts: []
    };
    let assistantReply = '';
    let nextQuestionId = null;
    const case_updates = {};

    // Handle specific question types
    switch (questionId) {
        case 'data_urodzenia':
            extracted_info.data_urodzenia = message.trim();
            case_updates.data_urodzenia = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, data_urodzenia: message.trim() });
            assistantReply = `Dziękuję, zanotowałem datę urodzenia. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'dokument_tozsamosci':
            extracted_info.dokument_tozsamosci = message.trim();
            case_updates.dokument_tozsamosci = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, dokument_tozsamosci: message.trim() });
            assistantReply = `Dziękuję, zanotowałem dane dokumentu tożsamości. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'adres_zamieszkania':
            extracted_info.adres_zamieszkania = message.trim();
            case_updates.adres_zamieszkania = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, adres_zamieszkania: message.trim() });
            assistantReply = `Dziękuję, zanotowałem adres zamieszkania. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'pierwsza_pomoc_udzielono':
            if (lowerMessage.includes('tak') || lowerMessage.includes('tak,') || lowerMessage.includes('była') || lowerMessage.includes('udzielono')) {
                extracted_info.pierwsza_pomoc_udzielono = true;
                case_updates.pierwsza_pomoc_udzielono = true;
                nextQuestionId = 'pierwsza_pomoc_kto';
                assistantReply = 'Rozumiem, że udzielono pierwszej pomocy. Kto jej udzielił? (np. współpracownik, ratownik medyczny)';
            } else {
                extracted_info.pierwsza_pomoc_udzielono = false;
                case_updates.pierwsza_pomoc_udzielono = false;
                nextQuestionId = getNextQuestion({ ...collectedData, pierwsza_pomoc_udzielono: false });
                assistantReply = `Zanotowałem, że nie udzielono pierwszej pomocy. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            }
            break;

        case 'pierwsza_pomoc_kto':
            extracted_info.pierwsza_pomoc_kto = message.trim();
            case_updates.pierwsza_pomoc_kto = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, pierwsza_pomoc_kto: message.trim() });
            assistantReply = `Dziękuję, zanotowałem informację o osobie udzielającej pierwszej pomocy. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
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
                nextQuestionId = getNextQuestion({ ...collectedData, czy_hospitalizowany: false });
                assistantReply = `Zanotowałem, że nie było hospitalizacji. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
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
                nextQuestionId = getNextQuestion({ ...collectedData, witnesses_present: false });
                assistantReply += nextQuestionId ? getQuestionTextFallback(nextQuestionId) : '';
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
            nextQuestionId = getNextQuestion({ ...collectedData, witness_address: message.trim() });
            assistantReply = `Dziękuję, zanotowałem adres świadka. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
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
                nextQuestionId = getNextQuestion({ ...collectedData, has_medical_docs: true });
                assistantReply = `Świetnie, dokumentacja medyczna jest bardzo ważna. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            } else {
                extracted_info.has_medical_docs = false;
                case_updates.has_medical_docs = false;
                nextQuestionId = getNextQuestion({ ...collectedData, has_medical_docs: false });
                assistantReply = `Rozumiem. Zalecam uzyskanie dokumentacji medycznej - jest istotna dla ZUS. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            }
            break;

        case 'task_performed':
            extracted_info.task_performed = message.trim();
            extracted_info.additional_facts.push(`Wykonywana czynność: ${message}`);
            case_updates.task_performed = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, task_performed: message.trim() });
            assistantReply = `Dziękuję, zanotowałem. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
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
            const dateMatch = message.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/);
            if (dateMatch) {
                extracted_info.accident_date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
            }
            nextQuestionId = getNextQuestion({ ...collectedData, accident_date: true });
            assistantReply = `Dziękuję, zanotowałem datę. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'accident_time':
            const timeMatch = message.match(/(\d{1,2})[:\.](\d{2})/);
            if (timeMatch) {
                extracted_info.accident_time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
            }
            nextQuestionId = getNextQuestion({ ...collectedData, accident_time: true });
            assistantReply = `Dziękuję, zanotowałem godzinę. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'accident_place':
            extracted_info.accident_place = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, accident_place: true });
            assistantReply = `Zanotowałem miejsce wypadku. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'injury_description':
            extracted_info.injury_description = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, injury_description: true });
            assistantReply = `Dziękuję za opis obrażeń. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'body_parts':
            extracted_info.body_parts = message.split(/[,;]/).map(p => p.trim()).filter(p => p);
            nextQuestionId = getNextQuestion({ ...collectedData, body_parts: true });
            assistantReply = `Dziękuję, zanotowałem uszkodzone części ciała. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'cause':
            extracted_info.cause = message.trim();
            nextQuestionId = getNextQuestion({ ...collectedData, cause: true });
            assistantReply = `Dziękuję, zanotowałem przyczynę wypadku. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        case 'circumstances':
            extracted_info.additional_facts.push(`Okoliczności: ${message}`);
            nextQuestionId = getNextQuestion({ ...collectedData, circumstances: true });
            assistantReply = `Dziękuję za opis okoliczności. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
            break;

        default:
            nextQuestionId = getNextQuestion(collectedData);
            assistantReply = `Dziękuję za informację. ${nextQuestionId ? getQuestionTextFallback(nextQuestionId) : ''}`;
    }

    return {
        extracted_info,
        assistant_reply: assistantReply,
        next_question_id: nextQuestionId,
        case_updates,
        data_complete: nextQuestionId === null
    };
}

function getQuestionTextFallback(questionId) {
    const questions = {
        'accident_date': 'Proszę podać datę wypadku.',
        'accident_place': 'Proszę podać miejsce wypadku.',
        'injury_description': 'Jakich obrażeń doznałeś/aś?',
        'medical_facility': 'W jakiej placówce medycznej udzielono pomocy?',
        'adres_zamieszkania': 'Proszę podać adres zamieszkania.',
        'witness_data': 'Proszę podać dane świadka.',
        'pierwsza_pomoc_udzielono': 'Czy udzielono pierwszej pomocy?',
        'task_performed': 'Jaką czynność wykonywałeś?',
        'medical_docs': 'Czy posiadasz dokumentację medyczną?'
    };
    return questions[questionId] || '';
}

export default {
    fallbackExtraction,
    fallbackParseResponse
};

