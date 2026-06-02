import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Brain, Search, Filter, CheckCircle, Tag, AlertTriangle, BookOpen, Zap, FileText, Shield } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { knowledgeApi } from '@/services/api';
import type { KnowledgeUnit, KnowledgeSearchResult } from '@/types';
import styles from './KnowledgePage.module.css';

const UNIT_TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  requirement: { color: '#6366f1', icon: CheckCircle, label: 'Requirement' },
  constraint: { color: '#f97316', icon: AlertTriangle, label: 'Constraint' },
  policy: { color: '#8b5cf6', icon: Shield, label: 'Policy' },
  definition: { color: '#06b6d4', icon: BookOpen, label: 'Definition' },
  risk: { color: '#ef4444', icon: AlertTriangle, label: 'Risk' },
  recommendation: { color: '#10b981', icon: Zap, label: 'Recommendation' },
  procedure: { color: '#3b82f6', icon: FileText, label: 'Procedure' },
  responsibility: { color: '#d946ef', icon: CheckCircle, label: 'Responsibility' },
  threshold: { color: '#f59e0b', icon: Tag, label: 'Threshold' },
  dependency: { color: '#64748b', icon: Brain, label: 'Dependency' },
  fact: { color: '#94a3b8', icon: FileText, label: 'Fact' },
};

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<KnowledgeUnit | null>(null);

  const { data: unitsData, isLoading } = useQuery({
    queryKey: ['knowledge-units', activeType],
    queryFn: () =>
      knowledgeApi.listUnits({
        unit_type: activeType !== 'all' ? activeType : undefined,
        page_size: 50,
      }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: () => knowledgeApi.stats().then((r) => r.data),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.validateUnit(id),
    onSuccess: () => {
      toast.success('Knowledge unit validated');
      queryClient.invalidateQueries({ queryKey: ['knowledge-units'] });
      if (selectedUnit) setSelectedUnit((prev) => prev ? { ...prev, is_validated: true } : null);
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setIsSearching(true);
    try {
      const res = await knowledgeApi.search(searchQuery, {
        unit_types: activeType !== 'all' ? [activeType] : undefined,
        top_k: 20,
      });
      setSearchResults(res.data.results);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const displayUnits: KnowledgeUnit[] = searchResults
    ? searchResults.map((r) => r.unit)
    : unitsData || [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Knowledge Base</h1>
          <p className={styles.subtitle}>
            {stats?.total_units?.toLocaleString() || 0} knowledge units across {Object.keys(stats?.by_type || {}).length} types
          </p>
        </div>
      </div>

      {stats && (
        <div className={styles.statsRow}>
          {Object.entries(stats.by_type || {}).slice(0, 6).map(([type, count]) => {
            const cfg = UNIT_TYPE_CONFIG[type] || { color: '#64748b', label: type };
            return (
              <div key={type} className={styles.statChip} onClick={() => setActiveType(type)}>
                <div className={styles.statChipDot} style={{ background: cfg.color }} />
                <span className={styles.statChipLabel}>{cfg.label || type}</span>
                <span className={styles.statChipCount}>{count as number}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Semantic search across knowledge units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={styles.searchInput}
            />
          </div>
          <button className={styles.searchBtn} onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <span className={styles.spinner} /> : <Search size={14} />}
            Search
          </button>
          {searchResults && (
            <button className={styles.clearBtn} onClick={() => { setSearchResults(null); setSearchQuery(''); }}>
              Clear
            </button>
          )}
        </div>
        <div className={styles.typeFilters}>
          <button
            className={`${styles.typeBtn} ${activeType === 'all' ? styles.typeActive : ''}`}
            onClick={() => setActiveType('all')}
          >
            All
          </button>
          {Object.entries(UNIT_TYPE_CONFIG).map(([type, cfg]) => (
            <button
              key={type}
              className={`${styles.typeBtn} ${activeType === type ? styles.typeActive : ''}`}
              onClick={() => setActiveType(type)}
              style={activeType === type ? { borderColor: cfg.color, color: cfg.color } : {}}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.unitsList}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonUnit}`} />)
          ) : displayUnits.length === 0 ? (
            <div className={styles.emptyState}>
              <Brain size={40} />
              <p>No knowledge units found. Process documents to extract knowledge.</p>
            </div>
          ) : (
            displayUnits.map((unit) => {
              const cfg = UNIT_TYPE_CONFIG[unit.unit_type] || { color: '#64748b', icon: FileText, label: unit.unit_type };
              return (
                <motion.div
                  key={unit.id}
                  className={`${styles.unitCard} ${selectedUnit?.id === unit.id ? styles.unitSelected : ''}`}
                  onClick={() => setSelectedUnit(unit)}
                  whileHover={{ x: 2 }}
                >
                  <div className={styles.unitHeader}>
                    <div className={styles.unitType} style={{ color: cfg.color, background: `${cfg.color}15` }}>
                      <cfg.icon size={11} />
                      {cfg.label}
                    </div>
                    <div className={styles.unitActions}>
                      {unit.is_validated && (
                        <span className={styles.validatedBadge}><CheckCircle size={12} /> Validated</span>
                      )}
                      <span className={styles.confScore}>{(unit.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  {unit.title && <h4 className={styles.unitTitle}>{unit.title}</h4>}
                  <p className={styles.unitContent}>{unit.content}</p>
                  {unit.tags.length > 0 && (
                    <div className={styles.unitTags}>
                      {unit.tags.slice(0, 3).map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                  )}
                  <div className={styles.unitFooter}>
                    <span className={styles.unitDate}>{format(new Date(unit.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {selectedUnit && (
          <motion.div
            className={styles.detailPanel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className={styles.detailHeader}>
              <div
                className={styles.detailType}
                style={{
                  color: UNIT_TYPE_CONFIG[selectedUnit.unit_type]?.color || '#64748b',
                  background: `${UNIT_TYPE_CONFIG[selectedUnit.unit_type]?.color || '#64748b'}15`,
                }}
              >
                {UNIT_TYPE_CONFIG[selectedUnit.unit_type]?.label || selectedUnit.unit_type}
              </div>
              <button className={styles.closeDetail} onClick={() => setSelectedUnit(null)}>✕</button>
            </div>

            {selectedUnit.title && <h3 className={styles.detailTitle}>{selectedUnit.title}</h3>}

            <div className={styles.detailContent}>
              <p>{selectedUnit.content}</p>
            </div>

            <div className={styles.detailMeta}>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Confidence</span>
                <span className={styles.metaVal}>{(selectedUnit.confidence_score * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Validated</span>
                <span className={styles.metaVal}>{selectedUnit.is_validated ? 'Yes' : 'No'}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Created</span>
                <span className={styles.metaVal}>{format(new Date(selectedUnit.created_at), 'PPpp')}</span>
              </div>
            </div>

            {selectedUnit.tags.length > 0 && (
              <div className={styles.detailTags}>
                {selectedUnit.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
              </div>
            )}

            {!selectedUnit.is_validated && (
              <button
                className={styles.validateBtn}
                onClick={() => validateMutation.mutate(selectedUnit.id)}
                disabled={validateMutation.isPending}
              >
                <CheckCircle size={14} />
                {validateMutation.isPending ? 'Validating...' : 'Validate This Unit'}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
