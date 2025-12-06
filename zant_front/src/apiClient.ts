// API Client for ZANT Accident Assistant
// This module provides functions to communicate with the backend API

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
// Configuration
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

console.log('[API Client] Using API base URL:', API_BASE_URL);

// ==========================================
// API Client Functions
// ==========================================

class ApiError extends Error {
    code: string;
    details?: Record<string, unknown> | null;

    constructor(code: string, message: string, details?: Record<string, unknown> | null) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.details = details;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorData: ErrorResponse;
        try {
            errorData = await response.json();
        } catch {
            throw new ApiError('UNKNOWN_ERROR', `HTTP ${response.status}: ${response.statusText}`);
        }
        throw new ApiError(errorData.code, errorData.message, errorData.details);
    }
    return response.json();
}

export const api = {
    // POST /api/cases/init
    initCase: async (request: InitialCaseRequest): Promise<InitialCaseResponse> => {
        console.log('[API Client] POST /api/cases/init', request);

        const response = await fetch(`${API_BASE_URL}/cases/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        const data = await handleResponse<InitialCaseResponse>(response);
        console.log('[API Client] Response:', data);
        return data;
    },

    // GET /api/cases/{caseId}/status
    getCaseStatus: async (caseId: string): Promise<CaseStatusResponse> => {
        console.log('[API Client] GET /api/cases/:caseId/status', caseId);

        const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await handleResponse<CaseStatusResponse>(response);
        console.log('[API Client] Response:', data);
        return data;
    },

    // GET /api/cases/{caseId}/documents
    getDocuments: async (caseId: string): Promise<DocumentsPreviewResponse> => {
        console.log('[API Client] GET /api/cases/:caseId/documents', caseId);

        const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/documents`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await handleResponse<DocumentsPreviewResponse>(response);
        console.log('[API Client] Response:', data);
        return data;
    },

    // POST /api/cases/{caseId}/chat
    sendChatMessage: async (caseId: string, request: ChatRequest): Promise<ChatResponse> => {
        console.log('[API Client] POST /api/cases/:caseId/chat', caseId, request);

        const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        const data = await handleResponse<ChatResponse>(response);
        console.log('[API Client] Response:', data);
        return data;
    },

    // GET /api/cases/{caseId}/chat (helper endpoint for chat history)
    getChatHistory: async (caseId: string): Promise<{ messages: ChatMessage[]; currentQuestionId: string }> => {
        console.log('[API Client] GET /api/cases/:caseId/chat', caseId);

        const response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/chat`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await handleResponse<{ messages: ChatMessage[]; currentQuestionId: string }>(response);
        console.log('[API Client] Response:', data);
        return data;
    }
};

export { ApiError };

