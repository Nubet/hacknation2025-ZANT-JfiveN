/**
 * Document Generation Service
 * Generates HTML previews for notification and explanation documents
 */

/**
 * Generate all document previews
 * @param {Object} caseData - Full case data
 * @param {Object} extractedData - Extracted structured data
 * @param {Object} definitionStatus - Current definition status
 * @returns {Object} DocumentsPreviewResponse
 */
export function generateDocuments(caseData, extractedData, definitionStatus) {
    return {
        notificationHtml: generateNotificationHtml(caseData, extractedData),
        explanationHtml: generateExplanationHtml(caseData, extractedData),
        officialSummary: generateOfficialSummary(caseData, extractedData, definitionStatus)
    };
}

/**
 * Generate HTML for accident notification document
 */
function generateNotificationHtml(caseData, extractedData) {
    const accident = extractedData?.accident || {};
    const injury = extractedData?.injury || {};
    const workContext = extractedData?.work_context || {};
    const collectedData = caseData?.collected_data || {};

    const dateStr = accident.date
        ? formatPolishDate(accident.date)
        : 'data nieznana';

    const timeStr = accident.time || 'godzina nieznana';
    const placeStr = accident.place || 'miejsce do uzupełnienia';

    return `
<div class="document-preview">
    <h2 style="text-align: center; margin-bottom: 20px;">ZAWIADOMIENIE O WYPADKU PRZY PRACY</h2>
    
    <h3>1. Dane poszkodowanego</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
            <td style="padding: 5px; border: 1px solid #ddd; width: 40%;"><strong>Imię i nazwisko:</strong></td>
            <td style="padding: 5px; border: 1px solid #ddd;">${caseData.first_name} ${caseData.last_name}</td>
        </tr>
        <tr>
            <td style="padding: 5px; border: 1px solid #ddd;"><strong>PESEL:</strong></td>
            <td style="padding: 5px; border: 1px solid #ddd;">${caseData.pesel}</td>
        </tr>
        ${caseData.phone_number ? `
        <tr>
            <td style="padding: 5px; border: 1px solid #ddd;"><strong>Telefon kontaktowy:</strong></td>
            <td style="padding: 5px; border: 1px solid #ddd;">${caseData.phone_number}</td>
        </tr>
        ` : ''}
    </table>

    <h3>2. Data i miejsce wypadku</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
            <td style="padding: 5px; border: 1px solid #ddd; width: 40%;"><strong>Data wypadku:</strong></td>
            <td style="padding: 5px; border: 1px solid #ddd;">${dateStr}</td>
        </tr>
        <tr>
            <td style="padding: 5px; border: 1px solid #ddd;"><strong>Godzina wypadku:</strong></td>
            <td style="padding: 5px; border: 1px solid #ddd;">${timeStr}</td>
        </tr>
        <tr>
            <td style="padding: 5px; border: 1px solid #ddd;"><strong>Miejsce wypadku:</strong></td>
            <td style="padding: 5px; border: 1px solid #ddd;">${placeStr}</td>
        </tr>
    </table>

    <h3>3. Okoliczności wypadku</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        ${accident.circumstances || caseData.description || 'Opis okoliczności do uzupełnienia.'}
    </p>

    ${workContext.task_performed ? `
    <h3>4. Czynność wykonywana w chwili wypadku</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        ${workContext.task_performed}
    </p>
    ` : ''}

    ${injury.description || injury.body_parts?.length > 0 ? `
    <h3>5. Opis urazu</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        ${injury.description || ''}
        ${injury.body_parts?.length > 0 ? `<br>Uszkodzone części ciała: ${injury.body_parts.join(', ')}` : ''}
    </p>
    ` : ''}

    ${collectedData.medical_facility || injury.medical_facility ? `
    <h3>6. Placówka medyczna</h3>
    <p style="margin-bottom: 15px;">
        ${collectedData.medical_facility || injury.medical_facility}
    </p>
    ` : ''}

    ${collectedData.witness_data ? `
    <h3>7. Świadkowie zdarzenia</h3>
    <p style="margin-bottom: 15px;">
        ${collectedData.witness_data}
    </p>
    ` : ''}

    <div style="margin-top: 30px; font-size: 0.9em; color: #666;">
        <p><em>Dokument wygenerowany automatycznie przez system ZANT. Wymaga weryfikacji i podpisu poszkodowanego.</em></p>
    </div>
</div>
    `.trim();
}

/**
 * Generate HTML for injured person's explanation document
 */
