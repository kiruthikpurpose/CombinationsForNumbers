import { create } from 'zustand';
import type { ReasoningResponse, QueryHistoryItem } from '@/types';

interface ReasoningStore {
  currentQuery: string;
  isReasoning: boolean;
  currentResponse: ReasoningResponse | null;
  queryHistory: QueryHistoryItem[];
  selectedDocumentIds: string[];
  reasoningDepth: 'quick' | 'standard' | 'full';
  showReasoningTrace: boolean;
  setQuery: (q: string) => void;
  setIsReasoning: (v: boolean) => void;
  setResponse: (r: ReasoningResponse | null) => void;
  setQueryHistory: (h: QueryHistoryItem[]) => void;
  addToHistory: (item: QueryHistoryItem) => void;
  setSelectedDocuments: (ids: string[]) => void;
  setReasoningDepth: (d: 'quick' | 'standard' | 'full') => void;
  toggleReasoningTrace: () => void;
}

export const useReasoningStore = create<ReasoningStore>((set) => ({
  currentQuery: '',
  isReasoning: false,
  currentResponse: null,
  queryHistory: [],
  selectedDocumentIds: [],
  reasoningDepth: 'full',
  showReasoningTrace: false,

  setQuery: (q) => set({ currentQuery: q }),
  setIsReasoning: (v) => set({ isReasoning: v }),
  setResponse: (r) => set({ currentResponse: r }),
  setQueryHistory: (h) => set({ queryHistory: h }),
  addToHistory: (item) => set((s) => ({ queryHistory: [item, ...s.queryHistory.slice(0, 49)] })),
  setSelectedDocuments: (ids) => set({ selectedDocumentIds: ids }),
  setReasoningDepth: (d) => set({ reasoningDepth: d }),
  toggleReasoningTrace: () => set((s) => ({ showReasoningTrace: !s.showReasoningTrace })),
}));
