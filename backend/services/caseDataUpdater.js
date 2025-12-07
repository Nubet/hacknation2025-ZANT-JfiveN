/**
 * Case Data Updater
 * Helper functions for updating case data from parsed AI responses
 */

/**
 * Update case data from parsed AI response
 */
export function updateCaseFromParsedResponse(caseData, parseResult) {
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

    //  (Injured person)
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

    // (Accident)
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

    // (Injuries) ===
    if (extractedInfo.injury_description) {
        caseData.extractedData.injury = caseData.extractedData.injury || {};
        caseData.extractedData.injury.description = extractedInfo.injury_description;
        caseData.extractedData.urazy.opis = extractedInfo.injury_description;
    }
    if (extractedInfo.body_parts && extractedInfo.body_parts.length > 0) {
        caseData.extractedData.injury = caseData.extractedData.injury || {};
        caseData.extractedData.injury.body_parts = extractedInfo.body_parts;
    }

    //  (First aid)
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

    // (Hospitalization)
    if (extractedInfo.czy_hospitalizowany !== undefined && extractedInfo.czy_hospitalizowany !== null) {
        caseData.extractedData.urazy.hospitalizacja.czy_hospitalizowany = extractedInfo.czy_hospitalizowany;
        caseData.collected_data.czy_hospitalizowany = extractedInfo.czy_hospitalizowany;
    }
    if (caseUpdates.czy_hospitalizowany !== undefined) {
        caseData.extractedData.urazy.hospitalizacja.czy_hospitalizowany = caseUpdates.czy_hospitalizowany;
        caseData.collected_data.czy_hospitalizowany = caseUpdates.czy_hospitalizowany;
    }

    // (Placówka medyczna)
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

    //  (Witnesses)
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

    console.log('[CaseService] Updasted collected_data:', caseData.collected_data);
}

export default {
    updateCaseFromParsedResponse
};

