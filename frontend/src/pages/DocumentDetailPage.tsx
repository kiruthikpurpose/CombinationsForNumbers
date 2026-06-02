import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, CheckCircle, Clock, RefreshCw, XCircle, Brain, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { documentsApi } from '@/services/api';
import type { Document, DocumentSection } from '@/types';
import styles from './DocumentDetailPage.module.css';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: doc, isLoading } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: () => documentsApi.get(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: (q) => q.state.data?.status === 'processing' ? 3000 : false,
  });

  const { data: sections } = useQuery<DocumentSection[]>({
    queryKey: ['document-sections', id],
    queryFn: () => documentsApi.sections(id!).then((r) => r.data),
    enabled: !!id && doc?.status === 'processed',
  });

  const { data: entities } = useQuery({
    queryKey: ['document-entities', id],
    queryFn: () => documentsApi.entities(id!).then((r) => r.data),
    enabled: !!id && doc?.status === 'processed',
  });

  const STATUS_ICONS: Record<string, React.ElementType> = {
    pending: Clock, processing: RefreshCw, processed: CheckCircle, failed: XCircle, archived: Clock,
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', processing: '#6366f1', processed: '#10b981', failed: '#ef4444', archived: '#64748b',
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  if (!doc) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Document not found. <Link to="/documents">← Back</Link></div>;
  }

  const StatusIcon = STATUS_ICONS[doc.status] || Clock;
  const statusColor = STATUS_COLORS[doc.status] || '#64748b';

  return (
    <div className={styles.page}>
      <Link to="/documents" className={styles.backLink}><ArrowLeft size={15} /> Back to Documents</Link>

      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.formatBadge}>{doc.format.toUpperCase()}</div>
          <div>
            <h1 className={styles.docTitle}>{doc.name}</h1>
            <p className={styles.docFilename}>{doc.original_filename}</p>
          </div>
        </div>
        <div className={styles.statusBadge} style={{ color: statusColor, background: `${statusColor}15` }}>
          <StatusIcon size={13} className={doc.status === 'processing' ? styles.spinIcon : ''} />
          {doc.status}
        </div>
      </div>

      <div className={styles.metaGrid}>
        {[
          { label: 'File Size', value: formatBytes(doc.file_size) },
          { label: 'Pages', value: doc.page_count ?? '—' },
          { label: 'Words', value: doc.word_count?.toLocaleString() ?? '—' },
          { label: 'Language', value: doc.language?.toUpperCase() ?? '—' },
          { label: 'OCR Applied', value: doc.ocr_applied ? 'Yes' : 'No' },
          { label: 'Domain', value: doc.domain ?? '—' },
          { label: 'Uploaded', value: format(new Date(doc.created_at), 'MMM d, yyyy') },
          { label: 'Processed', value: doc.processing_completed_at ? format(new Date(doc.processing_completed_at), 'HH:mm MMM d') : '—' },
        ].map(({ label, value }) => (
          <div key={label} className={styles.metaItem}>
            <span className={styles.metaLabel}>{label}</span>
            <span className={styles.metaValue}>{value}</span>
          </div>
        ))}
      </div>

      {doc.tags.length > 0 && (
        <div className={styles.tagsRow}>
          <Tag size={13} style={{ color: 'var(--color-text-muted)' }} />
          {doc.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
        </div>
      )}

      {doc.processing_error && (
        <div className={styles.errorBanner}>
          <XCircle size={14} />
          <span><strong>Processing Error:</strong> {doc.processing_error}</span>
        </div>
      )}

      {doc.status === 'processed' && (
        <div className={styles.contentArea}>
          <div className={styles.sectionsPanel}>
            <h3 className={styles.panelTitle}><FileText size={14} /> Document Sections ({sections?.length || 0})</h3>
            <div className={styles.sectionsList}>
              {sections?.map((section) => (
                <div key={section.id} className={styles.sectionItem}>
                  <div className={styles.sectionHeader}>
                    {section.title && <h4 className={styles.sectionTitle}>{section.title}</h4>}
                    <div className={styles.sectionMeta}>
                      <span className={styles.sectionType}>{section.section_type}</span>
                      {section.page_number && <span>p. {section.page_number}</span>}
                      <span>{section.word_count} words</span>
                    </div>
                  </div>
                  <p className={styles.sectionContent}>{section.content}</p>
                </div>
              ))}
              {!sections?.length && <p className={styles.emptyMsg}>No sections extracted yet.</p>}
            </div>
          </div>

          <div className={styles.entitiesPanel}>
            <h3 className={styles.panelTitle}><Brain size={14} /> Extracted Entities ({entities?.length || 0})</h3>
            <div className={styles.entityList}>
              {entities?.slice(0, 50).map((ent: any) => (
                <div key={ent.id} className={styles.entityItem}>
                  <span className={styles.entityType}>{ent.entity_type}</span>
                  <span className={styles.entityValue}>{ent.value}</span>
                  <span className={styles.entityConf}>{(ent.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
              {!entities?.length && <p className={styles.emptyMsg}>No entities extracted.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
