// Shared types for case data passed between routes

export interface CaseDefinitionItem {
    title: string;
    status: 'complete' | 'partial' | 'missing';
    note: string;
}

export interface CaseDocument {
    id: string;
    title: string;
    meta: string;
    preview: string;
}

export interface CaseRequiredInfo {
    text: string;
    type: 'required' | 'recommended' | 'normal';
}

export interface CaseChatMessage {
    id: string;
    type: 'assistant' | 'user' | 'system';
    content: string;
    timestamp?: string;
}

export interface EmployeeCaseData {
    caseId: string;
    createdAt?: string;
    progress: number;
    definitions: CaseDefinitionItem[];
    requiredInfos: CaseRequiredInfo[];
    documentsToPrep: CaseRequiredInfo[];
    documents: CaseDocument[];
    chatHistory: CaseChatMessage[];
    // Additional metadata
    submittedAt: string;
    submitterName?: string;
}

