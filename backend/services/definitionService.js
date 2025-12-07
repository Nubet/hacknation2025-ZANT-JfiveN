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
 * Progress reflects completion of all required and recommended information
 */
export function calculateProgress(extractedData, caseData) {
    let totalPoints = 0;
    let earnedPoints = 0;

    // === POSZKODOWANY (Injured person) - 10 points total ===
    totalPoints += 10;
    if (extractedData?.poszkodowany?.imie) earnedPoints += 2;
    if (extractedData?.poszkodowany?.nazwisko) earnedPoints += 2;
    if (extractedData?.poszkodowany?.pesel) earnedPoints += 2;
    if (extractedData?.poszkodowany?.adres_zamieszkania || caseData?.collected_data?.adres_zamieszkania) earnedPoints += 4;

    // === WYPADEK - NAGŁOŚĆ (Accident suddenness) - 20 points total ===
    totalPoints += 20;
    if (extractedData?.accident?.date || extractedData?.wypadek?.data) earnedPoints += 8;
    if (extractedData?.accident?.time || extractedData?.wypadek?.godzina) earnedPoints += 7;
    if (extractedData?.accident?.circumstances || extractedData?.wypadek?.opis_okolicznosci) earnedPoints += 5;

    // === WYPADEK - PRZYCZYNA ZEWNĘTRZNA (External cause) - 20 points total ===
    totalPoints += 20;
    if (extractedData?.accident?.place || extractedData?.wypadek?.miejsce) earnedPoints += 7;
    if (extractedData?.accident?.cause) earnedPoints += 8;
    if (extractedData?.accident?.mechanism) earnedPoints += 5;

    // === URAZ (Injury) - 25 points total ===
    totalPoints += 25;
    if (extractedData?.injury?.description || extractedData?.urazy?.opis) earnedPoints += 8;
    if (extractedData?.injury?.body_parts?.length > 0) earnedPoints += 4;

    // Medical facility
    const hasMedicalFacility = extractedData?.injury?.medical_facility ||
                              extractedData?.urazy?.hospitalizacja?.nazwa_placowki ||
                              caseData?.collected_data?.medical_facility;
    if (hasMedicalFacility) earnedPoints += 7;

    // Hospitalization info
    if (caseData?.collected_data?.czy_hospitalizowany !== undefined) earnedPoints += 3;
    if (caseData?.collected_data?.has_medical_docs) earnedPoints += 3;

    // === ŚWIADKOWIE (Witnesses) - 10 points total ===
    totalPoints += 10;
    if (caseData?.collected_data?.witnesses_present !== undefined) earnedPoints += 4;
    if (caseData?.collected_data?.witnesses_present === true) {
        if (caseData?.collected_data?.witness_data ||
            (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie[0]?.imie_nazwisko)) {
            earnedPoints += 6;
        }
    } else if (caseData?.collected_data?.witnesses_present === false) {
        earnedPoints += 6; // Full points if no witnesses
    }

    // === ZWIĄZEK Z PRACĄ (Work relation) - 15 points total ===
    totalPoints += 15;
    if (extractedData?.work_context?.task_performed || caseData?.collected_data?.task_performed) earnedPoints += 8;
    if (extractedData?.work_context?.was_during_work !== null) earnedPoints += 4;
    if (extractedData?.work_context?.employer_or_business) earnedPoints += 3;

    // Calculate percentage
    const progressPercent = Math.round((earnedPoints / totalPoints) * 100);

    console.log(`[DefinitionService] Progress calculation: ${earnedPoints}/${totalPoints} = ${progressPercent}%`);

    return Math.min(progressPercent, 100);
}

/**
 * Compute missing information based on extracted data and definition status
 * This shows ALL information that is missing or will be asked by the chat
 */
