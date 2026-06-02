import { create } from 'zustand';
import type { Document, UploadProgress } from '@/types';

interface DocumentStore {
  documents: Document[];
  selectedDocumentIds: Set<string>;
  uploadQueue: UploadProgress[];
  activeFilter: string;
  searchQuery: string;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  addToUploadQueue: (progress: UploadProgress) => void;
  updateUploadProgress: (filename: string, updates: Partial<UploadProgress>) => void;
  clearUploadQueue: () => void;
  setFilter: (filter: string) => void;
  setSearchQuery: (q: string) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  selectedDocumentIds: new Set(),
  uploadQueue: [],
  activeFilter: 'all',
  searchQuery: '',

  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
  updateDocument: (id, updates) =>
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
  removeDocument: (id) =>
    set((s) => ({
      documents: s.documents.filter((d) => d.id !== id),
      selectedDocumentIds: new Set([...s.selectedDocumentIds].filter((sid) => sid !== id)),
    })),

  toggleSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedDocumentIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedDocumentIds: next };
    }),
  clearSelection: () => set({ selectedDocumentIds: new Set() }),
  selectAll: () => set((s) => ({ selectedDocumentIds: new Set(s.documents.map((d) => d.id)) })),

  addToUploadQueue: (p) => set((s) => ({ uploadQueue: [...s.uploadQueue, p] })),
  updateUploadProgress: (filename, updates) =>
    set((s) => ({
      uploadQueue: s.uploadQueue.map((p) => (p.file.name === filename ? { ...p, ...updates } : p)),
    })),
  clearUploadQueue: () => set({ uploadQueue: [] }),

  setFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
