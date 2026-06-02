import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bot, Workflow, Shield, Zap, FileText, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { agentsApi } from '@/services/api';
import type { AgentBlueprint } from '@/types';
import styles from './AgentDetailPage.module.css';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: blueprint, isLoading } = useQuery<AgentBlueprint>({
    queryKey: ['blueprint', id],
    queryFn: () => agentsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const copyPrompt = () => {
    if (blueprint?.system_prompt) {
      navigator.clipboard.writeText(blueprint.system_prompt);
      toast.success('System prompt copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>
        Blueprint not found.
        <Link to="/agents" style={{ color: 'var(--color-primary)', marginLeft: 8 }}>← Back to Agents</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/agents" className={styles.backLink}><ArrowLeft size={15} /> Back to Agents</Link>

      <div className={styles.header}>
        <div className={styles.headerIcon}><Bot size={24} /></div>
        <div>
          <h1 className={styles.title}>{blueprint.name}</h1>
          <p className={styles.subtitle}>{blueprint.description}</p>
          <div className={styles.meta}>
            <span>Version {blueprint.version}</span>
            <span>·</span>
            <span className={styles.status} data-status={blueprint.status}>{blueprint.status}</span>
            <span>·</span>
            <span>{format(new Date(blueprint.created_at), 'MMMM d, yyyy')}</span>
            <span>·</span>
            <span>{blueprint.source_document_ids.length} source doc(s)</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainCol}>
          {blueprint.roles.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Shield size={16} /> Roles & Responsibilities ({blueprint.roles.length})</h2>
              <div className={styles.rolesGrid}>
                {blueprint.roles.map((role, i) => (
                  <motion.div key={i} className={styles.roleCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <h4 className={styles.roleName}>{role.name}</h4>
                    <p className={styles.roleDesc}>{role.description}</p>
                    {role.responsibilities.length > 0 && (
                      <div className={styles.responsibilitiesList}>
                        {role.responsibilities.map((r, j) => <div key={j} className={styles.respItem}>• {r}</div>)}
                      </div>
                    )}
                    {role.tools.length > 0 && (
                      <div className={styles.toolsRow}>
                        {role.tools.map((t) => <span key={t} className={styles.toolTag}>{t}</span>)}
                      </div>
                    )}
                    {role.decision_authority && (
                      <div className={styles.decisionAuth}>
                        <Zap size={12} />
                        <span>{role.decision_authority}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {blueprint.workflows.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Workflow size={16} /> Workflow Steps ({blueprint.workflows.length})</h2>
              <div className={styles.workflowList}>
                {blueprint.workflows.map((step, i) => (
                  <div key={step.step_id} className={styles.workflowStep}>
                    <div className={styles.stepNumber}>{i + 1}</div>
                    <div className={styles.stepContent}>
                      <div className={styles.stepHeader}>
                        <h4 className={styles.stepName}>{step.name}</h4>
                        <span className={styles.stepRole}>{step.agent_role}</span>
                      </div>
                      <p className={styles.stepDesc}>{step.description}</p>
                      {step.inputs.length > 0 && (
                        <div className={styles.ioRow}>
                          <span className={styles.ioLabel}>Inputs:</span>
                          {step.inputs.map((inp) => <span key={inp} className={styles.ioTag}>{inp}</span>)}
                        </div>
                      )}
                      {step.outputs.length > 0 && (
                        <div className={styles.ioRow}>
                          <span className={styles.ioLabel}>Outputs:</span>
                          {step.outputs.map((out) => <span key={out} className={styles.ioTagOut}>{out}</span>)}
                        </div>
                      )}
                      {step.escalation_triggers.length > 0 && (
                        <div className={styles.escRow}>
                          {step.escalation_triggers.map((t) => (
                            <span key={t} className={styles.escTag}>⚠ {t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {blueprint.decision_rules.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Zap size={16} /> Decision Rules</h2>
              <div className={styles.rulesList}>
                {blueprint.decision_rules.map((rule, i) => (
                  <div key={rule.rule_id || i} className={styles.ruleItem}>
                    <div className={styles.rulePriority} data-priority={rule.priority}>{rule.priority}</div>
                    <div className={styles.ruleContent}>
                      <span className={styles.ruleCondition}>{rule.condition}</span>
                      <span className={styles.ruleArrow}>→</span>
                      <span className={styles.ruleAction}>{rule.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className={styles.sidebar}>
          {blueprint.required_knowledge_sources.length > 0 && (
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}><FileText size={14} /> Required Knowledge</h3>
              {blueprint.required_knowledge_sources.map((src, i) => (
                <div key={i} className={styles.knowledgeSrc}>• {src}</div>
              ))}
            </div>
          )}

          {blueprint.escalation_paths.length > 0 && (
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Escalation Paths</h3>
              {blueprint.escalation_paths.map((path, i) => (
                <div key={i} className={styles.escalationPath}>
                  <span className={styles.escalationTrigger}>{path.trigger}</span>
                  <span className={styles.escalationTo}>→ {path.escalate_to}</span>
                </div>
              ))}
            </div>
          )}

          {blueprint.system_prompt && (
            <div className={styles.sideCard}>
              <div className={styles.promptHeader}>
                <h3 className={styles.sideCardTitle}>System Prompt</h3>
                <button className={styles.copyBtn} onClick={copyPrompt}><Copy size={13} /> Copy</button>
              </div>
              <pre className={styles.promptPreview}>{blueprint.system_prompt.slice(0, 400)}...</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
