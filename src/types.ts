/**
 * Core Types for Magic Scribe AI Writer
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  lastSaved: string;
  createdAt: string;
  wordCount: number;
  charCount: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  textContent?: string;
  loading?: boolean;
}

export interface CopilotSuggestion {
  id: string;
  type: 'improvement' | 'structural' | 'style' | 'grammar';
  title: string;
  description: string;
  targetQuote: string; // The text to replace in the content
  suggestedText: string; // The replacement suggestion
  applied?: boolean;
  dismissed?: boolean;
}

export interface WritingProjectState {
  documents: Document[];
  currentDocId: string | null;
  suggestions: CopilotSuggestion[];
  isGeneratingCopilot: boolean;
  lastCopilotRun: string | null;
}
