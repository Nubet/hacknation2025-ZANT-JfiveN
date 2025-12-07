/**
 * Document Generation Service
 * Generates HTML previews for notification and explanation documents
 */

/**
 * Generate all document previews
 * @param {Object} caseData - Full case data
 * @param {Object} extractedData - Extracted structured data
 * @param {Object} definitionStatus - Current definition status
 * @param {Boolean} includeOpinion - Whether to include opinion document (only for employees)
 * @returns {Object} DocumentsPreviewResponse
 */
export function generateDocuments(caseData, extractedData, definitionStatus, includeOpinion = false) {
    const docs = {
        notificationHtml: generateNotificationHtml(caseData, extractedData),
        explanationHtml: generateExplanationHtml(caseData, extractedData),
        officialSummary: generateOfficialSummary(caseData, extractedData, definitionStatus)
    };

    // Only include opinion for employee view (after verification)
    if (includeOpinion) {
        docs.opinionHtml = generateOpinionHtml(caseData, extractedData, definitionStatus);
    }

    return docs;
}

/**
 * Common styles for all documents - matching ZANT UI design system
 */
const documentStyles = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        
        .document-preview {
            font-family: 'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333333;
            font-size: 14px;
            line-height: 1.6;
            background-color: #ffffff;
            padding: 30px;
        }
        
        .document-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #006b4f;
        }
        
        .document-header h1 {
            color: #006b4f;
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: 0.5px;
        }
        
        .document-header .subtitle {
            color: #666666;
            font-size: 0.9rem;
            font-weight: 400;
        }
        
        .section {
            margin-bottom: 24px;
        }
        
        .section-title {
            font-size: 1rem;
            font-weight: 600;
            color: #006b4f;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e6f0ed;
            display: flex;
            align-items: center;
        }
        
        .section-title .number {
            background-color: #006b4f;
            color: #ffffff;
            width: 24px;
            height: 24px;
            border-radius: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            font-weight: 700;
            margin-right: 10px;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            background-color: #ffffff;
        }
        
        .data-table tr {
            border-bottom: 1px solid #dddddd;
        }
        
        .data-table tr:last-child {
            border-bottom: none;
        }
        
        .data-table td {
            padding: 12px 15px;
            vertical-align: top;
        }
        
        .data-table .label {
            width: 40%;
            font-weight: 600;
            color: #333333;
            background-color: #f5f6f8;
            border-right: 3px solid #006b4f;
        }
        
        .data-table .value {
            color: #333333;
            background-color: #ffffff;
        }
        
        .content-box {
            background-color: #f5f6f8;
            border-left: 4px solid #006b4f;
            padding: 16px 20px;
            margin-bottom: 16px;
            text-align: justify;
        }
        
        .content-box p {
            margin: 0;
            color: #333333;
        }
        
        .highlight-box {
            background-color: #e6f0ed;
            border-left: 4px solid #004d39;
            padding: 16px 20px;
            margin-bottom: 16px;
        }
        
        .info-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .info-list li {
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
            color: #333333;
        }
        
        .info-list li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 14px;
            width: 8px;
            height: 8px;
            background-color: #006b4f;
        }
        
        .document-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e6f0ed;
        }
        
        .document-footer .notice {
            background-color: #f5f6f8;
            padding: 12px 16px;
            font-size: 0.85rem;
            color: #666666;
            font-style: italic;
            border-left: 4px solid #fab856;
        }
        
        .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-box {
            text-align: center;
            width: 45%;
        }
        
        .signature-box .line {
            border-bottom: 1px solid #333333;
            margin-bottom: 8px;
            height: 40px;
        }
        
        .signature-box .label {
            font-size: 0.85rem;
            color: #666666;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-primary {
            background-color: #006b4f;
            color: #ffffff;
        }
        
        .badge-secondary {
            background-color: #fab856;
            color: #00416e;
        }
    </style>
`;

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

    let sectionNumber = 1;

    return `
