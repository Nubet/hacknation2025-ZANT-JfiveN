import React, { useState, useEffect } from 'react';
import './CaseDetails.css';
import ZantHeader from './ZantHeader';

// Types for the case data
interface Message {
    id: string;
    type: 'assistant' | 'user' | 'system';
    content: string;
    timestamp?: string;
    quickActions?: QuickAction[];
}

interface QuickAction {
    label: string;
    isPrimary?: boolean;
}

interface DefinitionItem {
    title: string;
    status: 'complete' | 'partial' | 'missing';
    note: string;
}

interface RequiredInfo {
    text: string;
    type: 'required' | 'recommended' | 'normal';
}

interface Document {
    id: string;
    title: string;
    meta: string;
    preview: string;
}

interface CaseData {
    caseId: string;
    step: string;
    headerTitle: string;
    headerSubtitle: string;
    screenLabel: string;
    chatTitle: string;
    chatSubtitle: string;
    messages: Message[];
    currentQuestion: string;
    progress: number;
    statusTitle: string;
    statusSubtitle: string;
    definitions: DefinitionItem[];
    requiredInfos: RequiredInfo[];
    documentsToPrep: RequiredInfo[];
    documents: Document[];
    activeTab: string;
    footerNote: string;
}

const CaseDetails: React.FC = () => {
    const [caseData, setCaseData] = useState<CaseData>({
        caseId: 'ZANT/2025/00123',
        step: 'Krok 2 · Szczegóły i dokumenty',
        headerTitle: 'Asystent zgłoszenia ZANT',
        headerSubtitle: 'Ten ekran pojawia się po przesłaniu Twojego opisu. Poniżej widzisz rozmowę doprecyzowującą, status czterech elementów definicji wypadku oraz projekty dokumentów do pobrania.',
        screenLabel: 'Rozmowa doprecyzowująca i podsumowanie sprawy',
        chatTitle: 'Kontynuacja rozmowy',
        chatSubtitle: 'Na podstawie Twojego opisu uzupełniamy formalne informacje potrzebne do zgłoszenia wypadku.',
        messages: [
            {
                id: '1',
                type: 'system',
                content: 'Przetworzono Twój opis. Wstępnie uzupełniono dane o czasie, miejscu zdarzenia, czynnościach, przyczynie zewnętrznej oraz wstępnym urazie. Poniżej zobaczysz szczegółowe pytania.'
            },
            {
                id: '2',
                type: 'assistant',
                content: `Teraz doprecyzujemy przebieg zdarzenia i uraz. Najpierw potwierdźmy, jak rozumiem Twoją historię:
1. W magazynie wykonywałeś prace przy przenoszeniu paczek w ramach swojej działalności.
2. Podłoga była mokra i nieoznaczona jako śliska.
3. Poślizgnąłeś się, upadłeś na lewe kolano i uderzyłeś o kant palety.
4. Wystąpił ból i obrzęk, następnie zgłosiłeś się na SOR.

Główna przyczyna wygląda na: **poślizgnięcie na śliskiej powierzchni podczas pracy**. Czy to się zgadza.`,
                timestamp: '09:18',
                quickActions: [
                    { label: 'Tak, zgadza się', isPrimary: true },
                    { label: 'Chcę to poprawić' }
                ]
            },
            {
                id: '3',
                type: 'assistant',
                content: 'Jakiego dokładnie urazu doznałeś. Możesz opisać własnymi słowami albo wybrać z listy.',
                timestamp: '09:19',
                quickActions: [
                    { label: 'Skręcenie lewego kolana' },
                    { label: 'Zwichnięcie / skręcenie stawu' },
                    { label: 'Inny uraz kończyny dolnej' }
                ]
            },
            {
                id: '4',
                type: 'user',
                content: 'Skręcenie lewego kolana, potwierdzone w dokumentacji z SOR.',
                timestamp: '09:20'
            },
            {
                id: '5',
                type: 'system',
                content: 'Uraz kolana zapisany. Zaktualizowano panel „Uraz" oraz listę dokumentów (wymagana dokumentacja medyczna).'
            },
            {
                id: '6',
                type: 'assistant',
                content: 'Czy ktoś widział ten wypadek albo ma o nim bezpośrednią wiedzę.',
                timestamp: '09:21',
                quickActions: [
                    { label: 'Tak, był świadek', isPrimary: true },
                    { label: 'Nie było świadków' }
                ]
            }
        ],
        currentQuestion: 'Czy byli świadkowie zdarzenia.',
        progress: 68,
        statusTitle: 'Status sprawy',
        statusSubtitle: 'Dane z Twojego opisu zostały wstępnie uporządkowane. Brakujące elementy uzupełniamy w rozmowie.',
        definitions: [
            {
                title: 'Nagłość',
                status: 'complete',
                note: 'Z opisu wynika jedno zdarzenie w określonym dniu i godzinie.'
            },
            {
                title: 'Przyczyna zewnętrzna',
                status: 'partial',
                note: 'Wskazano poślizgnięcie na mokrej podłodze. Trwa doprecyzowanie przebiegu.'
            },
            {
                title: 'Uraz',
                status: 'partial',
                note: 'Opisano skręcenie kolana. Wymagana dokumentacja medyczna i dane placówki.'
            },
            {
                title: 'Związek z pracą',
                status: 'partial',
                note: 'Zdarzenie miało miejsce w magazynie podczas wykonywania czynności w ramach działalności.'
            }
        ],
        requiredInfos: [
            { text: 'Brak potwierdzenia, czy byli świadkowie zdarzenia oraz ich danych kontaktowych.', type: 'required' },
            { text: 'Brak szczegółowych danych o placówce medycznej udzielającej pomocy (nazwa, adres).', type: 'required' },
            { text: 'Dane pełnomocnika nie zostały podane – przyjmujemy, że zgłaszasz osobiście.', type: 'normal' }
        ],
        documentsToPrep: [
            { text: 'Dokumentacja medyczna potwierdzająca uraz kolana (karta informacyjna z SOR).', type: 'recommended' },
            { text: 'Notatka policji – tylko jeżeli wypadek był komunikacyjny.', type: 'normal' },
            { text: 'Pełnomocnictwo – jeżeli wniosek będzie składał pełnomocnik.', type: 'normal' }
        ],
        documents: [
            {
                id: '1',
                title: 'Zawiadomienie o wypadku przy pracy',
                meta: 'Projekt na podstawie Twojego opisu i odpowiedzi w rozmowie. Wymaga sprawdzenia i podpisu.',
                preview: `<strong>1. Dane poszkodowanego</strong><br>
Jan Kowalski, prowadzący działalność gospodarczą w zakresie prac magazynowych, PESEL 84010112345.<br><br>
<strong>2. Data i miejsce wypadku</strong><br>
4 grudnia 2025 r., ok. godz. 7:30, magazyn przy ul. Przemysłowej 10 w Warszawie.<br><br>
<strong>3. Okoliczności wypadku</strong><br>
W trakcie przenoszenia paczek poślizgnął się na mokrej, nieoznaczonej podłodze i upadł na lewe kolano, uderzając o kant palety. W wyniku zdarzenia doszło do skręcenia lewego kolana...`
            },
            {
                id: '2',
                title: 'Wyjaśnienia poszkodowanego',
                meta: 'Tekst wyjaśnień uporządkowany według przebiegu zdarzenia. Możesz wprowadzić ręczne korekty.',
                preview: `Ja, Jan Kowalski, oświadczam, że w dniu 4 grudnia 2025 r. około godziny 7:30, w magazynie przy ul. Przemysłowej 10 w Warszawie, podczas wykonywania czynności związanych z moją działalnością gospodarczą polegających na przenoszeniu paczek, poślizgnąłem się na mokrej i nieoznaczonej jako śliska podłodze i upadłem na lewe kolano, uderzając o kant palety, w wyniku czego doznałem skręcenia lewego kolana...`
            }
        ],
        activeTab: 'Zawiadomienie',
        footerNote: 'Po pobraniu dokumentów przeczytaj je uważnie, wprowadź ewentualne poprawki, podpisz i złóż w ZUS lub przez PUE. W panelu statusu widzisz listę dokumentów do załączenia.'
    });

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch case data from backend
    useEffect(() => {
        const fetchCaseData = async () => {
            setIsLoading(true);
            try {
                // Replace with actual API endpoint
                // const response = await fetch(`/api/cases/${caseId}`);
                // const data = await response.json();
                // setCaseData(data);
            } catch (error) {
                console.error('Error fetching case data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCaseData();
    }, []);

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        };

        setCaseData(prev => ({
            ...prev,
            messages: [...prev.messages, newMessage]
        }));
        setInputValue('');

        // Here you would send the message to the backend
        // and receive the next assistant message
    };

    const handleQuickAction = (action: QuickAction) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: action.label,
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        };

        setCaseData(prev => ({
            ...prev,
            messages: [...prev.messages, newMessage]
        }));
    };

    const handleTabChange = (tab: string) => {
        setCaseData(prev => ({ ...prev, activeTab: tab }));
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'complete': return 'status-complete';
            case 'partial': return 'status-partial';
            case 'missing': return 'status-error';
            default: return '';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'complete': return 'Dane kompletne';
            case 'partial': return 'Dane częściowe';
            case 'missing': return 'Brak danych';
            default: return '';
        }
    };

    if (isLoading) {
        return <div className="loading">Ładowanie...</div>;
    }

    return (
        <div className="app-shell">
            <ZantHeader step="Krok 2 - Szczególy i dokumenty" />

            <div className="main-window">
                <div className="page-subtitle" style={{ textAlign: 'left', marginBottom: 24, color: '#333', fontSize: '1.05rem', fontWeight: 400 }}>
                    Na tym etapie prosimy o uzupełnienie szczegółowych informacji dotyczących wypadku oraz przygotowanie wymaganych dokumentów. System na podstawie podanych danych wygeneruje projekty dokumentów do zgłoszenia wypadku przy pracy.
                </div>

                <div className="screen-label">{caseData.screenLabel}</div>

                <main className="main-layout">
                    <section className="chat-shell">
                        <div className="chat-header">
                            <div className="chat-title">{caseData.chatTitle}</div>
                            <div className="chat-subtitle">{caseData.chatSubtitle}</div>
                        </div>
                        <div className="chat-history">
                            {caseData.messages.map((msg) => (
                                <React.Fragment key={msg.id}>
                                    <div className={`msg-row ${msg.type}`}>
                                        <div className={`msg-bubble ${msg.type}`}>
                                            {msg.type === 'assistant' ? (
                                                <>
                                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} />
                                                    {msg.quickActions && (
                                                        <div className="quick-actions">
                                                            {msg.quickActions.map((action, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    className={`quick-button ${action.isPrimary ? 'primary' : ''}`}
                                                                    onClick={() => handleQuickAction(action)}
                                                                >
                                                                    {action.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                    {msg.timestamp && (
                                        <div className={`msg-meta ${msg.type}`}>
                                            {msg.type === 'assistant' ? 'Asystent ZANT' : 'Ty'} · {msg.timestamp}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="chat-input-shell">
                            <div className="chat-input-label">
                                Aktualne pytanie: <strong>{caseData.currentQuestion}</strong>
                            </div>
                            <div className="chat-input-row">
                                <textarea
                                    className="chat-input"
                                    placeholder="Np. Tak, był świadek – Jan Nowak, współpracownik obecny w magazynie..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                            </div>
                            <button className="chat-send" onClick={handleSendMessage}>
                                Wyślij odpowiedź
                            </button>
                        </div>
                    </section>

                    <aside className="status-panel">
                        <div>
                            <div className="status-header-title">{caseData.statusTitle} {caseData.caseId}</div>
                            <div className="status-header-subtitle">{caseData.statusSubtitle}</div>
                            <div className="progress-shell">
                                <div className="progress-label">
                                    <span>Postęp informacji</span>
                                    <span>{caseData.progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${caseData.progress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="section-title">Definicja wypadku przy pracy</div>
                            <div className="definition-grid">
                                {caseData.definitions.map((def, idx) => (
                                    <div className="definition-card" key={idx}>
                                        <div className="definition-title">{def.title}</div>
                                        <span className={`definition-status-pill ${getStatusClass(def.status)}`}>
                                            {getStatusLabel(def.status)}
                                        </span>
                                        <div className="definition-note">{def.note}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="section-block">
                            <div className="section-title">Informacje wymagane</div>
                            <ul className="section-list">
                                {caseData.requiredInfos.map((info, idx) => (
                                    <li className={`section-item ${info.type}`} key={idx}>
                                        <span className="section-bullet" />
                                        <span>{info.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="section-block">
                            <div className="section-title">Dokumenty do przygotowania</div>
                            <ul className="section-list">
                                {caseData.documentsToPrep.map((doc, idx) => (
                                    <li className={`section-item ${doc.type}`} key={idx}>
                                        <span className="section-bullet" />
                                        <span>{doc.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </main>

                <section className="documents-shell">
                    <div className="documents-header">
                        <div className="documents-title">Projekty dokumentów</div>
                        <div className="tab-bar">
                            {caseData.documents.map((doc) => (
                                <button
                                    key={doc.id}
                                    className={`tab-button ${caseData.activeTab === doc.title ? 'active' : ''}`}
                                    onClick={() => handleTabChange(doc.title)}
                                >
                                    {doc.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="documents-grid">
                        {caseData.documents.map((doc) => (
                            <div className="document-card" key={doc.id}>
                                <div className="document-title">{doc.title}</div>
                                <div className="document-meta">{doc.meta}</div>
                                <div
                                    className="document-body-preview"
                                    dangerouslySetInnerHTML={{ __html: doc.preview }}
                                />
                                <div className="document-actions">
                                    <button className="doc-button primary">Pobierz jako PDF</button>
                                    <button className="doc-button">Pobierz jako .docx</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="document-meta" style={{ marginTop: '10px' }}>
                        {caseData.footerNote}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default CaseDetails;

