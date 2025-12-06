// Mock API for testing frontend functionality
// This simulates the backend API responses according to OpenAPI specification

// ==========================================
// Types matching OpenAPI specification
// ==========================================

export interface InitialCaseRequest {
    first_name: string;
    last_name: string;
    pesel: string;
    phone_number?: string;
    description: string;
}

export interface InitialCaseResponse {
    caseId: string;
    createdAt: string;
}

export interface ElementStatus {
    status: 'EMPTY' | 'PARTIAL' | 'COMPLETE';
    explanation: string;
}

export interface DefinitionStatusSummary {
    suddenness: ElementStatus;
    externalCause: ElementStatus;
    injury: ElementStatus;
    workRelation: ElementStatus;
}

export interface MissingInfoSummary {
    requiredMissing: string[];
    recommendedMissing: string[];
    documentsNeeded: string[];
}

export interface EntitlementDecision {
    result: 'ELIGIBLE' | 'PROBABLY_ELIGIBLE' | 'UNCLEAR' | 'PROBABLY_NOT_ELIGIBLE';
    reasonCodes: string[];
    shortExplanation: string;
}

export interface CaseStatusResponse {
    caseId: string;
    progressPercent: number;
    definition: DefinitionStatusSummary;
    missingInfo: MissingInfoSummary;
    entitlementDecision: EntitlementDecision;
}

export interface DocumentsPreviewResponse {
    notificationHtml: string;
    explanationHtml: string;
    officialSummary: string;
}

export interface ChatRequest {
    message: string;
    questionId?: string | null;
}

export interface ChatResponse {
    assistantReply: string;
    nextQuestionId: string | null;
    caseStatus: CaseStatusResponse;
    missingInfo: MissingInfoSummary;
    documentsPreview: DocumentsPreviewResponse;
}

export interface ErrorResponse {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
}

// Internal types for UI
export interface ChatMessage {
    id: string;
    type: 'assistant' | 'user' | 'system';
    content: string;
    timestamp?: string;
    quickActions?: Array<{
        label: string;
        value?: string;
        isPrimary?: boolean;
    }>;
}

// ==========================================
// Mock Database
// ==========================================

interface StoredCase {
    caseId: string;
    createdAt: string;
    first_name: string;
    last_name: string;
    pesel: string;
    phone_number?: string;
    description: string;
    chatHistory: ChatMessage[];
    currentQuestionId: string;
}

const mockCases = new Map<string, StoredCase>();
let caseCounter = 123;

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// Helper Functions
// ==========================================

const generateCaseStatus = (caseData: StoredCase): CaseStatusResponse => {
    return {
        caseId: caseData.caseId,
        progressPercent: 68,
        definition: {
            suddenness: {
                status: 'COMPLETE',
                explanation: 'Z opisu wynika jedno zdarzenie w określonym dniu i godzinie.'
            },
            externalCause: {
                status: 'PARTIAL',
                explanation: 'Wskazano poślizgnięcie na mokrej podłodze. Trwa doprecyzowanie przebiegu.'
            },
            injury: {
                status: 'PARTIAL',
                explanation: 'Opisano uraz. Wymagana dokumentacja medyczna i dane placówki.'
            },
            workRelation: {
                status: 'PARTIAL',
                explanation: 'Zdarzenie miało miejsce podczas wykonywania czynności w ramach działalności.'
            }
        },
        missingInfo: {
            requiredMissing: [
                'Dane świadka zdarzenia (imię, nazwisko, adres)',
                'Nazwa i adres placówki medycznej'
            ],
            recommendedMissing: [
                'Dokładny opis czynności wykonywanej bezpośrednio przed wypadkiem'
            ],
            documentsNeeded: [
                'Dokumentacja medyczna potwierdzająca uraz',
                'Notatka policji – jeżeli wypadek był komunikacyjny'
            ]
        },
        entitlementDecision: {
            result: 'PROBABLY_ELIGIBLE',
            reasonCodes: ['ALL_FOUR_ELEMENTS_PROBABLY_MET'],
            shortExplanation: 'Opis wskazuje na nagłe zdarzenie z przyczyną zewnętrzną i urazem podczas wykonywania działalności.'
        }
    };
};