export function computeMissingInfo(extractedData, definitionStatus, caseData) {
    const requiredMissing = [];
    const recommendedMissing = [];
    const documentsNeeded = [];

    // === POSZKODOWANY (Injured person) ===
    if (!extractedData?.poszkodowany?.adres_zamieszkania && !caseData?.collected_data?.adres_zamieszkania) {
        requiredMissing.push('Adres zamieszkania poszkodowanego');
    }
    if (!extractedData?.poszkodowany?.data_urodzenia && !caseData?.collected_data?.data_urodzenia) {
        recommendedMissing.push('Data urodzenia poszkodowanego');
    }
    if (!extractedData?.poszkodowany?.dokument_tozsamosci && !caseData?.collected_data?.dokument_tozsamosci) {
        recommendedMissing.push('Numer i rodzaj dokumentu tożsamości');
    }

    // === NAGŁOŚĆ (Suddenness) ===
    if (definitionStatus.suddenness.status === 'EMPTY') {
        if (!extractedData?.accident?.date && !extractedData?.wypadek?.data) {
            requiredMissing.push('Data wypadku');
        }
        if (!extractedData?.accident?.time && !extractedData?.wypadek?.godzina) {
            requiredMissing.push('Godzina wypadku');
        }
    } else if (definitionStatus.suddenness.status === 'PARTIAL') {
        if (!extractedData?.accident?.time && !extractedData?.wypadek?.godzina) {
            recommendedMissing.push('Dokładna godzina zdarzenia');
        }
    }

    // === PRZYCZYNA ZEWNĘTRZNA (External Cause) ===
    if (definitionStatus.externalCause.status === 'EMPTY' || definitionStatus.externalCause.status === 'PARTIAL') {
        if (!extractedData?.accident?.place && !extractedData?.wypadek?.miejsce) {
            requiredMissing.push('Dokładne miejsce wypadku');
        }
        if (!extractedData?.accident?.cause) {
            requiredMissing.push('Opis przyczyny zewnętrznej zdarzenia (co spowodowało wypadek)');
        }
        if (!extractedData?.accident?.circumstances && !extractedData?.wypadek?.opis_okolicznosci) {
            recommendedMissing.push('Szczegółowe okoliczności wypadku');
        }
    }

    // === URAZ (Injury) ===
    if (definitionStatus.injury.status === 'EMPTY') {
        requiredMissing.push('Opis doznanych obrażeń');
    }

    // Pierwsza pomoc (First aid)
    if (extractedData?.urazy?.pierwsza_pomoc?.udzielono === null &&
        caseData?.collected_data?.pierwsza_pomoc_udzielono === undefined) {
        recommendedMissing.push('Informacja czy udzielono pierwszej pomocy');
    }
    if ((extractedData?.urazy?.pierwsza_pomoc?.udzielono === true ||
         caseData?.collected_data?.pierwsza_pomoc_udzielono === true) &&
        !extractedData?.urazy?.pierwsza_pomoc?.kto_udzielil &&
        !caseData?.collected_data?.pierwsza_pomoc_kto) {
        recommendedMissing.push('Kto udzielił pierwszej pomocy');
    }

    // Hospitalizacja (Hospitalization)
    if (extractedData?.urazy?.hospitalizacja?.czy_hospitalizowany === null &&
        caseData?.collected_data?.czy_hospitalizowany === undefined) {
        requiredMissing.push('Informacja czy poszkodowany był hospitalizowany');
    }

    // Medical facility
    const hasMedicalFacility = extractedData?.injury?.medical_facility ||
                              extractedData?.urazy?.hospitalizacja?.nazwa_placowki ||
                              caseData?.collected_data?.medical_facility ||
                              caseData?.collected_data?.nazwa_placowki;

    if (!hasMedicalFacility) {
        requiredMissing.push('Nazwa placówki medycznej');
    }

    const hasMedicalAddress = extractedData?.urazy?.hospitalizacja?.adres_placowki ||
                             caseData?.collected_data?.adres_placowki;
    if (hasMedicalFacility && !hasMedicalAddress) {
        recommendedMissing.push('Adres placówki medycznej');
    }

    // === ŚWIADKOWIE (Witnesses) ===
    const witnessPresent = extractedData?.witnesses?.were_present ?? caseData?.collected_data?.witnesses_present;
    if (witnessPresent === null || witnessPresent === undefined) {
        requiredMissing.push('Informacja o obecności świadków');
    } else if (witnessPresent === true) {
        const hasWitnessData = (extractedData?.witnesses?.witness_data?.length > 0) ||
                              (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie.some(s => s.imie_nazwisko)) ||
                              caseData?.collected_data?.witness_data;

        if (!hasWitnessData) {
            requiredMissing.push('Dane świadka (imię, nazwisko)');
        } else {
            const hasWitnessAddress = (extractedData?.swiadkowie?.length > 0 && extractedData.swiadkowie.some(s => s.adres)) ||
                                     caseData?.collected_data?.witness_address;
            if (!hasWitnessAddress) {
                recommendedMissing.push('Adres świadka');
            }
        }
    }

    // === ZWIĄZEK Z PRACĄ (Work Relation) ===
    if (definitionStatus.workRelation.status === 'EMPTY' || definitionStatus.workRelation.status === 'PARTIAL') {
        if (!extractedData?.work_context?.task_performed && !caseData?.collected_data?.task_performed) {
            requiredMissing.push('Czynność wykonywana w momencie wypadku');
        }
    }

    // === DOCUMENTS ===
    // Medical documentation
    if (extractedData?.injury?.description || definitionStatus.injury.status !== 'EMPTY') {
        if (!caseData?.collected_data?.has_medical_docs) {
            documentsNeeded.push('Dokumentacja medyczna potwierdzająca uraz (karta leczenia, zaświadczenie lekarskie)');
        }
    }

    // Traffic accident - police report
    if (extractedData?.accident?.mechanism === 'TRAFFIC') {
        documentsNeeded.push('Notatka policji z miejsca zdarzenia (wypadek komunikacyjny)');
    }

    // Witness statement
    if (caseData?.collected_data?.witnesses_present === true) {
        documentsNeeded.push('Oświadczenie świadka zdarzenia (imię, nazwisko, opis tego co widział)');
    }

    // Business activity proof - always needed for self-employed
    documentsNeeded.push('Kopia dokumentu potwierdzającego prowadzenie działalności gospodarczej (CEIDG, KRS)');

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

