import React, { useState, useEffect } from 'react';
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
            case 'complete': return 'bg-status-success';
            case 'partial': return 'bg-status-warning';
            case 'missing': return 'bg-status-error';
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

    const getItemClass = (type: string) => {
        switch (type) {
            case 'required': return 'text-status-error';
            case 'recommended': return 'text-status-warning';
            default: return 'text-text-main';
        }
    };

    const getBulletClass = (type: string) => {
        switch (type) {
            case 'required': return 'bg-status-error';
            case 'recommended': return 'bg-status-warning';
            default: return 'bg-[#999]';
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen text-[1.2rem] text-text-muted">Ładowanie...</div>;
    }

    return (
        <div className="w-full min-h-screen flex flex-col p-5 gap-5 bg-transparent">
            <ZantHeader step="Krok 2 - Szczegóły i dokumenty" />

            <div className="max-w-[2000px] w-[85vw] bg-bg-panel rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-border-light mx-auto p-6 flex flex-col gap-5">
                <div className="text-left mb-6 text-text-main text-[1.05rem] font-normal">
                    Na tym etapie prosimy o uzupełnienie szczegółowych informacji dotyczących wypadku oraz przygotowanie wymaganych dokumentów. System na podstawie podanych danych wygeneruje projekty dokumentów do zgłoszenia wypadku przy pracy.
                </div>

                <div className="text-base font-bold text-text-main pl-[5px] border-l-4 border-primary-dark leading-none mb-[10px]">{caseData.screenLabel}</div>

                <main className="flex gap-[30px] flex-1 min-h-0 max-[960px]:flex-col">
                    <section className="flex-[3] bg-bg-panel flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-border-light min-h-[400px]">
                        <div className="py-[15px] px-5 bg-[#fcfcfc] border-b border-border-light">
                            <div className="text-[1.1rem] font-semibold text-text-main">{caseData.chatTitle}</div>
                            <div className="text-[0.85rem] text-text-muted">{caseData.chatSubtitle}</div>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-[15px] bg-white">
                            {caseData.messages.map((msg) => (
                                <React.Fragment key={msg.id}>
                                    <div className={`flex w-full ${msg.type === 'assistant' ? 'justify-start' : msg.type === 'user' ? 'justify-end' : 'justify-center'}`}>
                                        <div className={`max-w-[85%] py-3 px-4 rounded-none text-[0.95rem] leading-normal
                                            ${msg.type === 'assistant' ? 'bg-bubble-assistant border-l-[3px] border-primary-dark text-text-main' : ''}
                                            ${msg.type === 'user' ? 'bg-bubble-user text-bubble-user-text border border-[#d0e0dc]' : ''}
                                            ${msg.type === 'system' ? 'bg-white text-text-muted text-[0.85rem] italic border border-dashed border-border-light text-center' : ''}`}>
                                            {msg.type === 'assistant' ? (
                                                <>
                                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} />
                                                    {msg.quickActions && (
                                                        <div className="mt-[10px] flex flex-wrap gap-2">
                                                            {msg.quickActions.map((action, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    className={`rounded border py-1.5 px-3 text-[0.85rem] cursor-pointer transition-all duration-200
                                                                        ${action.isPrimary 
                                                                            ? 'border-primary-main text-primary-main bg-primary-light font-semibold' 
                                                                            : 'border-border-light bg-white text-text-main hover:bg-[#f2f2f2] hover:border-[#999]'}`}
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
                                        <div className={`mt-1 text-[0.75rem] text-text-muted font-semibold ${msg.type === 'assistant' ? 'ml-1' : 'text-right mr-1'}`}>
                                            {msg.type === 'assistant' ? 'Asystent ZANT' : 'Ty'} · {msg.timestamp}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="border-t border-border-light py-[15px] px-5 bg-[#f9f9f9] flex flex-col gap-[10px]">
                            <div className="text-[0.85rem] text-text-muted">
                                Aktualne pytanie: <strong>{caseData.currentQuestion}</strong>
                            </div>
                            <div className="flex gap-[10px]">
                                <textarea
                                    className="flex-1 rounded-none border border-border-light p-[10px] text-base outline-none bg-white min-h-[50px] resize-y font-[inherit] focus:border-primary-main focus:shadow-[0_0_0_1px_var(--color-primary-main)]"
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
                            <button
                                className="rounded border-none bg-secondary-main text-secondary-dark px-6 py-0 text-base font-bold cursor-pointer self-end h-10 mt-[5px] transition-colors duration-200 hover:bg-secondary-dark hover:text-secondary-main"
                                onClick={handleSendMessage}
                            >
                                Wyślij odpowiedź
                            </button>
                        </div>
                    </section>

                    <aside className="flex-[2] bg-bg-panel p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-border-light flex flex-col gap-5 max-[960px]:order-[-1]">
                        <div>
                            <div className="text-[1.1rem] font-semibold text-primary-main">{caseData.statusTitle} {caseData.caseId}</div>
                            <div className="text-[0.85rem] text-text-muted">{caseData.statusSubtitle}</div>
                            <div className="mt-2">
                                <div className="flex justify-between text-[0.8rem] text-text-main font-semibold mb-[5px]">
                                    <span>Postęp informacji</span>
                                    <span>{caseData.progress}%</span>
                                </div>
                                <div className="w-full h-[10px] bg-[#e9ecef] rounded-none">
                                    <div className="h-full bg-primary-main" style={{ width: `${caseData.progress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-[0.95rem] font-bold mb-2 text-text-main border-b border-border-light pb-1">Definicja wypadku przy pracy</div>
                            <div className="grid grid-cols-2 gap-[10px]">
                                {caseData.definitions.map((def, idx) => (
                                    <div className="border border-border-light p-[10px] flex flex-col gap-[5px] bg-white" key={idx}>
                                        <div className="font-semibold text-[0.85rem] text-text-main">{def.title}</div>
                                        <span className={`self-start py-[2px] px-1.5 text-[0.75rem] font-semibold text-white ${getStatusClass(def.status)}`}>
                                            {getStatusLabel(def.status)}
                                        </span>
                                        <div className="text-[0.75rem] text-text-muted mt-[2px]">{def.note}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-[10px]">
                            <div className="text-[0.95rem] font-bold mb-2 text-text-main border-b border-border-light pb-1">Informacje wymagane</div>
                            <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                {caseData.requiredInfos.map((info, idx) => (
                                    <li className={`text-[0.85rem] flex gap-2 items-start ${getItemClass(info.type)}`} key={idx}>
                                        <span className={`w-2 h-2 mt-1.5 shrink-0 ${getBulletClass(info.type)}`} />
                                        <span>{info.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-[10px]">
                            <div className="text-[0.95rem] font-bold mb-2 text-text-main border-b border-border-light pb-1">Dokumenty do przygotowania</div>
                            <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                {caseData.documentsToPrep.map((doc, idx) => (
                                    <li className={`text-[0.85rem] flex gap-2 items-start ${getItemClass(doc.type)}`} key={idx}>
                                        <span className={`w-2 h-2 mt-1.5 shrink-0 ${getBulletClass(doc.type)}`} />
                                        <span>{doc.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </main>

                <section className="bg-bg-panel p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-border-light flex flex-col gap-[15px] mt-[10px]">
                    <div className="flex justify-between items-center border-b border-border-light pb-[10px]">
                        <div className="text-[1.1rem] font-semibold text-primary-main">Projekty dokumentów</div>
                        <div className="inline-flex gap-[2px]">
                            {caseData.documents.map((doc) => (
                                <button
                                    key={doc.id}
                                    className={`py-2 px-4 border border-transparent bg-transparent cursor-pointer font-semibold border-b-[3px]
                                        ${caseData.activeTab === doc.title 
                                            ? 'text-primary-main border-b-primary-main' 
                                            : 'text-text-muted border-b-transparent'}`}
                                    onClick={() => handleTabChange(doc.title)}
                                >
                                    {doc.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5 max-[640px]:grid-cols-1">
                        {caseData.documents.map((doc) => (
                            <div className="border border-border-light p-[15px] bg-white flex flex-col gap-[10px]" key={doc.id}>
                                <div className="font-bold text-[0.95rem] text-text-main">{doc.title}</div>
                                <div className="text-[0.8rem] text-text-muted italic">{doc.meta}</div>
                                <div
                                    className="text-[0.85rem] text-[#333] bg-[#f9f9f9] border border-[#eee] p-[10px] max-h-[100px] overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: doc.preview }}
                                />
                                <div className="mt-[5px] flex gap-[10px]">
                                    <button className="rounded border border-secondary-main bg-secondary-main text-secondary-dark py-1.5 px-3.5 text-[0.8rem] cursor-pointer font-semibold hover:bg-secondary-dark hover:text-secondary-main transition-colors duration-200">Pobierz jako PDF</button>
                                    <button className="rounded border border-border-light bg-white text-text-main py-1.5 px-3.5 text-[0.8rem] cursor-pointer font-semibold">Pobierz jako .docx</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-[0.8rem] text-text-muted italic mt-[10px]">
                        {caseData.footerNote}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default CaseDetails;

