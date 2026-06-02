import { useState } from 'react';
import { Settings, Key, Bell, Palette, Database, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import styles from './SettingsPage.module.css';

const TABS = ['Profile', 'API Keys', 'Notifications', 'Appearance', 'Storage', 'Security'];
const TAB_ICONS = [Settings, Key, Bell, Palette, Database, Shield];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [apiKey, setApiKey] = useState('sk-or-v1-••••••••••••••••••••••••••••••••••••••••••••••••••••••');
  const [model, setModel] = useState('anthropic/claude-3.5-sonnet');

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Configure your ReasonedAI platform preferences</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.tabList}>
          {TABS.map((tab, i) => {
            const Icon = TAB_ICONS[i];
            return (
              <button
                key={tab}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <Icon size={15} />
                {tab}
              </button>
            );
          })}
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'Profile' && (
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>Profile Settings</h3>
              <div className={styles.avatarSection}>
                <div className={styles.avatarLarge}>{user?.full_name?.charAt(0) || 'U'}</div>
                <div>
                  <p className={styles.avatarName}>{user?.full_name}</p>
                  <p className={styles.avatarEmail}>{user?.email}</p>
                  <span className={styles.roleBadge}>{user?.role}</span>
                </div>
              </div>
              <div className={styles.form}>
                <div className={styles.formField}>
                  <label>Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className={styles.formField}>
                  <label>Email Address</label>
                  <input type="email" value={user?.email || ''} readOnly className={styles.readOnly} />
                </div>
                <div className={styles.formField}>
                  <label>Role</label>
                  <input type="text" value={user?.role || ''} readOnly className={styles.readOnly} />
                </div>
                <button className={styles.saveBtn}>Save Changes</button>
              </div>
            </div>
          )}

          {activeTab === 'API Keys' && (
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>API Configuration</h3>
              <div className={styles.form}>
                <div className={styles.formField}>
                  <label>OpenRouter API Key</label>
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                  <p className={styles.fieldHint}>Used for all LLM calls. Get your key at openrouter.ai</p>
                </div>
                <div className={styles.formField}>
                  <label>Default Model</label>
                  <select value={model} onChange={(e) => setModel(e.target.value)} className={styles.select}>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="openai/gpt-4o">GPT-4o</option>
                    <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="google/gemini-pro">Gemini Pro</option>
                    <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Mock LLM Mode</label>
                  <div className={styles.toggleRow}>
                    <input type="checkbox" id="mock-mode" />
                    <label htmlFor="mock-mode">Enable mock responses (no API calls)</label>
                  </div>
                  <p className={styles.fieldHint}>Useful for development and testing without consuming API credits.</p>
                </div>
                <button className={styles.saveBtn}>Save API Settings</button>
              </div>
            </div>
          )}

          {activeTab === 'Appearance' && (
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>Appearance</h3>
              <div className={styles.themeOptions}>
                <div className={`${styles.themeOption} ${styles.themeSelected}`}>
                  <div className={styles.themePreview} style={{ background: 'linear-gradient(135deg, #080810, #0d0d1a)' }}>
                    <div style={{ width: '60%', height: 8, background: '#6366f1', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ width: '80%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
                  </div>
                  <span>Dark (Default)</span>
                </div>
                <div className={styles.themeOption}>
                  <div className={styles.themePreview} style={{ background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' }}>
                    <div style={{ width: '60%', height: 8, background: '#6366f1', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ width: '80%', height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 4 }} />
                  </div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Light (Coming soon)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Storage' && (
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>Storage Configuration</h3>
              <div className={styles.storageInfo}>
                <div className={styles.storageItem}>
                  <span className={styles.storageLabel}>Storage Path</span>
                  <code className={styles.storageCode}>./storage</code>
                </div>
                <div className={styles.storageItem}>
                  <span className={styles.storageLabel}>Max Upload Size</span>
                  <code className={styles.storageCode}>100 MB</code>
                </div>
                <div className={styles.storageItem}>
                  <span className={styles.storageLabel}>OCR Enabled</span>
                  <code className={styles.storageCode}>Yes</code>
                </div>
                <div className={styles.storageItem}>
                  <span className={styles.storageLabel}>Vector Store</span>
                  <code className={styles.storageCode}>FAISS (local)</code>
                </div>
                <div className={styles.storageItem}>
                  <span className={styles.storageLabel}>Embedding Model</span>
                  <code className={styles.storageCode}>all-MiniLM-L6-v2</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>Security Settings</h3>
              <div className={styles.form}>
                <div className={styles.formField}>
                  <label>Current Password</label>
                  <input type="password" placeholder="Enter current password" />
                </div>
                <div className={styles.formField}>
                  <label>New Password</label>
                  <input type="password" placeholder="Enter new password" />
                </div>
                <div className={styles.formField}>
                  <label>Confirm New Password</label>
                  <input type="password" placeholder="Confirm new password" />
                </div>
                <button className={styles.saveBtn}>Update Password</button>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>Notification Preferences</h3>
              <div className={styles.notifList}>
                {[
                  { label: 'Document processing complete', desc: 'Notify when a document finishes processing' },
                  { label: 'Agent blueprint ready', desc: 'Notify when agent extraction completes' },
                  { label: 'Report generated', desc: 'Notify when a report is ready to download' },
                  { label: 'Low confidence warnings', desc: 'Warn when reasoning confidence is below 50%' },
                  { label: 'System alerts', desc: 'Critical platform notifications' },
                ].map((notif) => (
                  <div key={notif.label} className={styles.notifItem}>
                    <div>
                      <div className={styles.notifLabel}>{notif.label}</div>
                      <div className={styles.notifDesc}>{notif.desc}</div>
                    </div>
                    <input type="checkbox" defaultChecked className={styles.notifToggle} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
