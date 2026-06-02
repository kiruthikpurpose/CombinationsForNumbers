import { useQuery } from '@tanstack/react-query';
import { Shield, Users, Activity, Database, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { adminApi } from '@/services/api';
import type { PlatformStats } from '@/types';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users({ page_size: 20 }).then((r) => r.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => adminApi.auditLogs({ page_size: 30 }).then((r) => r.data),
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}><Shield size={20} /> Administration</h1>
        <p className={styles.subtitle}>Platform management and monitoring</p>
      </div>

      <div className={styles.statsRow}>
        {[
          { label: 'Total Documents', value: stats?.total_documents ?? '—', icon: Database, color: '#6366f1' },
          { label: 'Knowledge Units', value: stats?.total_knowledge_units ?? '—', icon: BarChart3, color: '#8b5cf6' },
          { label: 'Total Queries', value: stats?.total_queries ?? '—', icon: Activity, color: '#06b6d4' },
          { label: 'Avg Confidence', value: stats ? `${(stats.avg_confidence_score * 100).toFixed(1)}%` : '—', icon: Shield, color: '#10b981' },
        ].map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${stat.color}18`, color: stat.color }}>
              <stat.icon size={18} />
            </div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}><Users size={14} /> Users ({usersData?.total || 0})</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(usersData?.items || []).map((user: any) => (
                <tr key={user.id}>
                  <td className={styles.tdName}>{user.full_name}</td>
                  <td className={styles.tdEmail}>{user.email}</td>
                  <td><span className={styles.roleBadge}>{user.role}</span></td>
                  <td>
                    <span className={`${styles.statusDot} ${user.is_active ? styles.active : styles.inactive}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={styles.tdDate}>{format(new Date(user.created_at), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}><Activity size={14} /> Audit Log (Recent)</h3>
          <div className={styles.auditList}>
            {(auditData?.items || []).map((log: any) => (
              <div key={log.id} className={styles.auditItem}>
                <div className={styles.auditAction}>{log.action}</div>
                <div className={styles.auditMeta}>
                  <span className={styles.auditResource}>{log.resource_type}</span>
                  <span className={styles.auditTime}>{format(new Date(log.created_at), 'HH:mm:ss MMM d')}</span>
                </div>
              </div>
            ))}
            {!auditData?.items?.length && <p className={styles.emptyMsg}>No audit logs yet.</p>}
          </div>
        </div>
      </div>

      {stats && (
        <div className={styles.breakdownPanel}>
          <h3 className={styles.panelTitle}>Documents by Format</h3>
          <div className={styles.breakdown}>
            {Object.entries(stats.documents_by_format).map(([format, count]) => (
              <div key={format} className={styles.breakdownItem}>
                <span className={styles.breakdownFormat}>{format.toUpperCase()}</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${Math.min((count / Math.max(...Object.values(stats.documents_by_format))) * 100, 100)}%` }}
                  />
                </div>
                <span className={styles.breakdownCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
