import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Brain, ChevronDown, ChevronRight, Clock, Zap, BookOpen,
  TrendingUp, FileText, CheckCircle, AlertCircle, ThumbsUp, ThumbsDown, Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { reasoningApi } from '@/services/api';
import { useReasoningStore } from '@/stores/reasoningStore';
import type { ReasoningResponse } from '@/types';
import styles from './ReasoningPage.module.css';

const INTENT_CONFIG = {
  informational: { icon: BookOpen, color: '#06b6d4', label: 'Informational' },
  analytical: { icon: TrendingUp, color: '#8b5cf6', label: 'Analytical' },
  advisory: { icon: Zap, color: '#10b981', label: 'Advisory' },
};

const DEPTH_OPTIONS = [
  { value: 'quick', label: 'Quick', desc: '~3 reasoning steps' },
  { value: 'standard', label: 'Standard', desc: '~5 reasoning steps' },
  { value: 'full', label: 'Full', desc: 'Maximum depth, all layers' },
] as const;

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444';
  const label = pct >= 80 ? 'High' : pct >= 60 ? 'Moderate' : pct >= 40 ? 'Low' : 'Very Low';
  return (
    <div className={styles.confidenceMeter}>
      <div className={styles.confidenceHeader}>
        <span className={styles.confidenceLabel}>Confidence: {label}</span>
        <span className={styles.confidenceValue} style={{ color }}>{pct}%</span>
      </div>
      <div className={styles.confidenceBar}>
        <motion.div
          className={styles.confidenceFill}
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function EvidencePanel({ evidence }: { evidence: ReasoningResponse['evidence'] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className={styles.evidencePanel}>
      <h4 className={styles.sectionTitle}>
        <FileText size={14} /> Evidence Sources ({evidence.length})
      </h4>
      {evidence.map((ev, i) => (
        <div key={i} className={styles.evidenceItem}>
          <button className={styles.evidenceHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
            <div className={styles.evidenceInfo}>
              <span className={styles.evidenceDoc}>{ev.document_name}</span>
              {ev.section_title && <span className={styles.evidenceSection}>{ev.section_title}</span>}
            </div>
            <div className={styles.evidenceScore} style={{ color: ev.relevance_score > 0.7 ? '#10b981' : '#f59e0b' }}>
              {(ev.relevance_score * 100).toFixed(0)}%
            </div>
            {expanded === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <AnimatePresence>
            {expanded === i && (
              <motion.div
                className={styles.evidenceContent}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <p>{ev.content}</p>
                {ev.page_number && <span className={styles.pageRef}>Page {ev.page_number}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function ReasoningTrace({ trace }: { trace: ReasoningResponse['reasoning_trace'] }) {
  const LAYER_COLORS: Record<string, string> = {
    informational: '#06b6d4', analytical: '#8b5cf6', advisory: '#10b981',
  };
  return (
    <div className={styles.tracePanel}>
      <h4 className={styles.sectionTitle}><Layers size={14} /> Reasoning Trace ({trace.length} steps)</h4>
      <div className={styles.traceList}>
        {trace.map((step, i) => (
          <div key={i} className={styles.traceStep}>
            <div className={styles.traceStepNumber} style={{ background: `${LAYER_COLORS[step.layer] || '#6366f1'}20`, color: LAYER_COLORS[step.layer] || '#6366f1' }}>
              {step.step_number}
            </div>
            <div className={styles.traceContent}>
              <div className={styles.traceHeader}>
                <span className={styles.traceLayer} style={{ color: LAYER_COLORS[step.layer] || '#6366f1' }}>{step.layer}</span>
                <span className={styles.traceAction}>{step.action}</span>
                <span className={styles.traceConf}>{(step.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className={styles.traceResult}>{step.result}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReasoningPage() {
  const {
    currentQuery, setQuery, isReasoning, setIsReasoning, currentResponse, setResponse,
    reasoningDepth, setReasoningDepth, showReasoningTrace, toggleReasoningTrace,
  } = useReasoningStore();

  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ['reasoning-history'],
    queryFn: () => reasoningApi.history({ page_size: 10 }).then((r) => r.data),
  });

  const queryMutation = useMutation({
    mutationFn: () =>
      reasoningApi.query({
        query: currentQuery,
        reasoning_depth: reasoningDepth,
        include_evidence: true,
      }).then((r) => r.data as ReasoningResponse),
    onMutate: () => { setIsReasoning(true); setResponse(null); setFeedbackGiven(null); },
    onSuccess: (data) => { setResponse(data); setIsReasoning(false); },
    onError: () => { setIsReasoning(false); toast.error('Reasoning query failed. Check your API connection.'); },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ feedback, note }: { feedback: string; note?: string }) =>
      reasoningApi.feedback(currentResponse!.query_id, feedback, note),
    onSuccess: (_, vars) => { setFeedbackGiven(vars.feedback); toast.success('Feedback recorded. Thank you!'); },
  });

  const EXAMPLE_QUERIES = [
    'What are the maintenance requirements for hydraulic systems?',
    'Identify all compliance risks in the procurement documentation',
    'What corrective actions should be taken for equipment failures above threshold?',
    'Summarize the responsibilities of the quality assurance team',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuery.trim() || isReasoning) return;
    queryMutation.mutate();
  };

  const response = currentResponse;
  const intentCfg = response ? INTENT_CONFIG[response.intent as keyof typeof INTENT_CONFIG] : null;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.mainPanel}>
          <div className={styles.pageHeader}>
            <h1 className={styles.title}>Reasoning Engine</h1>
            <p className={styles.subtitle}>Ask questions across your document knowledge base — evidence-backed, multi-stage reasoning</p>
          </div>

          <form className={styles.queryForm} onSubmit={handleSubmit}>
            <div className={styles.queryInputWrapper}>
              <textarea
                className={styles.queryTextarea}
                placeholder="Ask anything about your documents... What are the safety requirements? Identify compliance gaps. Recommend corrective actions."
                value={currentQuery}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
                }}
              />
            </div>
            <div className={styles.queryControls}>
              <div className={styles.depthSelector}>
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.depthBtn} ${reasoningDepth === opt.value ? styles.depthActive : ''}`}
                    onClick={() => setReasoningDepth(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isReasoning || !currentQuery.trim()}
              >
                {isReasoning ? (
                  <>
                    <span className={styles.spinner} />
                    Reasoning...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Run Query
                  </>
                )}
              </button>
            </div>
          </form>

          {!response && !isReasoning && (
            <div className={styles.examplesSection}>
              <p className={styles.examplesLabel}>Try an example query:</p>
              <div className={styles.examplesList}>
                {EXAMPLE_QUERIES.map((q) => (
                  <button key={q} className={styles.exampleBtn} onClick={() => setQuery(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isReasoning && (
            <motion.div className={styles.reasoningLoader} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.loaderOrb} />
              <div className={styles.loaderText}>
                <h4>Reasoning in progress...</h4>
                <p>Retrieving evidence → Analyzing relationships → Generating response</p>
              </div>
            </motion.div>
          )}

          {response && (
            <motion.div className={styles.responseSection} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className={styles.responseHeader}>
                <div className={styles.responseMetrics}>
                  {intentCfg && (
                    <div className={styles.intentBadge} style={{ color: intentCfg.color, background: `${intentCfg.color}18` }}>
                      <intentCfg.icon size={12} />
                      {intentCfg.label}
                    </div>
                  )}
                  <div className={styles.metricPill}>
                    <Clock size={12} />
                    {response.latency_ms}ms
                  </div>
                  <div className={styles.metricPill}>
                    <Zap size={12} />
                    {response.tokens_used} tokens
                  </div>
                  <div className={styles.metricPill}>
                    <Brain size={12} />
                    {response.model_used?.split('/').pop()}
                  </div>
                </div>
                <button
                  className={styles.traceToggle}
                  onClick={toggleReasoningTrace}
                >
                  <Layers size={14} />
                  {showReasoningTrace ? 'Hide' : 'Show'} Trace
                </button>
              </div>

              <ConfidenceMeter value={response.confidence.overall} />

              <div className={styles.answerCard}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className={styles.markdown}>
                  {response.answer}
                </ReactMarkdown>
              </div>

              {showReasoningTrace && response.reasoning_trace.length > 0 && (
                <ReasoningTrace trace={response.reasoning_trace} />
              )}

              {response.evidence.length > 0 && (
                <EvidencePanel evidence={response.evidence} />
              )}

              <div className={styles.confidenceDetails}>
                <h4 className={styles.sectionTitle}>Confidence Breakdown</h4>
                <div className={styles.confidenceGrid}>
                  {Object.entries(response.confidence).filter(([k]) => k !== 'overall').map(([key, val]) => (
                    <div key={key} className={styles.confSignal}>
                      <span className={styles.confSignalLabel}>{key.replace(/_/g, ' ')}</span>
                      <div className={styles.confSignalBar}>
                        <div className={styles.confSignalFill} style={{ width: `${(val as number) * 100}%` }} />
                      </div>
                      <span className={styles.confSignalValue}>{((val as number) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.feedbackRow}>
                <span className={styles.feedbackLabel}>Was this helpful?</span>
                <button
                  className={`${styles.feedbackBtn} ${feedbackGiven === 'positive' ? styles.feedbackActive : ''}`}
                  onClick={() => feedbackMutation.mutate({ feedback: 'positive' })}
                  disabled={!!feedbackGiven}
                >
                  <ThumbsUp size={14} /> Yes
                </button>
                <button
                  className={`${styles.feedbackBtn} ${feedbackGiven === 'negative' ? styles.feedbackActiveNeg : ''}`}
                  onClick={() => feedbackMutation.mutate({ feedback: 'negative' })}
                  disabled={!!feedbackGiven}
                >
                  <ThumbsDown size={14} /> No
                </button>
                {feedbackGiven && <span className={styles.feedbackThanks}><CheckCircle size={13} /> Recorded</span>}
              </div>
            </motion.div>
          )}
        </div>

        <div className={styles.historyPanel}>
          <h3 className={styles.historyTitle}>Recent Queries</h3>
          <div className={styles.historyList}>
            {(history?.items || []).map((q) => (
              <button key={q.id} className={styles.historyItem} onClick={() => setQuery(q.query)}>
                <span className={styles.historyQuery}>{q.query}</span>
                <div className={styles.historyMeta}>
                  <span className={styles.historyIntent} style={{ color: INTENT_CONFIG[q.intent as keyof typeof INTENT_CONFIG]?.color || '#64748b' }}>
                    {q.intent}
                  </span>
                  <span className={styles.historyConf}>{(q.confidence * 100).toFixed(0)}%</span>
                </div>
              </button>
            ))}
            {!history?.items?.length && (
              <p className={styles.historyEmpty}>No query history yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
