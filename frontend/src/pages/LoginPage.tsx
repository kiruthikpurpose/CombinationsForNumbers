import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('admin@reasonedai.com');
  const [password, setPassword] = useState('admin123!');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (res) => {
      setAuth(res.data.user as User, res.data.access_token);
      toast.success(`Welcome back, ${res.data.user.full_name}`);
    },
    onError: () => {
      toast.error('Invalid credentials. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate();
  };

  return (
    <div className={styles.page}>
      <div className={styles.backgroundOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className={styles.header}>
          <div className={styles.logoMark}>
            <Zap size={24} />
          </div>
          <h1 className={styles.title}>ReasonedAI</h1>
          <p className={styles.subtitle}>Enterprise Document Intelligence Platform</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@organization.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className={styles.submitBtn}
            disabled={loginMutation.isPending}
            whileTap={{ scale: 0.98 }}
          >
            {loginMutation.isPending ? (
              <span className={styles.spinner} />
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>

        <div className={styles.demoHint}>
          <span>Demo credentials auto-filled above</span>
        </div>

        <div className={styles.features}>
          {['Document Intelligence', 'Multi-Stage Reasoning', 'Agent Blueprint Generation'].map((f) => (
            <span key={f} className={styles.featureTag}>{f}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
