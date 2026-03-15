import React, { useState } from 'react';
import { Eye, EyeOff, MapPin, Shield, Users, TrendingUp } from 'lucide-react';
import { api } from './api';

interface AuthPageProps {
  onLogin: (user: any) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    password: '',
  });

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = mode === 'signup'
        ? await api.signup(form.username, form.first_name, form.last_name, form.password)
        : await api.login(form.username, form.password);
      localStorage.setItem('rh_user', JSON.stringify(user));
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f1f4f8',
      fontFamily: '"Outfit", "Inter", ui-sans-serif, sans-serif',
    }}>
      {/* ── Left: Description ── */}
      <div style={{
        flex: 1,
        background: '#0d1b2e',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        color: '#fff',
      }}>
        <img src="/logo.png" alt="Real Holat" style={{ height: 52, objectFit: 'contain', marginBottom: 40, alignSelf: 'flex-start' }} />

        <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em' }}>
          Контролируй обещания.<br />
          <span style={{ color: '#3b82f6' }}>Вместе.</span>
        </h1>
        <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 48, maxWidth: 420 }}>
          «Реал Холат» — гражданская платформа мониторинга школьной инфраструктуры Ташкента.
          Проверяй выполнение обещаний подрядчиков и государства, фотографируй и получай баллы.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { icon: <MapPin size={18} />, title: '800+ школ', desc: 'на интерактивной карте Ташкента' },
            { icon: <Shield size={18} />, title: 'Проверка обещаний', desc: 'фото-репорты граждан с валидацией' },
            { icon: <Users size={18} />, title: 'Территориальный захват', desc: 'соревнуйся с другими районами' },
            { icon: <TrendingUp size={18} />, title: 'Публичный рейтинг', desc: 'еженедельный дайджест в Telegram' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(59,130,246,0.15)',
                color: '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Auth form ── */}
      <div style={{
        width: 440,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0d1b2e', marginBottom: 6, letterSpacing: '-0.01em' }}>
          {mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 32 }}>
          {mode === 'login'
            ? 'Введите юзернейм и пароль'
            : 'Заполните данные для регистрации'}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Имя</label>
                <input
                  style={inputStyle}
                  placeholder="Анвар"
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Фамилия</label>
                <input
                  style={inputStyle}
                  placeholder="Саидов"
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Юзернейм</label>
            <input
              style={inputStyle}
              placeholder="anvar_s"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label style={labelStyle}>Пароль</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px 0',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.18s',
            }}
          >
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            style={{
              background: 'none', border: 'none', color: '#2563eb',
              fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}
          >
            {mode === 'login' ? 'Создать аккаунт' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#f8fafc',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 14,
  color: '#0d1b2e',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.18s',
};
