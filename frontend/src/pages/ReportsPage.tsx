import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, Plus, FileText, Eye, Trash2, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { reportsApi, documentsApi } from '@/services/api';
import type { Report } from '@/types';
import styles from './ReportsPage.module.css';

const REPORT_TYPES = [
  { value: 'assessment', label: 'Assessment Report', desc: 'Comprehensive document analysis' },
  { value: 'compliance', label: 'Compliance Report', desc: 'Gap analysis and risk identification' },
  { value: 'knowledge_summary', label: 'Knowledge Summary', desc: 'Condensed knowledge extraction' },
  { value: 'risk_assessment', label: 'Risk Assessment', desc: 'Identified risks and severity' },
];

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('assessment');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list({ page_size: 50 }).then((r) => r.data.items || r.data),
  });

  const { data: documents } = useQuery({
    queryKey: ['documents-for-reports'],
    queryFn: () => documentsApi.list({ status_filter: 'processed', page_size: 50 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => reportsApi.create({ title, report_type: reportType, document_ids: selectedDocs }),
    onSuccess: (res) => {
      toast.success('Report generated successfully');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(res.data);
      setShowCreate(false);
      setTitle('');
      setSelectedDocs([]);
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      toast.success('Report deleted');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (selectedReport) setSelectedReport(null);
    },
  });

  const toggleDoc = (id: string) =>
    setSelectedDocs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const reportList: Report[] = reports || [];
  const availableDocs = documents?.items || [];

  const REPORT_TYPE_COLORS: Record<string, string> = {
    assessment: '#6366f1', compliance: '#8b5cf6', knowledge_summary: '#06b6d4',
    risk_assessment: '#ef4444', custom: '#64748b',
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Generate structured intelligence reports from your document knowledge base</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Report
        </button>
      </div>

      {showCreate && (
        <motion.div className={styles.createPanel} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.panelHeader}>
            <h3>Generate Report</h3>
            <button onClick={() => setShowCreate(false)}><X size={18} /></button>
          </div>
          <div className={styles.createForm}>
            <div className={styles.formField}>
              <label>Report Title *</label>
              <input type="text" placeholder="e.g. Q2 Compliance Assessment" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={styles.formField}>
              <label>Report Type *</label>
              <div className={styles.typeGrid}>
                {REPORT_TYPES.map((rt) => (
                  <div
                    key={rt.value}
                    className={`${styles.typeOption} ${reportType === rt.value ? styles.typeSelected : ''}`}
                    onClick={() => setReportType(rt.value)}
                  >
                    <span className={styles.typeOptionLabel}>{rt.label}</span>
                    <span className={styles.typeOptionDesc}>{rt.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.formField}>
              <label>Source Documents (select processed documents)</label>
              <div className={styles.docSelector}>
                {availableDocs.length === 0 ? (
                  <p className={styles.noDocsMsg}>No processed documents available.</p>
                ) : availableDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`${styles.docOption} ${selectedDocs.includes(doc.id) ? styles.docSelected : ''}`}
                    onClick={() => toggleDoc(doc.id)}
                  >
                    <FileText size={13} />
                    <span>{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.panelActions}>
              <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !title || !selectedDocs.length}
              >
                {createMutation.isPending ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className={styles.layout}>
        <div className={styles.reportsList}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonRow}`} />)
          ) : reportList.length === 0 ? (
            <div className={styles.emptyState}>
              <BarChart3 size={40} />
              <p>No reports yet. Generate your first report above.</p>
            </div>
          ) : reportList.map((report) => {
            const color = REPORT_TYPE_COLORS[report.report_type] || '#64748b';
            return (
              <div
                key={report.id}
                className={`${styles.reportRow} ${selectedReport?.id === report.id ? styles.reportSelected : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <div className={styles.reportTypeIndicator} style={{ background: color }} />
                <div className={styles.reportInfo}>
                  <h4 className={styles.reportTitle}>{report.title}</h4>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportType} style={{ color }}>{report.report_type.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>{report.document_ids.length} document(s)</span>
                    <span>·</span>
                    <span>{format(new Date(report.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className={styles.reportActions}>
                  <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}>
                    <Eye size={14} />
                  </button>
                  <button className={styles.actionBtnDanger} onClick={(e) => {
                    e.stopPropagation();
                    confirm('Delete report?') && deleteMutation.mutate(report.id);
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedReport && (
          <motion.div className={styles.reportDetail} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>{selectedReport.title}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedReport(null)}><X size={16} /></button>
            </div>
            {selectedReport.summary && (
              <p className={styles.detailSummary}>{selectedReport.summary}</p>
            )}
            <div className={styles.detailContent}>
              <pre className={styles.jsonView}>{JSON.stringify(selectedReport.content, null, 2)}</pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
