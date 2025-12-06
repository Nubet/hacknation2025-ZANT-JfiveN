/**
 * Definition Evaluation Service
 * Computes status of the four legal elements of accident definition
 */

/**
 * Evaluate all four legal elements based on extracted data
 * @param {Object} extractedData - Data extracted from narrative and chat
 * @param {Object} caseData - Full case data
 * @returns {Object} DefinitionStatusSummary
 */
export function evaluateDefinition(extractedData, caseData) {
    return {
        suddenness: evaluateSuddenness(extractedData),
        externalCause: evaluateExternalCause(extractedData),
        injury: evaluateInjury(extractedData, caseData),
        workRelation: evaluateWorkRelation(extractedData, caseData)
    };
}

/**
 * Evaluate suddenness element
 * Requires: date and time of accident, single event description
 */
function evaluateSuddenness(data) {
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

/**
 * Evaluate external cause element
 * Requires: mechanism, cause description, environmental factors
 */
function evaluateExternalCause(data) {
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

/**
 * Evaluate injury element
 * Requires: injury description, body parts, medical documentation
 */
function evaluateInjury(data, caseData) {
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

/**
 * Evaluate work relation element
 * Requires: task performed, workplace, business activity context
 */
function evaluateWorkRelation(data, caseData) {
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

/**
 * Translate mechanism enum to Polish
 */
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

/**
 * Translate commute type enum to Polish
 */
function translateCommuteType(commuteType) {
    const translations = {
        'GOING_TO_WORK': 'dojazd do pracy',
        'COMING_FROM_WORK': 'powrót z pracy',
        'WORK_TASK': 'wykonywanie zadania służbowego'
    };
    return translations[commuteType] || commuteType;
}

/**
 * Calculate overall progress percentage based on collected data
 */
export function calculateProgress(extractedData, caseData) {
    let progress = 10; // Base progress for submitting initial form

    // Accident details (max 25%)
    if (extractedData?.accident?.date) progress += 5;
    if (extractedData?.accident?.time) progress += 5;
    if (extractedData?.accident?.place) progress += 5;
    if (extractedData?.accident?.mechanism) progress += 5;
    if (extractedData?.accident?.cause) progress += 5;

    // Injury details (max 20%)
    if (extractedData?.injury?.description) progress += 5;
    if (extractedData?.injury?.body_parts?.length > 0) progress += 5;
    if (extractedData?.injury?.medical_facility || caseData?.collected_data?.medical_facility) progress += 5;
    if (caseData?.collected_data?.has_medical_docs) progress += 5;

    // Witnesses (max 15%)
    if (caseData?.collected_data?.witnesses_present !== undefined) progress += 5;
    if (caseData?.collected_data?.witness_data) progress += 10;

    // Work context (max 15%)
    if (extractedData?.work_context?.task_performed) progress += 5;
    if (extractedData?.work_context?.was_during_work !== null) progress += 5;
    if (extractedData?.accident?.place_type) progress += 5;

    // Chat progress (max 15%)
    const chatMessages = caseData?.chatHistory?.filter(m => m.type === 'user')?.length || 0;
    progress += Math.min(chatMessages * 3, 15);

    return Math.min(progress, 100);
}

/**
 * Compute missing information based on extracted data and definition status
 */
export function computeMissingInfo(extractedData, definitionStatus, caseData) {
    const requiredMissing = [];
    const recommendedMissing = [];
    const documentsNeeded = [];

    // Required based on definition status
    if (definitionStatus.suddenness.status === 'EMPTY') {
        requiredMissing.push('Data i godzina wypadku');
    } else if (definitionStatus.suddenness.status === 'PARTIAL') {
        if (!extractedData?.accident?.time) {
            recommendedMissing.push('Dokładna godzina zdarzenia');
        }
    }

    if (definitionStatus.externalCause.status === 'EMPTY' || definitionStatus.externalCause.status === 'PARTIAL') {
        if (!extractedData?.accident?.cause) {
            requiredMissing.push('Opis przyczyny zewnętrznej zdarzenia');
        }
    }

    if (definitionStatus.injury.status === 'EMPTY') {
        requiredMissing.push('Opis doznanych obrażeń');
    }

    if (definitionStatus.workRelation.status === 'EMPTY' || definitionStatus.workRelation.status === 'PARTIAL') {
        if (!extractedData?.work_context?.task_performed) {
            requiredMissing.push('Opis czynności wykonywanej w momencie wypadku');
        }
    }

    // Witness info
    if (caseData?.collected_data?.witnesses_present === undefined) {
        requiredMissing.push('Informacja o obecności świadków');
    } else if (caseData?.collected_data?.witnesses_present && !caseData?.collected_data?.witness_data) {
        requiredMissing.push('Dane świadka zdarzenia (imię, nazwisko, adres)');
    }

    // Medical info
    if (!extractedData?.injury?.medical_facility && !caseData?.collected_data?.medical_facility) {
        requiredMissing.push('Nazwa i adres placówki medycznej');
    }

    // Recommended
    if (!extractedData?.accident?.place) {
        recommendedMissing.push('Dokładne miejsce zdarzenia');
    }

    // Documents needed
    if (extractedData?.injury?.description || definitionStatus.injury.status !== 'EMPTY') {
        if (!caseData?.collected_data?.has_medical_docs) {
            documentsNeeded.push('Dokumentacja medyczna potwierdzająca uraz');
        }
    }

    if (extractedData?.accident?.mechanism === 'TRAFFIC') {
        documentsNeeded.push('Notatka policji z miejsca zdarzenia');
    }

    if (caseData?.collected_data?.witnesses_present) {
        documentsNeeded.push('Oświadczenie świadka zdarzenia');
    }

    // Always recommend these
    documentsNeeded.push('Kopia dokumentu potwierdzającego prowadzenie działalności gospodarczej');

    return {
        requiredMissing,
        recommendedMissing,
        documentsNeeded
    };
}

/**
 * Compute entitlement decision based on definition status
 */
export function computeEntitlementDecision(definitionStatus) {
    const statuses = [
        definitionStatus.suddenness.status,
        definitionStatus.externalCause.status,
        definitionStatus.injury.status,
        definitionStatus.workRelation.status
    ];

    const completeCount = statuses.filter(s => s === 'COMPLETE').length;
    const partialCount = statuses.filter(s => s === 'PARTIAL').length;
    const emptyCount = statuses.filter(s => s === 'EMPTY').length;

    if (completeCount === 4) {
        return {
            result: 'ELIGIBLE',
            reasonCodes: ['ALL_FOUR_ELEMENTS_MET'],
            shortExplanation: 'Wszystkie cztery elementy definicji wypadku przy pracy są spełnione.'
        };
    } else if (completeCount >= 2 && emptyCount === 0) {
        return {
            result: 'PROBABLY_ELIGIBLE',
            reasonCodes: ['ALL_FOUR_ELEMENTS_PROBABLY_MET'],
            shortExplanation: 'Opis wskazuje na nagłe zdarzenie z przyczyną zewnętrzną i urazem podczas wykonywania działalności. Wymagane doprecyzowanie niektórych elementów.'
        };
    } else if (emptyCount >= 2) {
        return {
            result: 'UNCLEAR',
            reasonCodes: ['INSUFFICIENT_DATA'],
            shortExplanation: 'Brak wystarczających informacji do oceny. Proszę uzupełnić brakujące dane.'
        };
    } else {
        return {
            result: 'PROBABLY_ELIGIBLE',
            reasonCodes: ['PARTIAL_ELEMENTS_MET'],
            shortExplanation: 'Wstępna ocena pozytywna. Niektóre elementy wymagają uzupełnienia dla pełnej kwalifikacji.'
        };
    }
}

export default {
    evaluateDefinition,
    calculateProgress,
    computeMissingInfo,
    computeEntitlementDecision
};

