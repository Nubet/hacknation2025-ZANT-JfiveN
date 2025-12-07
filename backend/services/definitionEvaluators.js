/**
 * Definition Evaluators
 * Helper functions for evaluating individual legal elements
 */

export function evaluateSuddenness(data) {
    const hasDate = !!data?.accident?.date;
    const hasTime = !!data?.accident?.time;
    const hasCircumstances = !!data?.accident?.circumstances;

    if (hasDate && hasTime && hasCircumstances) {
        return {
            status: 'COMPLETE',
            explanation: 'Z opisu wynika jedno zdarzenie w określonym dniu i godzinie.'
        };
    } else if (hasDate || hasCircumstances) {
        return {
            status: 'PARTIAL',
            explanation: hasDate
                ? 'Podano datę zdarzenia, brak dokładnej godziny.'
                : 'Opisano okoliczności, brak precyzyjnej daty i godziny.'
        };
    } else {
        return {
            status: 'EMPTY',
            explanation: 'Brak informacji o dacie i czasie zdarzenia.'
        };
    }
}

export function evaluateExternalCause(data) {
    const hasMechanism = !!data?.accident?.mechanism;
    const hasCause = !!data?.accident?.cause;
    const hasCircumstances = !!data?.accident?.circumstances;
    const hasSurfaceCondition = !!data?.surface_condition;

    const factorsCount = [hasMechanism, hasCause, hasCircumstances, hasSurfaceCondition].filter(Boolean).length;

    if (factorsCount >= 3) {
        return {
            status: 'COMPLETE',
            explanation: 'Zidentyfikowano zewnętrzną przyczynę zdarzenia i okoliczności.'
        };
    } else if (factorsCount >= 1) {
        return {
            status: 'PARTIAL',
            explanation: hasMechanism
                ? `Wskazano mechanizm zdarzenia (${translateMechanism(data.accident.mechanism)}). Trwa doprecyzowanie szczegółów.`
                : 'Opisano okoliczności. Wymagane doprecyzowanie przyczyny zewnętrznej.'
        };
    } else {
        return {
            status: 'EMPTY',
            explanation: 'Brak informacji o przyczynie zewnętrznej zdarzenia.'
        };
    }
}

export function evaluateInjury(data, caseData) {
    const hasInjuryDescription = !!data?.injury?.description;
    const hasBodyParts = data?.injury?.body_parts?.length > 0;
    const hasMedicalFacility = !!data?.injury?.medical_facility || !!caseData?.collected_data?.medical_facility;
    const hasMedicalDocs = caseData?.collected_data?.has_medical_docs === true;

    const factorsCount = [hasInjuryDescription, hasBodyParts, hasMedicalFacility, hasMedicalDocs].filter(Boolean).length;

    if (factorsCount >= 3) {
        return {
            status: 'COMPLETE',
            explanation: 'Uraz udokumentowany z opisem i potwierdzeniem medycznym.'
        };
    } else if (factorsCount >= 1) {
        let explanation = 'Opisano uraz.';
        if (!hasMedicalFacility) {
            explanation += ' Wymagana informacja o placówce medycznej.';
        }
        if (!hasMedicalDocs) {
            explanation += ' Zalecana dokumentacja medyczna.';
        }
        return {
            status: 'PARTIAL',
            explanation
        };
    } else {
        return {
            status: 'EMPTY',
            explanation: 'Brak informacji o urazie doznanym w wyniku zdarzenia.'
        };
    }
}

export function evaluateWorkRelation(data, caseData) {
    const hasTaskPerformed = !!data?.work_context?.task_performed;
    const wasDuringWork = data?.work_context?.was_during_work;
    const hasPlace = !!data?.accident?.place;
    const hasCommuteType = !!data?.work_context?.commute_type;

    // Self-employed context - if description mentions work activities
    const descriptionMentionsWork = caseData?.description &&
        /prac|działaln|zlecen|klient|firma|magazyn|biur/i.test(caseData.description);

    const factorsCount = [hasTaskPerformed, wasDuringWork, hasPlace, descriptionMentionsWork].filter(Boolean).length;

    if (factorsCount >= 3) {
        return {
            status: 'COMPLETE',
            explanation: 'Zdarzenie miało miejsce podczas wykonywania działalności gospodarczej.'
        };
    } else if (factorsCount >= 1 || hasCommuteType) {
        return {
            status: 'PARTIAL',
            explanation: hasCommuteType
                ? `Zdarzenie w kontekście: ${translateCommuteType(data.work_context.commute_type)}. Wymagane doprecyzowanie.`
                : 'Zdarzenie prawdopodobnie związane z pracą. Wymagane doprecyzowanie czynności.'
        };
    } else {
        return {
            status: 'EMPTY',
            explanation: 'Brak informacji o związku zdarzenia z wykonywaną pracą.'
        };
    }
}

function translateMechanism(mechanism) {
    const translations = {
        'SLIP_TRIP_FALL': 'poślizgnięcie/upadek',
        'MACHINE': 'maszyna/urządzenie',
        'TRAFFIC': 'wypadek komunikacyjny',
        'FALLING_OBJECT': 'spadający przedmiot',
        'MANUAL_HANDLING': 'przenoszenie ładunku',
        'OTHER': 'inne'
    };
    return translations[mechanism] || mechanism;
}

function translateCommuteType(commuteType) {
    const translations = {
        'GOING_TO_WORK': 'dojazd do pracy',
        'COMING_FROM_WORK': 'powrót z pracy',
        'WORK_TASK': 'wykonywanie zadania służbowego'
    };
    return translations[commuteType] || commuteType;
}

export default {
    evaluateSuddenness,
    evaluateExternalCause,
    evaluateInjury,
    evaluateWorkRelation
};