const generateDocumentsPreview = (caseData: StoredCase): DocumentsPreviewResponse => {
    return {
        notificationHtml: `<p><strong>ZAWIADOMIENIE O WYPADKU PRZY PRACY</strong></p>
<p><strong>1. Dane poszkodowanego:</strong><br>
${caseData.first_name} ${caseData.last_name}, PESEL: ${caseData.pesel}${caseData.phone_number ? `, tel: ${caseData.phone_number}` : ''}</p>
<p><strong>2. Data i miejsce wypadku:</strong><br>
Zgodnie z opisem: ${caseData.description.substring(0, 100)}...</p>
<p><strong>3. Okoliczności wypadku:</strong><br>
${caseData.description}</p>`,
        explanationHtml: `<p><strong>WYJAŚNIENIA POSZKODOWANEGO</strong></p>
<p>Ja, ${caseData.first_name} ${caseData.last_name}, oświadczam, że:</p>
<p>${caseData.description}</p>
<p>Powyższe oświadczenie składam zgodnie z prawdą.</p>`,
        officialSummary: `Poszkodowany ${caseData.first_name} ${caseData.last_name} (PESEL: ${caseData.pesel}) zgłasza wypadek przy pracy. ${caseData.description.substring(0, 150)}...`
    };
};

const generateInitialChatHistory = (caseData: StoredCase): ChatMessage[] => {
    return [
        {
            id: '1',
            type: 'system',
            content: 'Przetworzono Twój opis. Wstępnie uzupełniono dane o czasie, miejscu zdarzenia, czynnościach, przyczynie zewnętrznej oraz wstępnym urazie.'
        },
        {
            id: '2',
            type: 'assistant',
            content: `Dziękuję za przesłanie opisu, ${caseData.first_name}. Przeanalizowałem Twoje zgłoszenie i mam kilka pytań doprecyzowujących.

Na podstawie Twojego opisu:
"${caseData.description.substring(0, 200)}${caseData.description.length > 200 ? '...' : ''}"

Czy potwierdzasz, że powyższy opis jest zgodny z przebiegiem zdarzenia?`,
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            quickActions: [
                { label: 'Tak, zgadza się', value: 'confirm_description', isPrimary: true },
                { label: 'Chcę poprawić opis', value: 'edit_description' }
            ]
        }
    ];
};

// ==========================================
// Mock API Implementation
// ==========================================

