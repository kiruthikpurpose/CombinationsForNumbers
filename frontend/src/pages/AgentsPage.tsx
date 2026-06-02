import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bot, Plus, Rocket, FileText, CheckCircle, Clock, X, ChevronRight, Workflow, Shield } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { agentsApi, documentsApi } from '@/services/api';
import type { AgentBlueprint } from '@/types';
import styles from './AgentsPage.module.css';

const STATUS_CONFIG = {
  draft: { color: '#f59e0b', label: 'Draft', icon: Clock },
  validated: { color: '#10b981', label: 'Validated', icon: CheckCircle },
  deployed: { color: '#6366f1', label: 'Deployed', icon: Rocket },
  deprecated: { color: '#64748b', label: 'Deprecated', icon: X },
};

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [autoExtract, setAutoExtract] = useState(true);

  const { data: blueprints, isLoading } = useQuery<AgentBlueprint[]>({
    queryKey: ['blueprints'],
    queryFn: () => agentsApi.list({ page_size: 50 }).then((r) => r.data.items || r.data),
    refetchInterval: 5000,
  });

  const { data: documents } = useQuery({
    queryKey: ['documents-for-agents'],
    queryFn: () => documentsApi.list({ status_filter: 'processed', page_size: 50 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => agentsApi.create({ name, description, source_document_ids: selectedDocIds, auto_extract: autoExtract }),
    onSuccess: () => {
      toast.success('Agent blueprint created. Extraction started in background.');
      queryClient.invalidateQueries({ queryKey: ['blueprints'] });
      setShowCreate(false);
      setName('');
      setDescription('');
      setSelectedDocIds([]);
    },
    onError: () => toast.error('Failed to create agent blueprint'),
  });

  const deployMutation = useMutation({
    mutationFn: (id: string) => agentsApi.deploy(id),
    onSuccess: () => {
      toast.success('Agent deployed successfully');
      queryClient.invalidateQueries({ queryKey: ['blueprints'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => {
      toast.success('Blueprint deleted');
      queryClient.invalidateQueries({ queryKey: ['blueprints'] });
    },
  });

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const availableDocs = documents?.items || [];
  const agentList: AgentBlueprint[] = blueprints || [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Agent Studio</h1>
          <p className={styles.subtitle}>Generate AI agent blueprints from your documentation</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Blueprint
        </button>
      </div>

      {showCreate && (
        <motion.div
          className={styles.createPanel}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.panelHeader}>
            <h3>New Agent Blueprint</h3>
            <button onClick={() => setShowCreate(false)}><X size={18} /></button>
          </div>

          <div className={styles.createForm}>
            <div className={styles.formField}>
              <label>Blueprint Name *</label>
              <input
                type="text"
                placeholder="e.g. Maintenance Coordinator Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={styles.formField}>
              <label>Description *</label>
              <textarea
                placeholder="What will this agent do? What processes will it handle?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.formField}>
              <label>Source Documents (select processed documents)</label>
              <div className={styles.docSelector}>
                {availableDocs.length === 0 ? (
                  <p className={styles.noDocsMsg}>No processed documents available. Upload and process documents first.</p>
                ) : (
                  availableDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`${styles.docOption} ${selectedDocIds.includes(doc.id) ? styles.docSelected : ''}`}
                      onClick={() => toggleDoc(doc.id)}
                    >
                      <FileText size={13} />
                      <span>{doc.name}</span>
                      {selectedDocIds.includes(doc.id) && <CheckCircle size={13} style={{ marginLeft: 'auto', color: '#10b981' }} />}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className={styles.autoExtractToggle}>
              <input
                type="checkbox"
                id="auto-extract"
                checked={autoExtract}
                onChange={(e) => setAutoExtract(e.target.checked)}
              />
              <label htmlFor="auto-extract">Auto-extract agent structure using AI (recommended)</label>
            </div>

            <div className={styles.panelActions}>
              <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !name || !description || !selectedDocIds.length}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Blueprint'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonCard}`} />)}
        </div>
      ) : agentList.length === 0 ? (
        <div className={styles.emptyState}>
          <Bot size={48} className={styles.emptyIcon} />
          <h3>No agent blueprints yet</h3>
          <p>Upload SOPs, process documents, then generate AI agent blueprints from them.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {agentList.map((bp) => {
            const statusCfg = STATUS_CONFIG[bp.status as keyof typeof STATUS_CONFIG];
            return (
              <motion.div key={bp.id} className={styles.blueprintCard} whileHover={{ y: -2 }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}>
                    <Bot size={18} />
                  </div>
                  <div className={styles.statusBadge} style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
                    <statusCfg.icon size={11} />
                    {statusCfg.label}
                  </div>
                </div>

                <h4 className={styles.cardName}>{bp.name}</h4>
                <p className={styles.cardDesc}>{bp.description}</p>

                <div className={styles.cardStats}>
                  <div className={styles.statItem}>
                    <Shield size={12} />
                    {bp.roles.length} roles
                  </div>
                  <div className={styles.statItem}>
                    <Workflow size={12} />
                    {bp.workflows.length} workflows
                  </div>
                  <div className={styles.statItem}>
                    <FileText size={12} />
                    {bp.source_document_ids.length} sources
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.cardDate}>{format(new Date(bp.created_at), 'MMM d, yyyy')}</span>
                  <div className={styles.cardActions}>
                    <Link to={`/agents/${bp.id}`} className={styles.viewBtn}>
                      <ChevronRight size={14} /> View
                    </Link>
                    {bp.status === 'validated' && (
                      <button
                        className={styles.deployBtn}
                        onClick={() => deployMutation.mutate(bp.id)}
                        disabled={deployMutation.isPending}
                      >
                        <Rocket size={13} /> Deploy
                      </button>
                    )}
                    <button
                      className={styles.deleteBtn}
                      onClick={() => confirm('Delete this blueprint?') && deleteMutation.mutate(bp.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
