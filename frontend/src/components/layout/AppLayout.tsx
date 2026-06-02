import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Brain, Zap, Bot, BarChart3, Settings, Shield,
  LogOut, ChevronRight, Bell, Search, User
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/knowledge', icon: Brain, label: 'Knowledge' },
  { path: '/reasoning', icon: Zap, label: 'Reasoning' },
  { path: '/agents', icon: Bot, label: 'Agents' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
];

const BOTTOM_ITEMS = [
  { path: '/admin', icon: Shield, label: 'Admin' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <motion.nav
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
        animate={{ width: collapsed ? 70 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Zap size={18} />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  className={styles.logoText}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  ReasonedAI
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
            <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
              <ChevronRight size={16} />
            </motion.div>
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              {({ isActive }) => (
                <>
                  <div className={styles.navIcon}>
                    <item.icon size={18} />
                    {isActive && <motion.div className={styles.activeIndicator} layoutId="activeNav" />}
                  </div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        className={styles.navLabel}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          {BOTTOM_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <div className={styles.navIcon}><item.icon size={18} /></div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span className={styles.navLabel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}

          <div className={styles.userSection}>
            <div className={styles.userAvatar}>
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div className={styles.userInfo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className={styles.userName}>{user?.full_name}</span>
                  <span className={styles.userRole}>{user?.role}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.nav>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.searchBar}>
            <Search size={16} className={styles.searchIcon} />
            <input type="text" placeholder="Search documents, queries..." className={styles.searchInput} />
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn}>
              <Bell size={18} />
              <span className={styles.notificationBadge} />
            </button>
            <button className={styles.iconBtn}>
              <User size={18} />
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
