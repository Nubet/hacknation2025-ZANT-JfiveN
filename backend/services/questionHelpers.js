/**
 * Question Texts and Helpers
 * Centralized question definitions and utilities
 */

export const QUESTION_TEXTS = {
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
    'data_urodzenia': 'Proszę podać datę urodzenia.',
    'dokument_tozsamosci': 'Proszę podać numer i rodzaj dokumentu tożsamości (np. dowód osobisty).',
    'adres_zamieszkania': 'Proszę podać adres zamieszkania.',
    'pierwsza_pomoc_udzielono': 'Czy bezpośrednio po wypadku udzielono Ci pierwszej pomocy?',
    'pierwsza_pomoc_kto': 'Kto udzielił Ci pierwszej pomocy? (np. współpracownik, ratownik)',
    'czy_hospitalizowany': 'Czy byłeś/aś hospitalizowany/a po wypadku?'
};

export function getQuestionText(questionId) {
    return QUESTION_TEXTS[questionId] || questionId;
}

export function generateFirstQuestion(missingInfo) {
    const firstCritical = missingInfo.critical[0];
    const firstRecommended = missingInfo.recommended[0];

    let firstQuestion = 'Dziękuję za informacje. Proszę poczekać na weryfikację.';
    let questionId = null;

    if (firstCritical) {
        questionId = firstCritical.id;
        switch (firstCritical.id) {
            case 'accident_date':
                firstQuestion = 'Proszę podać dokładną datę wypadku (dzień, miesiąc, rok).';
                break;
            case 'accident_place':
                firstQuestion = 'Proszę podać dokładne miejsce, gdzie doszło do wypadku.';
                break;
            case 'circumstances':
                firstQuestion = 'Proszę opisać szczegółowo, jak doszło do wypadku.';
                break;
            case 'injury_description':
                firstQuestion = 'Proszę opisać, jakich obrażeń doznałeś/aś w wyniku wypadku.';
                break;
            case 'medical_facility':
                firstQuestion = 'W jakiej placówce medycznej udzielono Ci pomocy? Proszę podać nazwę szpitala lub przychodni.';
                break;
            case 'witness_presence':
                firstQuestion = 'Czy był świadek zdarzenia?';
                break;
            case 'adres_zamieszkania':
                firstQuestion = 'Proszę podać swój aktualny adres zamieszkania (ulica, numer, kod pocztowy, miejscowość).';
                break;
            default:
                firstQuestion = `Proszę uzupełnić brakującą informację: ${firstCritical.label}`;
        }
    } else if (firstRecommended) {
        questionId = firstRecommended.id;
        switch (firstRecommended.id) {
            case 'accident_time':
                firstQuestion = 'Proszę podać przybliżoną godzinę, o której doszło do wypadku.';
                break;
            case 'cause':
                firstQuestion = 'Co było bezpośrednią przyczyną wypadku? (np. mokra podłoga, uszkodzone narzędzie)';
                break;
            case 'medical_docs':
                firstQuestion = 'Czy posiadasz dokumentację medyczną z wizyty u lekarza/w szpitalu?';
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

    return { firstQuestion, questionId };
}

export function buildInitialSummary(extractedData) {
    const facts = [];
    if (extractedData?.accident?.date || extractedData?.wypadek?.data)
        facts.push(`data: ${extractedData?.accident?.date || extractedData?.wypadek?.data}`);
    if (extractedData?.accident?.time || extractedData?.wypadek?.godzina)
        facts.push(`godzina: ${extractedData?.accident?.time || extractedData?.wypadek?.godzina}`);
    if (extractedData?.accident?.place || extractedData?.wypadek?.miejsce)
        facts.push(`miejsce: ${extractedData?.accident?.place || extractedData?.wypadek?.miejsce}`);
    if (extractedData?.injury?.description || extractedData?.urazy?.opis)
        facts.push(`uraz: ${extractedData?.injury?.description || extractedData?.urazy?.opis}`);

    return facts.length > 0
        ? `Dziękuję za zgłoszenie. Z opisu wynika: ${facts.join(', ')}. Muszę zebrać kilka dodatkowych informacji wymaganych przez ZUS.`
        : 'Dziękuję za zgłoszenie wypadku. Muszę zadać kilka pytań, aby zebrać wszystkie informacje wymagane przez ZUS.';
}

export default {
    QUESTION_TEXTS,
    getQuestionText,
    generateFirstQuestion,
    buildInitialSummary
};

