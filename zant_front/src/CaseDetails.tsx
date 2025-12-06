import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ZantHeader from './ZantHeader';
import { api, ApiError } from './apiClient';
import type {
    CaseStatusResponse,
    DocumentsPreviewResponse,
    ChatMessage
} from './apiClient';

// Types for the case data
interface QuickAction {
    label: string;
    value?: string;
    isPrimary?: boolean;
}

interface Message {
    id: string;
    type: 'assistant' | 'user' | 'system';
    content: string;
    timestamp?: string;
    quickActions?: QuickAction[];
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

const CaseDetails: React.FC = () => {
    const location = useLocation();

    // Extract caseId from URL path (handles slashes in caseId like ZANT/2025/000123)
    const extractCaseIdFromPath = (): string => {
        const path = location.pathname;
        const prefix = '/case/edit/';
        if (path.startsWith(prefix)) {
            return decodeURIComponent(path.slice(prefix.length));
        }
        return '';
    };

    // Get data passed from first screen via location state
    const locationState = location.state as { caseId?: string; createdAt?: string } | null;
    const caseId = extractCaseIdFromPath() || locationState?.caseId || '';

    console.log('[CaseDetails] Component rendering');
    console.log('[CaseDetails] URL pathname:', location.pathname);
    console.log('[CaseDetails] Location state:', locationState);
    console.log('[CaseDetails] Extracted caseId:', caseId);

    // State for API data
    const [progress, setProgress] = useState<number>(0);
    const [definitions, setDefinitions] = useState<DefinitionItem[]>([]);
    const [requiredInfos, setRequiredInfos] = useState<RequiredInfo[]>([]);
    const [documentsToPrep, setDocumentsToPrep] = useState<RequiredInfo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [currentQuestionId, setCurrentQuestionId] = useState<string>('');

    // UI state
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ref for auto-scrolling chat to bottom
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Map API status to UI status
    const mapApiStatusToUi = (status: 'EMPTY' | 'PARTIAL' | 'COMPLETE'): 'complete' | 'partial' | 'missing' => {
        switch (status) {
            case 'COMPLETE': return 'complete';
            case 'PARTIAL': return 'partial';
            case 'EMPTY': return 'missing';
            default: return 'missing';
        }
    };

    // Process API status response
    const processStatusResponse = (statusData: CaseStatusResponse) => {
        console.log('[CaseDetails] Processing status response:', statusData);

        setProgress(statusData.progressPercent);

        // Map definitions
        const mappedDefinitions: DefinitionItem[] = [
            { title: 'Nagłość', status: mapApiStatusToUi(statusData.definition.suddenness.status), note: statusData.definition.suddenness.explanation },
            { title: 'Przyczyna zewnętrzna', status: mapApiStatusToUi(statusData.definition.externalCause.status), note: statusData.definition.externalCause.explanation },
            { title: 'Uraz', status: mapApiStatusToUi(statusData.definition.injury.status), note: statusData.definition.injury.explanation },
            { title: 'Związek z pracą', status: mapApiStatusToUi(statusData.definition.workRelation.status), note: statusData.definition.workRelation.explanation }
        ];
        setDefinitions(mappedDefinitions);

        // Map required infos
        const mappedRequiredInfos: RequiredInfo[] = [
            ...statusData.missingInfo.requiredMissing.map(text => ({ text, type: 'required' as const })),
            ...statusData.missingInfo.recommendedMissing.map(text => ({ text, type: 'recommended' as const }))
        ];
        setRequiredInfos(mappedRequiredInfos);

        // Map documents to prep
        const mappedDocsToPrep: RequiredInfo[] = statusData.missingInfo.documentsNeeded.map(text => ({
            text,
            type: 'recommended' as const
        }));
        setDocumentsToPrep(mappedDocsToPrep);
    };

    // Process documents preview response
    const processDocumentsResponse = (docsData: DocumentsPreviewResponse) => {
        console.log('[CaseDetails] Processing documents response');

        const mappedDocuments: Document[] = [
            {
                id: '1',
                title: 'Zawiadomienie o wypadku przy pracy',
                meta: 'Projekt na podstawie Twojego opisu i odpowiedzi w rozmowie. Wymaga sprawdzenia i podpisu.',
                preview: docsData.notificationHtml
            },
            {
                id: '2',
                title: 'Wyjaśnienia poszkodowanego',
                meta: 'Tekst wyjaśnień uporządkowany według przebiegu zdarzenia. Możesz wprowadzić ręczne korekty.',
                preview: docsData.explanationHtml
            }
        ];
        setDocuments(mappedDocuments);
    };

    // Process chat history response
    const processChatHistory = (chatMessages: ChatMessage[], questionId: string) => {
        console.log('[CaseDetails] Processing chat history:', chatMessages.length, 'messages');

        const mappedMessages: Message[] = chatMessages.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            quickActions: msg.quickActions?.map(qa => ({
                label: qa.label,
                value: qa.value,
                isPrimary: qa.isPrimary
            }))
        }));
        setMessages(mappedMessages);
        setCurrentQuestionId(questionId);

        // Set current question from last assistant message
        const lastAssistantMsg = [...chatMessages].reverse().find(m => m.type === 'assistant');
        if (lastAssistantMsg) {
            setCurrentQuestion(lastAssistantMsg.content.substring(0, 100) + '...');
        }
    };

    // Fetch all case data on mount
    useEffect(() => {
        const fetchCaseData = async () => {
            console.log('[CaseDetails] fetchCaseData called with caseId:', caseId);

            if (!caseId) {
                console.error('[CaseDetails] No caseId provided');
                setError('Brak identyfikatora sprawy');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                console.log('[CaseDetails] Fetching case data from API');

                // Fetch all data in parallel
                const [statusData, docsData, chatData] = await Promise.all([
                    api.getCaseStatus(caseId),
                    api.getDocuments(caseId),
                    api.getChatHistory(caseId)
                ]);

                console.log('[CaseDetails] Status response:', statusData);
                console.log('[CaseDetails] Documents response:', docsData);
                console.log('[CaseDetails] Chat history response:', chatData);

                processStatusResponse(statusData);
                processDocumentsResponse(docsData);
                processChatHistory(chatData.messages, chatData.currentQuestionId);

                console.log('[CaseDetails] State updated successfully');
            } catch (err) {
                console.error('[CaseDetails] Error fetching case data:', err);
                if (err instanceof ApiError) {
                    setError(err.message);
                } else {
                    setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas pobierania danych sprawy');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchCaseData();
    }, [caseId]);

    // Send a chat message
    const handleSendMessage = async (messageText?: string, questionId?: string) => {
        const text = messageText || inputValue.trim();
        if (!text || !caseId) return;

        console.log('[CaseDetails] Sending message:', text);

        // Add user message immediately
        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsSending(true);

        try {
            console.log('[CaseDetails] Sending message via API');
            const response = await api.sendChatMessage(caseId, {
                message: text,
                questionId: questionId || currentQuestionId || null
            });
            console.log('[CaseDetails] Chat response:', response);

            // Add assistant message
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: response.assistantReply,
                timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                quickActions: getQuickActionsForQuestion(response.nextQuestionId)
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Update status and documents from response
            processStatusResponse(response.caseStatus);
            processDocumentsResponse(response.documentsPreview);
            setCurrentQuestionId(response.nextQuestionId || '');
            setCurrentQuestion(response.assistantReply.substring(0, 100) + '...');

        } catch (err) {
            console.error('[CaseDetails] Error sending message:', err);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'system',
                content: 'Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    };

    // Get quick actions based on question ID
    const getQuickActionsForQuestion = (questionId: string | null): QuickAction[] | undefined => {
        if (!questionId) return undefined;

        switch (questionId) {
            case 'witness_presence':
                return [
                    { label: 'Tak, był świadek', value: 'yes_witness', isPrimary: true },
                    { label: 'Nie było świadków', value: 'no_witness' }
                ];
            case 'medical_docs':
                return [
                    { label: 'Tak, mam dokumentację', value: 'has_docs', isPrimary: true },
                    { label: 'Nie mam jeszcze', value: 'no_docs' },
                    { label: 'Zamówię kopię', value: 'will_order' }
                ];
            default:
                return undefined;
        }
    };

    // Handle quick action click
    const handleQuickAction = (action: QuickAction) => {
        console.log('[CaseDetails] Quick action clicked:', action);
        handleSendMessage(action.label, action.value);
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

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen text-[1.2rem] text-text-muted">
                Ładowanie sprawy {caseId}...
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen flex-col gap-4">
                <div className="text-[1.2rem] text-status-error">Błąd: {error}</div>
                <div className="text-sm text-text-muted">CaseId: {caseId || '(brak)'}</div>
                <button
                    className="rounded border-none bg-secondary-main text-secondary-dark py-2 px-6 text-base font-bold cursor-pointer"
                    onClick={() => window.location.href = '/case/create'}
                >
                    Powrót do formularza
                </button>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex flex-col p-5 gap-5 bg-bg-main">
            <ZantHeader step="Krok 2 - Szczegóły i dokumenty" />

            <div className="max-w-[2000px] w-[85vw] bg-bg-panel rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-border-light mx-auto p-6 flex flex-col gap-5">
                <div className="text-left mb-6 text-text-main text-[1.05rem] font-normal">
                    Na tym etapie prosimy o uzupełnienie szczegółowych informacji dotyczących wypadku oraz przygotowanie wymaganych dokumentów. System na podstawie podanych danych wygeneruje projekty dokumentów do zgłoszenia wypadku przy pracy.
                </div>

                <div className="text-base font-bold text-text-main pl-[5px] border-l-4 border-primary-dark leading-none mb-[10px]">
                    Rozmowa doprecyzowująca i podsumowanie sprawy
                </div>

                <main className="flex gap-[30px] flex-1 min-h-0 max-[960px]:flex-col">
                    {/* Chat Section */}
                    <section className="flex-[3] bg-bg-panel flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-border-light min-h-[400px]">
                        <div className="py-[15px] px-5 bg-[#fcfcfc] border-b border-border-light">
                            <div className="text-[1.1rem] font-semibold text-text-main">Kontynuacja rozmowy</div>
                            <div className="text-[0.85rem] text-text-muted">
                                Na podstawie Twojego opisu uzupełniamy formalne informacje potrzebne do zgłoszenia wypadku.
                            </div>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-[15px] bg-white max-h-[600px]">
                            {messages.map((msg) => (
                                <React.Fragment key={msg.id}>
                                    <div className={`flex w-full ${msg.type === 'assistant' ? 'justify-start' : msg.type === 'user' ? 'justify-end' : 'justify-center'}`}>
                                        <div className={`max-w-[85%] py-3 px-4 rounded-none text-[0.95rem] leading-normal
                                            ${msg.type === 'assistant' ? 'bg-bubble-assistant border-l-[3px] border-primary-dark text-text-main' : ''}
                                            ${msg.type === 'user' ? 'bg-bubble-user text-bubble-user-text border border-[#d0e0dc]' : ''}
                                            ${msg.type === 'system' ? 'bg-white text-text-muted text-[0.85rem] italic border border-dashed border-border-light text-center' : ''}`}>
                                            {msg.type === 'assistant' ? (
                                                <>
                                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} />
                                                    {msg.quickActions && msg.quickActions.length > 0 && (
                                                        <div className="mt-[10px] flex flex-wrap gap-2">
                                                            {msg.quickActions.map((action, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    className={`rounded border py-1.5 px-3 text-[0.85rem] cursor-pointer transition-all duration-200
                                                                        ${action.isPrimary 
                                                                            ? 'border-primary-main text-primary-main bg-primary-light font-semibold' 
                                                                            : 'border-border-light bg-white text-text-main hover:bg-[#f2f2f2] hover:border-[#999]'}`}
                                                                    onClick={() => handleQuickAction(action)}
                                                                    disabled={isSending}
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
                            {isSending && (
                                <div className="flex justify-start">
                                    <div className="bg-bubble-assistant border-l-[3px] border-primary-dark text-text-muted py-3 px-4 italic">
                                        Asystent pisze...
                                    </div>
                                </div>
                            )}
                            {/* Invisible element for auto-scroll */}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="border-t border-border-light py-[15px] px-5 bg-[#f9f9f9] flex flex-col gap-[10px]">
                            <div className="text-[0.85rem] text-text-muted">
                                Aktualne pytanie: <strong>{currentQuestion || 'Odpowiedz na pytanie asystenta'}</strong>
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
                                    disabled={isSending}
                                />
                            </div>
                            <button
                                className="rounded border-none bg-secondary-main text-secondary-dark px-6 py-0 text-base font-bold cursor-pointer self-end h-10 mt-[5px] transition-colors duration-200 hover:bg-secondary-dark hover:text-secondary-main disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleSendMessage()}
                                disabled={isSending || !inputValue.trim()}
                            >
                                {isSending ? 'Wysyłanie...' : 'Wyślij odpowiedź'}
                            </button>
                        </div>
                    </section>

                    {/* Status Panel */}
                    <aside className="flex-[2] bg-bg-panel p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-border-light flex flex-col gap-5 max-[960px]:order-[-1]">
                        <div>
                            <div className="text-[1.1rem] font-semibold text-primary-main">Status sprawy {caseId}</div>
                            <div className="text-[0.85rem] text-text-muted">
                                Dane z Twojego opisu zostały wstępnie uporządkowane. Brakujące elementy uzupełniamy w rozmowie.
                            </div>
                            <div className="mt-2">
                                <div className="flex justify-between text-[0.8rem] text-text-main font-semibold mb-[5px]">
                                    <span>Postęp informacji</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-[10px] bg-[#e9ecef] rounded-none">
                                    <div
                                        className="h-full bg-primary-main transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-[0.95rem] font-bold mb-2 text-text-main border-b border-border-light pb-1">
                                Definicja wypadku przy pracy
                            </div>
                            <div className="grid grid-cols-2 gap-[10px]">
                                {definitions.map((def, idx) => (
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

                        {requiredInfos.length > 0 && (
                            <div className="mt-[10px]">
                                <div className="text-[0.95rem] font-bold mb-2 text-text-main border-b border-border-light pb-1">
                                    Informacje wymagane
                                </div>
                                <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                    {requiredInfos.map((info, idx) => (
                                        <li className={`text-[0.85rem] flex gap-2 items-start ${getItemClass(info.type)}`} key={idx}>
                                            <span className={`w-2 h-2 mt-1.5 shrink-0 ${getBulletClass(info.type)}`} />
                                            <span>{info.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {documentsToPrep.length > 0 && (
                            <div className="mt-[10px]">
                                <div className="text-[0.95rem] font-bold mb-2 text-text-main border-b border-border-light pb-1">
                                    Dokumenty do przygotowania
                                </div>
                                <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                    {documentsToPrep.map((doc, idx) => (
                                        <li className={`text-[0.85rem] flex gap-2 items-start ${getItemClass(doc.type)}`} key={idx}>
                                            <span className={`w-2 h-2 mt-1.5 shrink-0 ${getBulletClass(doc.type)}`} />
                                            <span>{doc.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </aside>
                </main>

                {/* Documents Section */}
                {documents.length > 0 && (
                    <section className="bg-bg-panel p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-border-light flex flex-col gap-[15px] mt-[10px]">
                        <div className="flex justify-between items-center border-b border-border-light pb-[10px]">
                            <div className="text-[1.1rem] font-semibold text-primary-main">Projekty dokumentów</div>
                        </div>
                        <div className="grid grid-cols-2 gap-5 max-[640px]:grid-cols-1">
                            {documents.map((doc) => (
                                <div className="border border-border-light p-[15px] bg-white flex flex-col gap-[10px]" key={doc.id}>
                                    <div className="font-bold text-[0.95rem] text-text-main">{doc.title}</div>
                                    <div className="text-[0.8rem] text-text-muted italic">{doc.meta}</div>
                                    <div
                                        className="text-[0.85rem] text-[#333] bg-[#f9f9f9] border border-[#eee] p-[10px] max-h-[100px] overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: doc.preview }}
                                    />
                                    <div className="mt-[5px] flex gap-[10px]">
                                        <button className="rounded border border-secondary-main bg-secondary-main text-secondary-dark py-1.5 px-3.5 text-[0.8rem] cursor-pointer font-semibold hover:bg-secondary-dark hover:text-secondary-main transition-colors duration-200">
                                            Pobierz jako PDF
                                        </button>
                                        <button className="rounded border border-border-light bg-white text-text-main py-1.5 px-3.5 text-[0.8rem] cursor-pointer font-semibold">
                                            Pobierz jako .docx
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-[0.8rem] text-text-muted italic mt-[10px]">
                            Po pobraniu dokumentów przeczytaj je uważnie, wprowadź ewentualne poprawki, podpisz i złóż w ZUS lub przez PUE. W panelu statusu widzisz listę dokumentów do załączenia.
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default CaseDetails;