function generateExplanationHtml(caseData, extractedData) {
    const accident = extractedData?.accident || {};
    const injury = extractedData?.injury || {};
    const workContext = extractedData?.work_context || {};
    const witnesses = extractedData?.witnesses || {};
    const collectedData = caseData?.collected_data || {};

    const dateStr = accident.date
        ? formatPolishDate(accident.date)
        : '[data do uzupełnienia]';

    return `
<div class="document-preview">
    <h2 style="text-align: center; margin-bottom: 20px;">WYJAŚNIENIA POSZKODOWANEGO</h2>
    
    <p style="margin-bottom: 20px;">
        Ja, <strong>${caseData.first_name} ${caseData.last_name}</strong>, PESEL: <strong>${caseData.pesel}</strong>, 
        niniejszym składam wyjaśnienia dotyczące wypadku przy pracy, który miał miejsce w dniu ${dateStr}.
    </p>

    <h3>Przebieg zdarzenia</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        ${caseData.description}
    </p>

    ${accident.cause ? `
    <h3>Przyczyna wypadku</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        Za przyczynę wypadku uważam: ${accident.cause}
        ${accident.mechanism ? `<br>Mechanizm zdarzenia: ${translateMechanism(accident.mechanism)}` : ''}
    </p>
    ` : ''}

    ${injury.description ? `
    <h3>Doznane obrażenia</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        W wyniku wypadku doznałem/am następujących obrażeń: ${injury.description}
        ${injury.body_parts?.length > 0 ? `<br>Uszkodzone części ciała: ${injury.body_parts.join(', ')}` : ''}
    </p>
    ` : ''}

    ${injury.medical_help || collectedData.medical_facility ? `
    <h3>Pomoc medyczna</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        ${injury.medical_help ? 'Po wypadku udzielono mi pomocy medycznej.' : ''}
        ${collectedData.medical_facility ? `<br>Placówka medyczna: ${collectedData.medical_facility}` : ''}
        ${collectedData.has_medical_docs ? '<br>Posiadam dokumentację medyczną z wizyty.' : ''}
    </p>
    ` : ''}

    ${collectedData.witnesses_present !== undefined ? `
    <h3>Świadkowie</h3>
    <p style="text-align: justify; margin-bottom: 15px;">
        ${collectedData.witnesses_present 
            ? `Świadkiem zdarzenia był/a: ${collectedData.witness_data || 'dane do uzupełnienia'}`
            : 'W momencie wypadku nie było świadków zdarzenia.'}
    </p>
    ` : ''}

    <div style="margin-top: 40px;">
        <p>Oświadczam, że powyższe wyjaśnienia są zgodne z prawdą.</p>
        <br><br>
        <table style="width: 100%;">
            <tr>
                <td style="width: 50%;">
                    <p>______________________</p>
                    <p style="font-size: 0.9em;">Miejscowość, data</p>
                </td>
                <td style="width: 50%; text-align: right;">
                    <p>______________________</p>
                    <p style="font-size: 0.9em;">Podpis poszkodowanego</p>
                </td>
            </tr>
        </table>
    </div>

    <div style="margin-top: 30px; font-size: 0.9em; color: #666;">
        <p><em>Dokument wygenerowany automatycznie przez system ZANT. Wymaga weryfikacji i własnoręcznego podpisu.</em></p>
    </div>
</div>
    `.trim();
}

/**
 * Generate official style summary
 */
function generateOfficialSummary(caseData, extractedData, definitionStatus) {
    const accident = extractedData?.accident || {};
    const injury = extractedData?.injury || {};
    const collectedData = caseData?.collected_data || {};

    const dateStr = accident.date
        ? formatPolishDate(accident.date)
        : '[data nieustalona]';

    const timeStr = accident.time ? ` około godz. ${accident.time}` : '';
    const placeStr = accident.place ? ` w miejscu: ${accident.place}` : '';

    let summary = `Poszkodowany ${caseData.first_name} ${caseData.last_name} (PESEL: ${caseData.pesel}) `;
    summary += `zgłasza wypadek przy pracy, który miał miejsce w dniu ${dateStr}${timeStr}${placeStr}. `;

    if (accident.mechanism) {
        summary += `Mechanizm zdarzenia: ${translateMechanism(accident.mechanism)}. `;
    }

    if (injury.description) {
        summary += `Doznane obrażenia: ${injury.description}. `;
    }

    if (collectedData.witnesses_present !== undefined) {
        summary += collectedData.witnesses_present
            ? `Zdarzenie miało świadka. `
            : `Brak świadków zdarzenia. `;
    }

    if (collectedData.medical_facility) {
        summary += `Pomoc medyczna udzielona w: ${collectedData.medical_facility}. `;
    }

    // Add definition status summary
    const completeElements = [
        definitionStatus.suddenness.status === 'COMPLETE' ? 'nagłość' : null,
        definitionStatus.externalCause.status === 'COMPLETE' ? 'przyczyna zewnętrzna' : null,
        definitionStatus.injury.status === 'COMPLETE' ? 'uraz' : null,
        definitionStatus.workRelation.status === 'COMPLETE' ? 'związek z pracą' : null
    ].filter(Boolean);

    if (completeElements.length > 0) {
        summary += `Potwierdzone elementy definicji: ${completeElements.join(', ')}.`;
    }

    return summary;
}

/**
 * Format date to Polish format
 */
function formatPolishDate(dateStr) {
    if (!dateStr) return null;

    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Translate mechanism enum to Polish
 */
function translateMechanism(mechanism) {
    const translations = {
        'SLIP_TRIP_FALL': 'poślizgnięcie/potknięcie/upadek',
        'MACHINE': 'kontakt z maszyną/urządzeniem',
        'TRAFFIC': 'wypadek komunikacyjny',
        'FALLING_OBJECT': 'uderzenie spadającym przedmiotem',
        'MANUAL_HANDLING': 'przenoszenie/podnoszenie ładunku',
        'OTHER': 'inne'
    };
    return translations[mechanism] || mechanism;
}

export default {
    generateDocuments
};

