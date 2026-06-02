import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText, Brain, Zap, Bot, BarChart3, TrendingUp,
  Activity, CheckCircle, Clock, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { PlatformStats } from '@/types';
import styles from './DashboardPage.module.css';

const METRIC_CARDS = [
  { key: 'total_documents', label: 'Total Documents', icon: FileText, color: '#6366f1', suffix: '' },
  { key: 'total_knowledge_units', label: 'Knowledge Units', icon: Brain, color: '#8b5cf6', suffix: '' },
  { key: 'total_queries', label: 'Reasoning Queries', icon: Zap, color: '#06b6d4', suffix: '' },
  { key: 'total_agents', label: 'Agent Blueprints', icon: Bot, color: '#10b981', suffix: '' },
  { key: 'total_reports', label: 'Reports Generated', icon: BarChart3, color: '#f59e0b', suffix: '' },
  { key: 'avg_confidence_score', label: 'Avg. Confidence', icon: TrendingUp, color: '#ec4899', suffix: '%', multiplier: 100 },
];

const MOCK_TREND_DATA = Array.from({ length: 14 }, (_, i) => ({
  date: format(new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000), 'MMM d'),
  documents: Math.floor(Math.random() * 8 + 2),
  queries: Math.floor(Math.random() * 30 + 5),
  units: Math.floor(Math.random() * 80 + 20),
}));

const RADAR_DATA = [
  { subject: 'Retrieval', value: 87 },
  { subject: 'Metadata', value: 72 },
  { subject: 'Evidence', value: 91 },
  { subject: 'Rules', value: 78 },
  { subject: 'Context', value: 84 },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery<PlatformStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then((r) => r.data),
    refetchInterval: 30000,
  });

  const pieData = data
    ? Object.entries(data.documents_by_format).map(([name, value]) => ({ name: name.toUpperCase(), value }))
    : [{ name: 'PDF', value: 12 }, { name: 'DOCX', value: 8 }, { name: 'XLSX', value: 5 }, { name: 'TXT', value: 3 }];

  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div className={styles.page}>
      <motion.div className={styles.header} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className={styles.title}>Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className={styles.subtitle}>Platform overview — {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          All systems operational
        </div>
      </motion.div>

      <motion.div className={styles.metricsGrid} variants={containerVariants} initial="hidden" animate="show">
        {METRIC_CARDS.map((card) => {
          const raw = data?.[card.key as keyof PlatformStats] as number | undefined;
          const value = raw !== undefined
            ? card.multiplier ? (raw * card.multiplier).toFixed(1) : raw
            : '—';
          return (
            <motion.div key={card.key} className={styles.metricCard} variants={cardVariants}>
              <div className={styles.metricHeader}>
                <div className={styles.metricIcon} style={{ background: `${card.color}18`, color: card.color }}>
                  <card.icon size={18} />
                </div>
                <ArrowUpRight size={14} className={styles.metricArrow} />
              </div>
              <div className={styles.metricValue}>{value}{card.suffix}</div>
              <div className={styles.metricLabel}>{card.label}</div>
              {isLoading && <div className="skeleton" style={{ height: 8, marginTop: 8, borderRadius: 4 }} />}
            </motion.div>
          );
        })}
      </motion.div>

      <div className={styles.chartsRow}>
        <motion.div className={styles.chartCard} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Platform Activity</h3>
              <p className={styles.chartSubtitle}>Documents, queries, and knowledge units — last 14 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_TREND_DATA} margin={{ top: 5, right: 0, bottom: 0, left: -30 }}>
              <defs>
                {[['docs', '#6366f1'], ['queries', '#8b5cf6'], ['units', '#06b6d4']].map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f0f20', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="documents" stroke="#6366f1" fill="url(#grad-docs)" strokeWidth={2} name="Documents" />
              <Area type="monotone" dataKey="queries" stroke="#8b5cf6" fill="url(#grad-queries)" strokeWidth={2} name="Queries" />
              <Area type="monotone" dataKey="units" stroke="#06b6d4" fill="url(#grad-units)" strokeWidth={2} name="Units" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className={styles.chartCard} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} style={{ maxWidth: 320 }}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Document Formats</h3>
              <p className={styles.chartSubtitle}>Breakdown by type</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f0f20', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.pieLegend}>
            {pieData.map((item, i) => (
              <div key={item.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className={styles.legendLabel}>{item.name}</span>
                <span className={styles.legendValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className={styles.chartCard} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} style={{ maxWidth: 320 }}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Confidence Radar</h3>
              <p className={styles.chartSubtitle}>Signal quality breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="rgba(99,102,241,0.12)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Radar name="Confidence" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className={styles.bottomRow}>
        <motion.div className={styles.activityCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className={styles.chartTitle}>Recent Activity</h3>
          <div className={styles.activityList}>
            {(data?.recent_activity?.length
              ? data.recent_activity
              : MOCK_ACTIVITIES
            ).map((item, i) => (
              <div key={i} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  <Activity size={12} />
                </div>
                <div className={styles.activityContent}>
                  <span className={styles.activityAction}>{item.action}</span>
                  <span className={styles.activityResource}>{item.resource_type}</span>
                </div>
                <span className={styles.activityTime}>
                  {format(new Date(item.created_at), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className={styles.statusCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <h3 className={styles.chartTitle}>System Status</h3>
          <div className={styles.statusList}>
            {SYSTEM_SERVICES.map((svc) => (
              <div key={svc.name} className={styles.serviceRow}>
                <div className={styles.serviceInfo}>
                  <svc.icon size={14} style={{ color: svc.color }} />
                  <span className={styles.serviceName}>{svc.name}</span>
                </div>
                <div className={`${styles.serviceStatus} ${styles[svc.status]}`}>
                  {svc.status === 'operational' && <CheckCircle size={13} />}
                  {svc.status === 'degraded' && <AlertTriangle size={13} />}
                  {svc.status === 'pending' && <Clock size={13} />}
                  {svc.statusLabel}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const MOCK_ACTIVITIES = [
  { action: 'document.upload', resource_type: 'document', created_at: new Date(Date.now() - 120000).toISOString() },
  { action: 'reasoning.query', resource_type: 'reasoning', created_at: new Date(Date.now() - 300000).toISOString() },
  { action: 'agent.create', resource_type: 'agent', created_at: new Date(Date.now() - 600000).toISOString() },
  { action: 'report.generate', resource_type: 'report', created_at: new Date(Date.now() - 900000).toISOString() },
  { action: 'knowledge.validate', resource_type: 'knowledge', created_at: new Date(Date.now() - 1200000).toISOString() },
];

const SYSTEM_SERVICES = [
  { name: 'Ingestion Pipeline', icon: FileText, color: '#6366f1', status: 'operational', statusLabel: 'Operational' },
  { name: 'Vector Store (FAISS)', icon: Brain, color: '#8b5cf6', status: 'operational', statusLabel: 'Operational' },
  { name: 'LLM Gateway', icon: Zap, color: '#06b6d4', status: 'operational', statusLabel: 'Operational' },
  { name: 'Reasoning Engine', icon: Activity, color: '#10b981', status: 'operational', statusLabel: 'Operational' },
  { name: 'Background Workers', icon: Clock, color: '#f59e0b', status: 'pending', statusLabel: 'Initializing' },
];