${documentStyles}
<div class="document-preview">
    <div class="document-header">
        <h1>ZAWIADOMIENIE O WYPADKU PRZY PRACY</h1>
        <div class="subtitle">Dokument wygenerowany przez system ZANT</div>
    </div>
    
    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Dane poszkodowanego
        </div>
        <table class="data-table">
            <tr>
                <td class="label">Imię i nazwisko</td>
                <td class="value">${caseData.first_name} ${caseData.last_name}</td>
            </tr>
            <tr>
                <td class="label">PESEL</td>
                <td class="value" style="font-family: monospace; letter-spacing: 2px;">${caseData.pesel}</td>
            </tr>
            ${caseData.phone_number ? `
            <tr>
                <td class="label">Telefon kontaktowy</td>
                <td class="value">${caseData.phone_number}</td>
            </tr>
            ` : ''}
        </table>
    </div>

    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Data i miejsce wypadku
        </div>
        <table class="data-table">
            <tr>
                <td class="label">Data wypadku</td>
                <td class="value">${dateStr}</td>
            </tr>
            <tr>
                <td class="label">Godzina wypadku</td>
                <td class="value">${timeStr}</td>
            </tr>
            <tr>
                <td class="label">Miejsce wypadku</td>
                <td class="value">${placeStr}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Okoliczności wypadku
        </div>
        <div class="content-box">
            <p>${accident.circumstances || caseData.description || 'Opis okoliczności do uzupełnienia.'}</p>
        </div>
    </div>

    ${workContext.task_performed ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Czynność wykonywana w chwili wypadku
        </div>
        <div class="content-box">
            <p>${workContext.task_performed}</p>
        </div>
    </div>
    ` : ''}

    ${injury.description || injury.body_parts?.length > 0 ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Opis urazu
        </div>
        <div class="highlight-box">
            <p>${injury.description || ''}</p>
            ${injury.body_parts?.length > 0 ? `<p style="margin-top: 8px;"><strong>Uszkodzone części ciała:</strong> ${injury.body_parts.join(', ')}</p>` : ''}
        </div>
    </div>
    ` : ''}

    ${collectedData.medical_facility || injury.medical_facility ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Placówka medyczna
        </div>
        <div class="content-box">
            <p>${collectedData.medical_facility || injury.medical_facility}</p>
        </div>
    </div>
    ` : ''}

    ${collectedData.witness_data ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${sectionNumber++}</span>
            Świadkowie zdarzenia
        </div>
        <div class="content-box">
            <p>${collectedData.witness_data}</p>
        </div>
    </div>
    ` : ''}

    <div class="document-footer">
        <div class="notice">
            Dokument wygenerowany automatycznie przez system ZANT. Wymaga weryfikacji i podpisu poszkodowanego.
        </div>
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
    const collectedData = caseData?.collected_data || {};

    const dateStr = accident.date
        ? formatPolishDate(accident.date)
        : '[data do uzupełnienia]';

    return `
${documentStyles}
<div class="document-preview">
    <div class="document-header">
        <h1>WYJAŚNIENIA POSZKODOWANEGO</h1>
        <div class="subtitle">Oświadczenie dotyczące wypadku przy pracy</div>
    </div>
    
    <div class="section">
        <div class="highlight-box">
            <p>Ja, <strong>${caseData.first_name} ${caseData.last_name}</strong>, PESEL: <strong style="font-family: monospace; letter-spacing: 2px;">${caseData.pesel}</strong>, 
            niniejszym składam wyjaśnienia dotyczące wypadku przy pracy, który miał miejsce w dniu <strong>${dateStr}</strong>.</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">
            <span class="number">1</span>
            Przebieg zdarzenia
        </div>
        <div class="content-box">
            <p>${caseData.description}</p>
        </div>
    </div>

    ${accident.cause ? `
    <div class="section">
        <div class="section-title">
            <span class="number">2</span>
            Przyczyna wypadku
        </div>
        <div class="content-box">
            <p>Za przyczynę wypadku uważam: <strong>${accident.cause}</strong></p>
            ${accident.mechanism ? `<p style="margin-top: 10px;">Mechanizm zdarzenia: <span class="badge badge-secondary">${translateMechanism(accident.mechanism)}</span></p>` : ''}
        </div>
    </div>
    ` : ''}

    ${injury.description ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${accident.cause ? '3' : '2'}</span>
            Doznane obrażenia
        </div>
        <div class="highlight-box">
            <p>W wyniku wypadku doznałem/am następujących obrażeń:</p>
            <p style="margin-top: 8px; font-weight: 600;">${injury.description}</p>
            ${injury.body_parts?.length > 0 ? `
            <p style="margin-top: 12px;"><strong>Uszkodzone części ciała:</strong></p>
            <ul class="info-list">
                ${injury.body_parts.map(part => `<li>${part}</li>`).join('')}
            </ul>
            ` : ''}
        </div>
    </div>
    ` : ''}

    ${injury.medical_help || collectedData.medical_facility ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${(accident.cause ? 3 : 2) + (injury.description ? 1 : 0) + 1}</span>
            Pomoc medyczna
        </div>
        <table class="data-table">
            ${injury.medical_help ? `
            <tr>
                <td class="label">Udzielona pomoc</td>
                <td class="value">Po wypadku udzielono mi pomocy medycznej</td>
            </tr>
            ` : ''}
            ${collectedData.medical_facility ? `
            <tr>
                <td class="label">Placówka medyczna</td>
                <td class="value">${collectedData.medical_facility}</td>
            </tr>
            ` : ''}
            ${collectedData.has_medical_docs ? `
            <tr>
                <td class="label">Dokumentacja</td>
                <td class="value"><span class="badge badge-primary">Posiada dokumentację medyczną</span></td>
            </tr>
            ` : ''}
        </table>
    </div>
    ` : ''}

    ${collectedData.witnesses_present !== undefined ? `
    <div class="section">
        <div class="section-title">
            <span class="number">${(accident.cause ? 3 : 2) + (injury.description ? 1 : 0) + (injury.medical_help || collectedData.medical_facility ? 1 : 0) + 1}</span>
            Świadkowie
        </div>
        <div class="content-box">
            <p>${collectedData.witnesses_present 
                ? `Świadkiem zdarzenia był/a: <strong>${collectedData.witness_data || 'dane do uzupełnienia'}</strong>`
                : 'W momencie wypadku nie było świadków zdarzenia.'}</p>
        </div>
    </div>
    ` : ''}

    <div class="section" style="margin-top: 40px;">
        <div class="highlight-box" style="text-align: center;">
            <p><strong>Oświadczam, że powyższe wyjaśnienia są zgodne z prawdą.</strong></p>
        </div>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div class="line"></div>
            <div class="label">Miejscowość, data</div>
        </div>
        <div class="signature-box">
            <div class="line"></div>
            <div class="label">Podpis poszkodowanego</div>
        </div>
    </div>

    <div class="document-footer">
        <div class="notice">
            Dokument wygenerowany automatycznie przez system ZANT. Wymaga weryfikacji i własnoręcznego podpisu.
        </div>
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

    // Build structured summary parts
    const summaryParts = [];

    summaryParts.push(`Poszkodowany <strong>${caseData.first_name} ${caseData.last_name}</strong> (PESEL: <span style="font-family: monospace;">${caseData.pesel}</span>) zgłasza wypadek przy pracy, który miał miejsce w dniu <strong>${dateStr}</strong>${timeStr}${placeStr}.`);

    if (accident.mechanism) {
        summaryParts.push(`Mechanizm zdarzenia: <em>${translateMechanism(accident.mechanism)}</em>.`);
    }

    if (injury.description) {
        summaryParts.push(`Doznane obrażenia: <em>${injury.description}</em>.`);
    }

    if (collectedData.witnesses_present !== undefined) {
        summaryParts.push(collectedData.witnesses_present
            ? `Zdarzenie miało świadka.`
            : `Brak świadków zdarzenia.`);
    }

    if (collectedData.medical_facility) {
        summaryParts.push(`Pomoc medyczna udzielona w: <em>${collectedData.medical_facility}</em>.`);
    }

    // Build definition status badges
    const definitionElements = [
        { name: 'Nagłość', status: definitionStatus.suddenness.status },
        { name: 'Przyczyna zewnętrzna', status: definitionStatus.externalCause.status },
        { name: 'Uraz', status: definitionStatus.injury.status },
        { name: 'Związek z pracą', status: definitionStatus.workRelation.status }
    ];

    const statusBadges = definitionElements.map(el => {
        const badgeClass = el.status === 'COMPLETE' ? 'badge-complete' :
                          el.status === 'PARTIAL' ? 'badge-partial' : 'badge-missing';
        return `<span class="${badgeClass}">${el.name}</span>`;
    }).join(' ');

    return `
${documentStyles}
<style>
    .summary-box {
        background: linear-gradient(135deg, #f5f6f8 0%, #e6f0ed 100%);
        padding: 24px;
        border-left: 4px solid #006b4f;
    }
    .summary-text {
        color: #333333;
        line-height: 1.8;
        text-align: justify;
    }
    .summary-text p {
        margin-bottom: 8px;
    }
    .definition-status {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 2px solid #e6f0ed;
    }
    .definition-status-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: #006b4f;
        margin-bottom: 12px;
    }
    .status-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .badge-complete {
        background-color: #5cb85c;
        color: #ffffff;
        padding: 4px 10px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-partial {
        background-color: #f0ad4e;
        color: #ffffff;
        padding: 4px 10px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-missing {
        background-color: #d9534f;
        color: #ffffff;
        padding: 4px 10px;
        font-size: 0.75rem;
        font-weight: 600;
    }
</style>
<div class="document-preview">
    <div class="summary-box">
        <div class="summary-text">
            ${summaryParts.map(part => `<p>${part}</p>`).join('')}
        </div>
        <div class="definition-status">
            <div class="definition-status-title">Status elementów definicji wypadku przy pracy:</div>
            <div class="status-badges">
                ${statusBadges}
            </div>
        </div>
    </div>
</div>
    `.trim();
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
 * Generate opinion HTML document for accident qualification
 */
function generateOpinionHtml(caseData, extractedData, definitionStatus) {
    const accident = extractedData?.accident || {};
    const injury = extractedData?.injury || {};

    // Ekstrakcja i formatowanie danych
    const dateStr = accident.date ? formatPolishDate(accident.date) : '___________________';
    const timeStr = accident.time || '___________________';
    const injuryDesc = injury.description || '___________________________________________';
    const mechanismDesc = accident.mechanism ? translateMechanism(accident.mechanism) : '___________________________________________';
    const activityDesc = accident.circumstances || accident.activity || '___________________________________________';
    const externalCause = accident.cause || mechanismDesc || '___________________________________________';

    // Określenie typu wypadku na podstawie analizy związku z pracą
    const workRelationType = definitionStatus?.workRelation?.type ||
        'podczas wykonywania zwykłych czynności związanych z prowadzeniem pozarolniczej działalności gospodarczej';

    return `
${documentStyles}
<style>
    /* Style specyficzne dla opinii */
    .opinion-section { margin-bottom: 28px; }
    .opinion-section-header {
        font-size: 1.1rem;
        font-weight: 700;
        color: #006b4f;
        margin-bottom: 16px;
        padding: 8px 0;
        border-bottom: 3px solid #006b4f;
    }
    .opinion-subsection { margin-bottom: 16px; margin-left: 20px; }
    .opinion-subsection-title {
        font-weight: 600;
        color: #006b4f;
        margin-bottom: 8px;
    }
    .opinion-text {
        color: #333333;
        line-height: 1.8;
        text-align: justify;
        margin-bottom: 12px;
    }
    .opinion-list {
        margin-left: 20px;
        color: #333333;
        line-height: 1.8;
    }
    .opinion-list li { margin-bottom: 12px; }
    .opinion-conclusion {
        background-color: #e6f0ed;
        padding: 16px;
        border-left: 4px solid #006b4f;
        margin-top: 20px;
    }
    .opinion-highlight {
        font-weight: 600;
        color: #006b4f;
    }
    .opinion-fill {
        border-bottom: 1px solid #666;
        display: inline-block;
        min-width: 150px;
        color: #006b4f;
        font-weight: 600;
    }
</style>
<div class="document-preview">
    <div class="document-header">
        <h1>OPINIA W SPRAWIE KWALIFIKACJI WYPADKU</h1>
    </div>

    <div class="section">
        <p><strong>Nazwisko i imię poszkodowanego:</strong> 
           <span class="opinion-fill">${caseData.last_name} ${caseData.first_name}</span></p>
    </div>

    <hr style="border: none; border-top: 1px solid #e6f0ed; margin: 20px 0;" />

    <!-- I. Stan faktyczny -->
    <div class="opinion-section">
        <div class="opinion-section-header">I. Stan faktyczny</div>
        <div class="opinion-text">
            W dniu <span class="opinion-fill">${dateStr}</span> o godzinie <span class="opinion-fill">${timeStr}</span> 
            poszkodowany wykonywał czynności związane z prowadzeniem działalności gospodarczej o profilu 
            <span class="opinion-fill">${activityDesc}</span>. 
            W ramach realizowanych obowiązków poszkodowany <span class="opinion-fill">${activityDesc}</span>.
        </div>
        <div class="opinion-text">
            W trakcie zdarzenia poszkodowany <span class="opinion-fill">${mechanismDesc}</span>, 
            w wyniku czego doszło do <span class="opinion-fill">${injuryDesc}</span>. 
            Uraz potwierdzono w dokumentacji medycznej sporządzonej w dniu <span class="opinion-fill">${dateStr}</span>.
        </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e6f0ed; margin: 20px 0;" />

    <!-- II. Pytanie do rozstrzygnięcia -->
    <div class="opinion-section">
        <div class="opinion-section-header">II. Pytanie do rozstrzygnięcia</div>
        <div class="opinion-text">
            Czy zdarzenie z dnia <span class="opinion-fill">${dateStr}</span> należy zakwalifikować jako wypadek:
        </div>
        <ol class="opinion-list">
            <li>podczas wykonywania zwykłych czynności związanych z prowadzeniem pozarolniczej działalności gospodarczej,</li>
            <li>podczas współpracy przy prowadzeniu takiej działalności,</li>
            <li>podczas pracy wykonywanej na podstawie umowy uaktywniającej,</li>
            <li>w drodze do lub z miejsca wykonywania pozarolniczej działalności gospodarczej,</li>
            <li>w drodze związanej ze współpracą przy prowadzeniu działalności gospodarczej,</li>
            <li>w drodze do lub z miejsca wykonywania pracy na podstawie umowy uaktywniającej.</li>
        </ol>
    </div>

    <hr style="border: none; border-top: 1px solid #e6f0ed; margin: 20px 0;" />

    <!-- III. Wniosek -->
    <div class="opinion-section">
        <div class="opinion-section-header">III. Wniosek</div>
        <div class="opinion-text">
            Na podstawie zgromadzonych informacji i dokumentów proponuję uznać zdarzenie z dnia 
            <span class="opinion-fill">${dateStr}</span> za wypadek 
            <span class="opinion-highlight">${workRelationType}</span>.
        </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e6f0ed; margin: 20px 0;" />

    <!-- IV. Uzasadnienie -->
    <div class="opinion-section">
        <div class="opinion-section-header">IV. Uzasadnienie</div>
        <div class="opinion-text">
            W toku analizy zgromadzonego materiału ustalono następujące okoliczności:
        </div>

        <!-- 4 podsekcje uzasadnienia -->
        <div class="opinion-subsection">
            <div class="opinion-subsection-title">1. Nagłość zdarzenia</div>
            <div class="opinion-text">
                ${definitionStatus?.suddenness?.status === 'COMPLETE' 
                    ? `Zdarzenie miało charakter nagły i wystąpiło w trakcie jednej dniówki roboczej, bez oznak stopniowego narastania przyczyn. Zdarzenie miało miejsce w dniu ${dateStr} o godzinie ${timeStr}.`
                    : 'Zdarzenie miało charakter nagły i wystąpiło w trakcie jednej dniówki roboczej, bez oznak stopniowego narastania przyczyn.'}
            </div>
        </div>

        <div class="opinion-subsection">
            <div class="opinion-subsection-title">2. Przyczyna zewnętrzna</div>
            <div class="opinion-text">
                ${definitionStatus?.externalCause?.status === 'COMPLETE'
                    ? `Do urazu doszło na skutek oddziaływania czynnika zewnętrznego w postaci <span class="opinion-highlight">${externalCause}</span>.`
                    : `Do urazu doszło na skutek oddziaływania czynnika zewnętrznego.`}
            </div>
        </div>

        <div class="opinion-subsection">
            <div class="opinion-subsection-title">3. Związek funkcjonalny z wykonywaną działalnością</div>
            <div class="opinion-text">
                ${definitionStatus?.workRelation?.status === 'COMPLETE'
                    ? `W momencie zdarzenia poszkodowany wykonywał czynność bezpośrednio związaną z prowadzoną działalnością gospodarczą, polegającą na <span class="opinion-highlight">${activityDesc}</span>. 
                       Czynność ta mieści się w zwykłym zakresie działań niezbędnych do realizacji przedmiotu działalności.`
                    : `W momencie zdarzenia poszkodowany wykonywał czynność bezpośrednio związaną z prowadzoną działalnością gospodarczą. 
                       Czynność ta mieści się w zwykłym zakresie działań niezbędnych do realizacji przedmiotu działalności.`}
            </div>
        </div>

        <div class="opinion-subsection">
            <div class="opinion-subsection-title">4. Skutek w postaci urazu</div>
            <div class="opinion-text">
                ${definitionStatus?.injury?.status === 'COMPLETE'
                    ? `Zdarzenie skutkowało urazem określonym jako <span class="opinion-highlight">${injuryDesc}</span>, co potwierdzają dokumenty medyczne.`
                    : `Zdarzenie skutkowało urazem, co potwierdzają dokumenty medyczne.`}
            </div>
        </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e6f0ed; margin: 20px 0;" />

    <!-- V. Konkluzja -->
    <div class="opinion-section">
        <div class="opinion-section-header">V. Konkluzja</div>
        <div class="opinion-conclusion">
            <div class="opinion-text">
                Biorąc pod uwagę łączną ocenę nagłości, przyczyny zewnętrznej oraz funkcjonalnego związku zdarzenia 
                z wykonywaną działalnością gospodarczą należy uznać, że zdarzenie z dnia 
                <span class="opinion-fill">${dateStr}</span> spełnia przesłanki wypadku 
                <span class="opinion-highlight">${workRelationType}</span>.
            </div>
        </div>
    </div>
</div>
    `.trim();
}

/**
 * Helper: Translate mechanism code to Polish
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