export const mockApi = {
    // POST /api/cases/init
    initCase: async (request: InitialCaseRequest): Promise<InitialCaseResponse> => {
        console.log('[MockAPI] initCase called with:', request);
        await delay(800);

        if (!request.first_name || !request.last_name || !request.pesel || !request.description) {
            const error: ErrorResponse = {
                code: 'VALIDATION_ERROR',
                message: 'Wszystkie wymagane pola muszą być wypełnione',
                details: { missingFields: ['first_name', 'last_name', 'pesel', 'description'].filter(f => !request[f as keyof InitialCaseRequest]) }
            };
            console.error('[MockAPI] Validation error:', error);
            throw new Error(error.message);
        }

        const caseId = `ZANT/2025/${String(caseCounter++).padStart(6, '0')}`;
        const createdAt = new Date().toISOString();

        console.log('[MockAPI] Generated caseId:', caseId);

        const storedCase: StoredCase = {
            caseId,
            createdAt,
            first_name: request.first_name,
            last_name: request.last_name,
            pesel: request.pesel,
            phone_number: request.phone_number,
            description: request.description,
            chatHistory: [],
            currentQuestionId: 'confirm_description'
        };

        // Generate initial chat history
        storedCase.chatHistory = generateInitialChatHistory(storedCase);

        mockCases.set(caseId, storedCase);

        console.log('[MockAPI] Case stored successfully. Total cases:', mockCases.size);
        console.log('[MockAPI] All stored caseIds:', Array.from(mockCases.keys()));

        return { caseId, createdAt };
    },

    // GET /api/cases/{caseId}/status
    getCaseStatus: async (caseId: string): Promise<CaseStatusResponse> => {
        console.log('[MockAPI] getCaseStatus called with caseId:', caseId);
        console.log('[MockAPI] Available cases:', Array.from(mockCases.keys()));
        await delay(500);

        const caseData = mockCases.get(caseId);
        if (!caseData) {
            console.error('[MockAPI] Case not found:', caseId);
            const error: ErrorResponse = {
                code: 'CASE_NOT_FOUND',
                message: 'Sprawa o podanym identyfikatorze nie istnieje.'
            };
            throw new Error(error.message);
        }

        const status = generateCaseStatus(caseData);
        console.log('[MockAPI] Returning status:', status);
        return status;
    },

    // GET /api/cases/{caseId}/documents
    getDocuments: async (caseId: string): Promise<DocumentsPreviewResponse> => {
        console.log('[MockAPI] getDocuments called with caseId:', caseId);
        await delay(600);

        const caseData = mockCases.get(caseId);
        if (!caseData) {
            console.error('[MockAPI] Case not found for documents:', caseId);
            const error: ErrorResponse = {
                code: 'CASE_NOT_FOUND',
                message: 'Sprawa o podanym identyfikatorze nie istnieje.'
            };
            throw new Error(error.message);
        }

        const docs = generateDocumentsPreview(caseData);
        console.log('[MockAPI] Returning documents preview');
        return docs;
    },

    // POST /api/cases/{caseId}/chat
    sendChatMessage: async (caseId: string, request: ChatRequest): Promise<ChatResponse> => {
        console.log('[MockAPI] sendChatMessage called with caseId:', caseId, 'request:', request);
        await delay(1000);

        const caseData = mockCases.get(caseId);
        if (!caseData) {
            console.error('[MockAPI] Case not found for chat:', caseId);
            const error: ErrorResponse = {
                code: 'CASE_NOT_FOUND',
                message: 'Sprawa o podanym identyfikatorze nie istnieje.'
            };
            throw new Error(error.message);
        }

        // Add user message to history
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: request.message,
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        };
        caseData.chatHistory.push(userMessage);

        // Generate assistant reply based on current question
        let assistantReply: string;
        let nextQuestionId: string | null;
        let quickActions: ChatMessage['quickActions'];

        switch (caseData.currentQuestionId) {
            case 'confirm_description':
                assistantReply = 'Dziękuję za potwierdzenie. Czy ktoś był świadkiem tego wypadku?';
                nextQuestionId = 'witness_presence';
                quickActions = [
                    { label: 'Tak, był świadek', value: 'yes_witness', isPrimary: true },
                    { label: 'Nie było świadków', value: 'no_witness' }
                ];
                break;
            case 'witness_presence':
                if (request.message.toLowerCase().includes('tak') || request.message.toLowerCase().includes('świadek')) {
                    assistantReply = 'Proszę podać dane świadka: imię, nazwisko oraz adres zamieszkania.';
                    nextQuestionId = 'witness_data';
                    quickActions = undefined;
                } else {
                    assistantReply = 'Rozumiem, że nie było świadków. W jakiej placówce medycznej udzielono Ci pierwszej pomocy? Podaj nazwę i adres.';
                    nextQuestionId = 'medical_facility';
                    quickActions = undefined;
                }
                break;
            case 'witness_data':
                assistantReply = 'Zapisałem dane świadka. W jakiej placówce medycznej udzielono Ci pierwszej pomocy? Podaj nazwę i adres.';
                nextQuestionId = 'medical_facility';
                quickActions = undefined;
                break;
            case 'medical_facility':
                assistantReply = 'Dziękuję za informacje o placówce medycznej. Czy posiadasz dokumentację medyczną z tej wizyty (np. kartę informacyjną z SOR)?';
                nextQuestionId = 'medical_docs';
                quickActions = [
                    { label: 'Tak, mam dokumentację', value: 'has_docs', isPrimary: true },
                    { label: 'Nie mam jeszcze', value: 'no_docs' },
                    { label: 'Zamówię kopię', value: 'will_order' }
                ];
                break;
            case 'medical_docs':
                assistantReply = 'Świetnie! Zebrałem wszystkie niezbędne informacje. Możesz teraz przejrzeć wygenerowane dokumenty w panelu po prawej stronie.';
                nextQuestionId = null;
                quickActions = undefined;
                break;
            default:
                assistantReply = 'Dziękuję za informację. Czy jest coś jeszcze, co chciałbyś dodać do zgłoszenia?';
                nextQuestionId = 'additional_info';
                quickActions = [
                    { label: 'Nie, to wszystko', value: 'complete', isPrimary: true },
                    { label: 'Tak, chcę coś dodać', value: 'add_more' }
                ];
        }

        // Update current question
        caseData.currentQuestionId = nextQuestionId || 'complete';

        // Add assistant message to history
        const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: assistantReply,
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            quickActions
        };
        caseData.chatHistory.push(assistantMessage);

        // Generate updated status and documents
        const caseStatus = generateCaseStatus(caseData);
        const documentsPreview = generateDocumentsPreview(caseData);

        console.log('[MockAPI] Chat response generated');
        return {
            assistantReply,
            nextQuestionId,
            caseStatus,
            missingInfo: caseStatus.missingInfo,
            documentsPreview
        };
    },

    // Get chat history (not in OpenAPI but useful for initial load)
    getChatHistory: async (caseId: string): Promise<{ messages: ChatMessage[]; currentQuestionId: string }> => {
        console.log('[MockAPI] getChatHistory called with caseId:', caseId);
        console.log('[MockAPI] Available cases:', Array.from(mockCases.keys()));
        await delay(400);

        const caseData = mockCases.get(caseId);
        if (!caseData) {
            console.error('[MockAPI] Case not found for chat history:', caseId);
            const error: ErrorResponse = {
                code: 'CASE_NOT_FOUND',
                message: 'Sprawa o podanym identyfikatorze nie istnieje.'
            };
            throw new Error(error.message);
        }

        console.log('[MockAPI] Returning chat history with', caseData.chatHistory.length, 'messages');
        return {
            messages: caseData.chatHistory,
            currentQuestionId: caseData.currentQuestionId
        };
    }
};

// Helper to check if we're in development mode
export const isDevelopmentMode = () => {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

