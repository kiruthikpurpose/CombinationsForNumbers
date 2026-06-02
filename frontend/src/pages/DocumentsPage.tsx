import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Search, Filter, Trash2, RefreshCw,
  Eye, CheckCircle, Clock, XCircle, AlertCircle, Plus, X, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { documentsApi } from '@/services/api';
import { useDocumentStore } from '@/stores/documentStore';
import type { Document } from '@/types';
import styles from './DocumentsPage.module.css';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#f59e0b', label: 'Pending' },
  processing: { icon: RefreshCw, color: '#6366f1', label: 'Processing' },
  processed: { icon: CheckCircle, color: '#10b981', label: 'Processed' },
  failed: { icon: XCircle, color: '#ef4444', label: 'Failed' },
  archived: { icon: AlertCircle, color: '#64748b', label: 'Archived' },
};

const FORMAT_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', pptx: '📊', csv: '📈', xlsx: '📊', txt: '📃',
  png: '🖼', jpg: '🖼', jpeg: '🖼', tiff: '🖼', unknown: '📁',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { searchQuery, setSearchQuery, activeFilter, setFilter } = useDocumentStore();
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadDomain, setUploadDomain] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', activeFilter, searchQuery],
    queryFn: () =>
      documentsApi.list({
        status_filter: activeFilter !== 'all' ? activeFilter : undefined,
        search: searchQuery || undefined,
        page_size: 50,
      }).then((r) => r.data),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => documentsApi.reprocess(id),
    onSuccess: () => {
      toast.success('Reprocessing started');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const onDrop = useCallback((accepted: File[]) => {
    setUploadFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff'],
    },
    multiple: true,
  });

  const handleUpload = async () => {
    if (!uploadFiles.length) return;
    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of uploadFiles) {
      try {
        await documentsApi.upload(file, uploadDomain || undefined, uploadTags || undefined);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) toast.success(`${successCount} document(s) uploaded successfully`);
    if (errorCount > 0) toast.error(`${errorCount} upload(s) failed`);

    setUploadFiles([]);
    setIsUploading(false);
    setShowUploadPanel(false);
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const documents: Document[] = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.subtitle}>{total} document{total !== 1 ? 's' : ''} in the knowledge base</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.refreshBtn} onClick={() => refetch()}>
            <RefreshCw size={15} />
          </button>
          <button className={styles.uploadBtn} onClick={() => setShowUploadPanel(true)}>
            <Plus size={16} />
            Upload Documents
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filters}>
          {['all', 'pending', 'processing', 'processed', 'failed'].map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showUploadPanel && (
          <motion.div
            className={styles.uploadPanel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className={styles.uploadPanelHeader}>
              <h3>Upload Documents</h3>
              <button onClick={() => setShowUploadPanel(false)}><X size={18} /></button>
            </div>

            <div
              {...getRootProps()}
              className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={32} className={styles.dropzoneIcon} />
              <p className={styles.dropzoneText}>
                {isDragActive ? 'Drop files here...' : 'Drag & drop files or click to browse'}
              </p>
              <p className={styles.dropzoneHint}>PDF, DOCX, PPTX, CSV, XLSX, TXT, Images — max 100MB each</p>
            </div>

            {uploadFiles.length > 0 && (
              <div className={styles.fileList}>
                {uploadFiles.map((file, i) => (
                  <div key={i} className={styles.fileItem}>
                    <span>{FORMAT_ICONS[file.name.split('.').pop()?.toLowerCase() || ''] || '📁'}</span>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>{formatBytes(file.size)}</span>
                    <button onClick={() => setUploadFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.uploadMeta}>
              <div className={styles.metaField}>
                <label>Domain (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. manufacturing, defence, legal"
                  value={uploadDomain}
                  onChange={(e) => setUploadDomain(e.target.value)}
                />
              </div>
              <div className={styles.metaField}>
                <label><Tag size={12} /> Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. SOP, compliance, Q2-2024"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.uploadActions}>
              <button className={styles.cancelBtn} onClick={() => setShowUploadPanel(false)}>Cancel</button>
              <button
                className={styles.confirmUploadBtn}
                onClick={handleUpload}
                disabled={isUploading || !uploadFiles.length}
              >
                {isUploading ? <span className={styles.spinner} /> : <Upload size={15} />}
                {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} File${uploadFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} className={styles.emptyIcon} />
          <h3>No documents found</h3>
          <p>Upload documents to start building your knowledge base.</p>
          <button className={styles.uploadBtn} onClick={() => setShowUploadPanel(true)}>
            <Plus size={16} /> Upload First Document
          </button>
        </div>
      ) : (
        <motion.div className={styles.documentGrid} layout>
          <AnimatePresence>
            {documents.map((doc) => {
              const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
              return (
                <motion.div
                  key={doc.id}
                  className={styles.documentCard}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  whileHover={{ y: -2 }}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.formatEmoji}>{FORMAT_ICONS[doc.format] || '📁'}</span>
                    <div className={`${styles.statusPill}`} style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
                      {doc.status === 'processing' ? (
                        <statusCfg.icon size={11} className={styles.spinIcon} />
                      ) : (
                        <statusCfg.icon size={11} />
                      )}
                      {statusCfg.label}
                    </div>
                  </div>

                  <h4 className={styles.docName} title={doc.name}>{doc.name}</h4>
                  <p className={styles.docMeta}>
                    {doc.format.toUpperCase()}
                    {doc.page_count ? ` · ${doc.page_count} pages` : ''}
                    {doc.word_count ? ` · ${doc.word_count.toLocaleString()} words` : ''}
                  </p>

                  {doc.domain && (
                    <span className={styles.domainTag}>{doc.domain}</span>
                  )}

                  <div className={styles.tagRow}>
                    {doc.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.uploadDate}>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                    <div className={styles.cardActions}>
                      <Link to={`/documents/${doc.id}`} className={styles.actionBtn} title="View">
                        <Eye size={14} />
                      </Link>
                      {doc.status === 'failed' && (
                        <button
                          className={styles.actionBtn}
                          title="Reprocess"
                          onClick={() => reprocessMutation.mutate(doc.id)}
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete "${doc.name}"?`)) deleteMutation.mutate(doc.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
