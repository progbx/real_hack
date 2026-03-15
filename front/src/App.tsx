import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import AuthPage from './AuthPage';
import {
  LayoutDashboard, BarChart3, Target, User as UserIcon,
  Search, Bell, ChevronRight, TrendingUp, TrendingDown,
  Users, Globe, X, Zap, Shield, Award, CheckCircle2,
  MapPin, Camera as CameraIcon, Info, Calendar,
  AlertTriangle, Activity, Clock, Star, Filter, Map,
  ClipboardList, Building2, Wifi, Wrench, BookOpen, Share2,
  Plus, Trash2, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, School, District, User, SchoolMapItem, Stats, SchoolPromise } from './api';
import L from 'leaflet';

type View = 'tasks' | 'dashboard' | 'rating' | 'school' | 'capture' | 'inspection' | 'profile' | 'create';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function statusColor(s: string) {
  if (s === 'ok') return '#22c55e';
  if (s === 'problem') return '#ef4444';
  return '#f59e0b';
}

function statusBadge(s: string) {
  if (s === 'ok') return <span className="badge badge-green">Норма</span>;
  if (s === 'problem') return <span className="badge badge-red">Проблема</span>;
  return <span className="badge badge-yellow">Не проверено</span>;
}

function promiseStatusBadge(s: string) {
  const map: Record<string, { cls: string; label: string }> = {
    pending:       { cls: 'badge-gray',   label: 'Ожидает' },
    'in-progress': { cls: 'badge-blue',   label: 'В работе' },
    resolved:      { cls: 'badge-green',  label: 'Выполнено' },
    ignored:       { cls: 'badge-red',    label: 'Игнорируется' },
  };
  const m = map[s] ?? { cls: 'badge-gray', label: s };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function MapFlyTo({ lat, lng, zoom = 15 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 1.4 }); }, [lat, lng, zoom]);
  return null;
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('tasks');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('rh_user') || 'null'); } catch { return null; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activePromiseId, setActivePromiseId] = useState<string | undefined>(undefined);

  if (!user) {
    return <AuthPage onLogin={u => setUser(u)} />;
  }

  const goToSchool = useCallback(async (item: School | SchoolMapItem) => {
    const full = await api.getSchool(item.id);
    setSelectedSchool(full);
    setView('school');
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await api.searchSchools(q).catch(() => [] as School[]);
    setSearchResults(res);
    setShowSearch(true);
  }, []);

  const NAV = [
    { id: 'tasks'     as View, label: 'Проверки',  icon: <ClipboardList size={22} /> },
    { id: 'capture'   as View, label: 'Карта',     icon: <Map size={22} /> },
    { id: 'create'    as View, label: 'Создать',   icon: <Plus size={22} />, isCreate: true },
    { id: 'dashboard' as View, label: 'Аналитика', icon: <LayoutDashboard size={22} /> },
    { id: 'rating'    as View, label: 'Рейтинг',  icon: <BarChart3 size={22} /> },
    { id: 'profile'   as View, label: 'Профиль',  icon: <UserIcon size={22} /> },
  ];

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Real Holat" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0d1b2e', letterSpacing: '-0.02em', marginLeft: 8 }}>Eq</span>
        </div>

        {NAV.map(n => (
          n.isCreate ? (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? 'active' : ''}`}
              onClick={() => setView(n.id)}
              style={{
                background: view === n.id ? '#5dc41a' : '#7cee2b',
                color: '#182210', borderRadius: 14, margin: '4px 0',
                border: '2px solid transparent',
              }}
            >
              {n.icon}
              <span>{n.label}</span>
            </button>
          ) : (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? 'active' : ''}`}
              onClick={() => setView(n.id)}
            >
              {n.icon}
              <span>{n.label}</span>
            </button>
          )
        ))}

        {/* ── Sidebar user card ── */}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 0 16px' }}>
          <div
            style={{
              background: '#f7f8f6', borderRadius: 16, padding: '12px 14px',
              cursor: 'pointer', position: 'relative', border: '1.5px solid #e8edf2',
              transition: 'background 0.15s',
            }}
            onClick={() => setShowUserMenu(v => !v)}
            tabIndex={0}
            onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#0d1b2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <UserIcon size={18} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.first_name} {user.last_name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Lv. {user.level} · {user.points_total} pts</div>
              </div>
            </div>
            <button
              onMouseDown={() => setView('inspection' as View)}
              style={{
                marginTop: 10, width: '100%', padding: '8px 0',
                background: '#7cee2b', border: 'none', borderRadius: 10,
                fontSize: 12, fontWeight: 700, color: '#182210',
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Zap size={13} /> Новая проверка
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 30px rgba(13,27,46,0.13)',
                border: '1.5px solid #e2e8f0', zIndex: 200, overflow: 'hidden',
              }}>
                {[
                  { label: 'Профиль', id: 'profile' as View | null },
                  { label: 'Достижения', id: null },
                  { label: 'Настройки', id: null },
                  { label: 'Contact Us', id: null },
                  { label: 'Terms & Conditions', id: null },
                ].map((item, i) => (
                  <button
                    key={item.label}
                    onMouseDown={() => { if (item.id) setView(item.id); setShowUserMenu(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 16px', background: 'transparent', border: 'none',
                      fontSize: 13, fontWeight: 600,
                      color: i === 0 ? '#2563eb' : '#1e293b',
                      cursor: 'pointer', fontFamily: 'inherit',
                      borderTop: i === 3 ? '1px solid #f1f5f9' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onMouseDown={() => { localStorage.removeItem('rh_user'); window.location.reload(); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 16px', background: 'transparent', border: 'none',
                      fontSize: 13, fontWeight: 600, color: '#ef4444',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Выйти
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        {/* Header */}
        <header className="top-header">
          {/* Logo — mobile only */}
          <div className="header-logo-wrap" style={{ alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <img src="/logo.png" alt="Real Holat" style={{ height: 32, objectFit: 'contain' }} />
          </div>

          {/* Search — own background */}
          <div className="header-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 180)}
              placeholder="Поиск школы, района..."
            />
            {showSearch && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map(s => (
                  <button
                    key={s.id}
                    className="search-item"
                    onMouseDown={() => goToSchool(s)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e' }}>{s.name_ru}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{s.district} · {s.oblast}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="header-actions">
            <button className="icon-btn" style={{ position: 'relative' }}>
              <Bell size={17} />
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 7, height: 7, borderRadius: '50%',
                background: '#ec4899', border: '1.5px solid #fff',
              }} />
            </button>
          </div>
        </header>

        {/* Views */}
        <div className="content-area">
          <AnimatePresence mode="wait">
            {view === 'tasks'     && <TasksView key="t" onSchoolClick={goToSchool} user={user} />}
            {view === 'dashboard' && <DashboardView key="d" onSchoolClick={goToSchool} user={user} onGoProfile={() => setView('profile')} />}
            {view === 'rating'    && <RatingView key="r" />}
            {view === 'school' && selectedSchool && (
              <SchoolView
                key="s"
                school={selectedSchool}
                onBack={() => setView('dashboard')}
                onInspect={pid => { setActivePromiseId(pid); setView('inspection'); }}
              />
            )}
            {view === 'capture'    && <CaptureView key="c" onSchoolClick={goToSchool} user={user} />}
            {view === 'inspection' && selectedSchool && (
              <InspectionView
                key="i"
                school={selectedSchool}
                promiseId={activePromiseId}
                onCancel={() => setView('school')}
                onDone={(pts?: number) => {
                  if (pts && pts > 0) {
                    setUser(u => {
                      if (!u) return u;
                      const newXp = u.xp + pts;
                      const leveled = newXp >= u.xp_next;
                      const updated = {
                        ...u,
                        xp: leveled ? newXp - u.xp_next : newXp,
                        xp_next: leveled ? Math.round(u.xp_next * 1.4) : u.xp_next,
                        level: leveled ? u.level + 1 : u.level,
                        points_total: u.points_total + pts,
                        points_season: u.points_season + pts,
                      };
                      localStorage.setItem('rh_user', JSON.stringify(updated));
                      return updated;
                    });
                  }
                  setView('school');
                }}
              />
            )}
            {view === 'profile' && <ProfileView key="p" user={user} />}
            {view === 'create'  && <CreatePromiseView key="cp" user={user} onSuccess={() => setView('tasks')} />}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile bottom nav (Portal → rendered into body to avoid z-index issues) ── */}
      {ReactDOM.createPortal(
        <nav className="bottom-nav">
          {NAV.filter(n => n.id !== 'rating').map(n => n.isCreate ? (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`bottom-nav-item bnav-create-btn ${view === n.id ? 'active' : ''}`}
            >
              <Plus size={22} />
            </button>
          ) : (
            <button
              key={n.id}
              className={`bottom-nav-item ${view === n.id ? 'active' : ''}`}
              onClick={() => setView(n.id)}
            >
              <span className="bnav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>,
        document.body
      )}
    </div>
  );
}

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.22, delay }}
  >
    {children}
  </motion.div>
);

// ─── TASKS ────────────────────────────────────────────────────────────────────

const TASK_ICONS = [Building2, Wifi, Wrench, BookOpen, AlertTriangle, MapPin];
const TASK_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#22c55e', '#38bdf8'];
const TASK_TYPES = ['Капитальный', 'Расходный', 'Капитальный', 'Расходный', 'Капитальный', 'Расходный'];
const TASK_SOURCES = ['E-tender', 'E-tender', 'Народный', 'E-tender', 'Народный', 'Народный', 'E-tender', 'Народный'];
const SCHOOL_PHOTOS = [
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1588072432836-e10032774350?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1576267423048-15c0040fec78?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=260&fit=crop',
];
const TASK_AMOUNTS = [
  850_000_000, 420_000_000, 1_200_000_000, 780_000_000, 340_000_000,
  950_000_000, 680_000_000, 520_000_000, 280_000_000, 190_000_000,
  1_100_000_000, 750_000_000, 480_000_000, 620_000_000, 310_000_000, 440_000_000,
];

// 10 реальных государственных школ Ташкента
const TASHKENT_SCHOOLS: SchoolMapItem[] = [
  { id: 'tash-001', name_ru: 'Школа №1 имени Алишера Навои',                    oblast: 'Toshkent shahar', district: 'Шайхантахур',   promise_count: 4, capture_level: 45, status: 'stale',   lat: 41.3123, lng: 69.2401 },
  { id: 'tash-002', name_ru: 'Школа №34 имени Бабура',                          oblast: 'Toshkent shahar', district: 'Шайхантахур',   promise_count: 3, capture_level: 72, status: 'ok',      lat: 41.3089, lng: 69.2456 },
  { id: 'tash-003', name_ru: 'Школа №110',                                      oblast: 'Toshkent shahar', district: 'Юнусобод',      promise_count: 5, capture_level: 28, status: 'problem', lat: 41.3389, lng: 69.2867 },
  { id: 'tash-004', name_ru: 'Школа №114',                                      oblast: 'Toshkent shahar', district: 'Мирзо Улугбек', promise_count: 4, capture_level: 60, status: 'stale',   lat: 41.3289, lng: 69.3201 },
  { id: 'tash-005', name_ru: 'Школа №278 имени Амира Темура',                   oblast: 'Toshkent shahar', district: 'Чиланзар',      promise_count: 3, capture_level: 85, status: 'ok',      lat: 41.2756, lng: 69.2234 },
  { id: 'tash-006', name_ru: 'Президентская школа г. Ташкент',                  oblast: 'Toshkent shahar', district: 'Юнусобод',      promise_count: 2, capture_level: 90, status: 'ok',      lat: 41.3456, lng: 69.2934 },
  { id: 'tash-007', name_ru: 'Школа №6 с углублённым изучением английского',    oblast: 'Toshkent shahar', district: 'Мирзо Улугбек', promise_count: 4, capture_level: 42, status: 'stale',   lat: 41.3178, lng: 69.3345 },
  { id: 'tash-008', name_ru: 'Республиканская спецшкола-интернат №1',           oblast: 'Toshkent shahar', district: 'Юнусобод',      promise_count: 5, capture_level: 33, status: 'problem', lat: 41.3523, lng: 69.2789 },
  { id: 'tash-009', name_ru: 'Школа №231',                                      oblast: 'Toshkent shahar', district: 'Чиланзар',      promise_count: 3, capture_level: 55, status: 'stale',   lat: 41.2634, lng: 69.2145 },
  { id: 'tash-010', name_ru: 'Школа №99',                                       oblast: 'Toshkent shahar', district: 'Мирзо Улугбек', promise_count: 4, capture_level: 68, status: 'stale',   lat: 41.3012, lng: 69.3456 },
];

const FAMOUS_META: Record<string, { amount: number; source: string; deadline: string; overdue: boolean }> = {
  'tash-001': { amount: 850_000_000,   source: 'E-tender',  deadline: '15 июл 2025', overdue: true  },
  'tash-002': { amount: 620_000_000,   source: 'E-tender',  deadline: '20 дек 2025', overdue: false },
  'tash-003': { amount: 1_100_000_000, source: 'E-tender',  deadline: '10 сен 2025', overdue: true  },
  'tash-004': { amount: 780_000_000,   source: 'E-tender',  deadline: '28 май 2025', overdue: true  },
  'tash-005': { amount: 950_000_000,   source: 'E-tender',  deadline: '01 окт 2025', overdue: false },
  'tash-006': { amount: 1_400_000_000, source: 'E-tender',  deadline: '20 авг 2025', overdue: false },
  'tash-007': { amount: 920_000_000,   source: 'E-tender',  deadline: '30 дек 2025', overdue: false },
  'tash-008': { amount: 1_200_000_000, source: 'Народный', deadline: '01 июн 2025', overdue: true  },
  'tash-009': { amount: 480_000_000,   source: 'Народный', deadline: '15 фев 2026', overdue: false },
  'tash-010': { amount: 730_000_000,   source: 'E-tender',  deadline: '01 мар 2026', overdue: false },
};

type TaskFilters = { status: 'all'|'overdue'|'active'; source: 'all'|'etender'|'crowd' };

function TasksView({ onSchoolClick, user }: { onSchoolClick: (s: SchoolMapItem) => void; user: User }) {
  const [schools, setSchools] = useState<SchoolMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({ status: 'all', source: 'all' });

  useEffect(() => {
    setSchools(TASHKENT_SCHOOLS);
    setLoading(false);
  }, []);

  const deadlines = ['24 окт 2025', '02 ноя 2025', '15 ноя 2025', '01 дек 2025', '20 окт 2025', '10 янв 2026', '28 фев 2026', '15 мар 2026'];

  const filtered = schools.filter((s, i) => {
    const meta    = FAMOUS_META[s.id];
    const overdue = meta ? meta.overdue : (i % 5 === 0);
    const src     = meta?.source ?? TASK_SOURCES[i % TASK_SOURCES.length];
    if (filters.status === 'overdue' && !overdue) return false;
    if (filters.status === 'active' && overdue) return false;
    if (filters.source === 'etender' && src !== 'E-tender') return false;
    if (filters.source === 'crowd' && src !== 'Народный') return false;
    return true;
  });

  const activeCount = Object.values(filters).filter(v => v !== 'all').length;

  function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        style={{
          padding: '5px 13px', borderRadius: 100, fontSize: 12, fontWeight: 600,
          border: active ? 'none' : '1px solid #e8ecf0',
          background: active ? '#7cee2b' : '#fff',
          color: active ? '#182210' : '#5a7a9a',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >{label}</button>
    );
  }

  function setFilter<K extends keyof TaskFilters>(key: K, val: TaskFilters[K]) {
    setFilters(f => ({ ...f, [key]: f[key] === val ? 'all' : val }));
  }

  return (
    <FadeIn>
      <style>{`
        .tasks-grid { grid-template-columns: repeat(4, 1fr) !important; }
        @media (max-width: 900px)  { .tasks-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 600px)  { .tasks-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 380px)  { .tasks-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px)  { .card-stats-row { flex-direction: column !important; } }
        .card-school-name { font-size: 13px; }
        @media (max-width: 768px) { .card-school-name { font-size: 11px !important; } }
        .card-stat-block { padding: 4px 7px; }
        .card-stat-label { font-size: 9px; }
        .card-stat-value { font-size: 10px; }
        @media (max-width: 768px) {
          .card-stat-block { padding: 3px 5px !important; }
          .card-stat-label { font-size: 8px !important; }
          .card-stat-value { font-size: 9px !important; }
        }
        @keyframes spark-slide {
          0%   { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(400%) skewX(-15deg); opacity: 0; }
        }
        .spark-shine {
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(124,238,43,0.08) 40%, rgba(255,255,255,0.13) 50%, rgba(124,238,43,0.08) 60%, transparent 100%);
          animation: spark-slide 3.2s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0d1b2e' }}>Проверки</h2>
            <p className="tasks-subtitle-desktop" style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>Школы с открытыми обращениями — требуют проверки</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              {showFilters && (
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setShowFilters(false)}
                />
              )}
              <button
                onClick={() => setShowFilters(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: '1.5px solid ' + (showFilters || activeCount > 0 ? '#7cee2b' : '#e8ecf0'),
                  background: showFilters || activeCount > 0 ? '#f0fdf4' : '#fff',
                  color: activeCount > 0 ? '#16a34a' : '#5a7a9a',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <Filter size={14} />
                Фильтр
                {activeCount > 0 && (
                  <span style={{ background: '#7cee2b', color: '#182210', borderRadius: 100, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>
                    {activeCount}
                  </span>
                )}
              </button>

              {showFilters && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#fff', borderRadius: 14, border: '1.5px solid #e8ecf0',
                  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
                  boxShadow: '0 8px 28px rgba(13,27,46,0.11)', zIndex: 50, minWidth: 200,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Статус</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Pill label="Просрочено" active={filters.status === 'overdue'} onClick={() => setFilter('status', 'overdue')} />
                      <Pill label="Активные"   active={filters.status === 'active'}  onClick={() => setFilter('status', 'active')} />
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#f1f5f9' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Источник</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Pill label="E-tender"  active={filters.source === 'etender'} onClick={() => setFilter('source', 'etender')} />
                      <Pill label="Народный"  active={filters.source === 'crowd'}   onClick={() => setFilter('source', 'crowd')} />
                    </div>
                  </div>
                  {activeCount > 0 && (
                    <>
                      <div style={{ height: 1, background: '#f1f5f9' }} />
                      <button
                        onMouseDown={e => { e.preventDefault(); setFilters({ status: 'all', source: 'all' }); }}
                        style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                      >
                        Сбросить фильтры
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile-only subtitle ── */}
        <p className="tasks-subtitle-mobile" style={{ fontSize: 13, color: '#94a3b8', marginTop: -8 }}>Школы с открытыми обращениями — требуют проверки</p>

        {/* ── Motivational progress block ── */}
        <div style={{
          background: '#0d1b2e',
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: 16,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 96,
        }}>
          <div className="spark-shine" />

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#7cee2b', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Твой прогресс
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>
              {user.streak > 0 ? `${user.streak} дней` : 'Начни сегодня'}
              {user.streak > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#7cee2b', marginLeft: 8 }}>🔥 серия</span>
              )}
            </div>
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 100, marginBottom: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((user.xp / user.xp_next) * 100, 100)}%`, height: '100%', background: '#7cee2b', borderRadius: 100 }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {user.xp.toLocaleString('ru-RU')} / {user.xp_next.toLocaleString('ru-RU')} XP · Уровень {user.level}
            </div>
          </div>

          {/* Points + Mascot grouped tightly */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Очки</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{user.points_total.toLocaleString('ru-RU')}</div>
              <div style={{ fontSize: 10, color: '#7cee2b', fontWeight: 700 }}>+{user.points_season} сезон</div>
            </div>
            <img
              src="/likegirl.png"
              alt=""
              style={{
                height: 120,
                objectFit: 'contain',
                alignSelf: 'flex-end',
                marginBottom: -18,
                marginRight: -4,
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* ── Count label ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e', flexShrink: 0 }}>
              {filtered.length} обращений
            </span>
            <div style={{ flex: 1, height: 1.5, background: '#e8ecf0', borderRadius: 100 }} />
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 160, background: '#f7f8f6', borderRadius: 16, border: '1px solid #e8ecf0' }} />
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>
            Нет заданий по выбранным фильтрам
          </div>
        )}

        <div className="tasks-grid" style={{ display: 'grid', gap: 18 }}>
          {filtered.map((s, i) => {
            const meta      = FAMOUS_META[s.id];
            const source    = meta.source;
            const rawAmt    = meta.amount;
            const deadline  = meta.deadline;
            const isOverdue = meta.overdue;
            // Format: millions if ≥ 1M, else thousands
            const amount = rawAmt >= 1_000_000
              ? (rawAmt / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' млн UZS'
              : rawAmt.toLocaleString('ru-RU') + ' UZS';

            const photo = SCHOOL_PHOTOS[i % SCHOOL_PHOTOS.length];

            const pts = s.promise_count * 25 + (isOverdue ? 50 : 20) + Math.round(s.capture_level * 0.8);

            return (
              <div key={s.id} style={{
                background: '#fff',
                borderRadius: 18,
                border: '1.5px solid #d4dce6',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'rgb(0 0 0 / 40%) 3px 3px 0px 0px, rgb(106 255 0 / 50%) 8px 8px 0px 0px',
                transition: 'transform 0.13s, box-shadow 0.13s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'rgb(0 0 0 / 50%) 4px 4px 0px 0px, rgb(106 255 0 / 65%) 10px 10px 0px 0px'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'rgb(0 0 0 / 40%) 3px 3px 0px 0px, rgb(106 255 0 / 50%) 8px 8px 0px 0px'; }}
              >
                {/* Photo with source badge overlay */}
                <div style={{ position: 'relative', flexShrink: 0, height: 120 }}>
                  <img
                    src={photo}
                    alt={s.name_ru}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* dark gradient over photo bottom */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)' }} />
                  <span style={{
                    position: 'absolute', top: 7, left: 7,
                    fontSize: 8, fontWeight: 800,
                    background: source === 'E-tender' ? 'rgba(37,99,235,0.88)' : 'rgba(219,39,119,0.88)',
                    color: '#fff',
                    padding: '2px 7px', borderRadius: 100,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {source}
                  </span>
                  {/* Points badge */}
                  <span style={{
                    position: 'absolute', top: 7, right: 7,
                    fontSize: 9, fontWeight: 800,
                    background: 'rgba(124,238,43,0.92)',
                    color: '#182210',
                    padding: '2px 7px', borderRadius: 100,
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <Zap size={8} /> +{pts} XP
                  </span>
                </div>

                {/* Content — school icon watermark */}
                <div style={{
                  padding: '9px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Watermark — graduation cap, right side */}
                  <svg
                    viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                    style={{
                      position: 'absolute', right: -8, top: '50%',
                      transform: 'translateY(-50%)',
                      width: 80, height: 80,
                      opacity: 0.07, pointerEvents: 'none',
                    }}
                  >
                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="#0d1b2e"/>
                    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="#0d1b2e"/>
                  </svg>
                  <div className="card-school-name" style={{ fontWeight: 600, color: '#0d1b2e', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name_ru}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>
                    {s.district.replace(' tumani', '')}
                  </div>

                  {/* Stats row */}
                  <div className="card-stats-row" style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                    <div className="card-stat-block" style={{
                      flex: 1, background: 'rgba(124,238,43,0.10)', borderRadius: 8,
                      border: '1px solid rgba(124,238,43,0.2)',
                    }}>
                      <div className="card-stat-label" style={{ color: '#5a7a4a', fontWeight: 600, marginBottom: 1 }}>Сумма</div>
                      <div className="card-stat-value" style={{ fontWeight: 800, color: '#182210' }}>{amount}</div>
                    </div>
                    <div className="card-stat-block" style={{
                      flex: 1, background: isOverdue ? 'rgba(239,68,68,0.07)' : 'rgba(148,163,184,0.07)',
                      borderRadius: 8,
                      border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.15)'}`,
                    }}>
                      <div className="card-stat-label" style={{ color: isOverdue ? '#dc2626' : '#64748b', fontWeight: 600, marginBottom: 1 }}>Срок</div>
                      <div className="card-stat-value" style={{ fontWeight: 700, color: isOverdue ? '#dc2626' : '#0d1b2e' }}>
                        {isOverdue ? 'Просрочено' : deadline}
                      </div>
                    </div>
                  </div>

                  {/* CTA button */}
                  <button
                    className="btn-shine"
                    onClick={() => onSchoolClick(s)}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 10,
                      background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                      color: '#182210', fontWeight: 800, fontSize: 10,
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      boxShadow: '0 2px 8px rgba(124,238,43,0.3)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Проверить <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

const P = '#7cee2b'; // primary green
const DARK = '#182210';

function DashboardView({ onSchoolClick, user, onGoProfile }: {
  onSchoolClick: (s: SchoolMapItem) => void;
  user: User | null;
  onGoProfile: () => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { api.getStats().then(setStats).catch(console.error); }, []);

  const funnel   = stats?.promise_funnel ?? {};
  const infra    = stats?.infrastructure ?? { gym: 0, water: 0, internet: 0, cafeteria: 0, electricity: 0 };
  const statuses = stats?.school_statuses ?? {};
  const totalFunnel = (funnel.pending ?? 0) + (funnel['in-progress'] ?? 0) + (funnel.resolved ?? 0) + (funnel.ignored ?? 0);
  const xpPct = user ? Math.round((user.xp / user.xp_next) * 100) : 0;

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid rgba(124,238,43,0.12)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    padding: '16px 18px',
  };

  return (
    <FadeIn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Hero banner ── */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', cursor: 'pointer' }} onClick={onGoProfile}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
              background: `${P}28`, border: `2px solid ${P}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserIcon size={26} color={P} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.2 }}>
                Привет, {user?.first_name ?? 'Инспектор'}! 👋
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Уровень {user?.level ?? 1} · {user?.district ?? 'Инспектор'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff7ed', borderRadius: 100, padding: '8px 14px' }}>
              <Zap size={14} color="#f97316" fill="#f97316" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#f97316' }}>{user?.streak ?? 0}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>стрик</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${P}18`, borderRadius: 100, padding: '8px 14px' }}>
              <Star size={14} color={P} fill={P} />
              <span style={{ fontSize: 14, fontWeight: 800, color: DARK }}>{val(user?.points_season ?? 0)}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>баллов</span>
            </div>
          </div>
        </div>

        {/* ── 4 stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {/* Уровень + XP bar */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Уровень</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: P, background: `${P}18`, padding: '2px 7px', borderRadius: 100 }}>{xpPct}%</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0d1b2e', lineHeight: 1 }}>{user?.level ?? 1}</div>
            <div style={{ height: 6, background: '#f1f5f0', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpPct}%`, background: P, borderRadius: 100, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{user?.xp ?? 0} / {user?.xp_next ?? 1000} XP</div>
          </div>

          {/* Стрик */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Стрик</span>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#f97316', lineHeight: 1 }}>{user?.streak ?? 0}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Макс: {user?.max_streak ?? 0} дн.</div>
          </div>

          {/* Баллы */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Баллы сезона</span>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0d1b2e', lineHeight: 1 }}>{val(user?.points_season ?? 0)}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Всего: {val(user?.points_total ?? 0)}</div>
          </div>

          {/* Школы — dark card */}
          <div style={{ ...card, background: DARK, border: '1px solid rgba(124,238,43,0.18)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4a7a30', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Школ охвачено</span>
            <div style={{ fontSize: 34, fontWeight: 800, color: P, lineHeight: 1 }}>{val(stats?.total_schools ?? 0)}</div>
            <div style={{ fontSize: 11, color: '#4a7a30' }}>{stats?.weekly_inspections ?? 0} провер. за неделю</div>
          </div>
        </div>

        {/* ── Мониторинг — 3 quick metrics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ ...card, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Обещаний всего</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0d1b2e' }}>{val(stats?.total_promises ?? 0)}</div>
          </div>
          <div style={{ ...card, background: P, border: '1px solid #5cb81f', padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2a5a00', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Выполнение</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: DARK }}>{stats?.promise_completion ?? 0}%</div>
          </div>
          <div style={{ ...card, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Инспекторов</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0d1b2e' }}>{stats?.active_inspectors ?? 0}</div>
          </div>
        </div>

        {/* ── Section header: Активные проблемы ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0d1b2e' }}>Активные проблемы</span>
          <button style={{ fontSize: 12, fontWeight: 700, color: P, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Все →
          </button>
        </div>

        {/* ── 2×2 problem school grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(stats?.top_problem_schools ?? []).slice(0, 4).map((s, i) => {
            const colors = ['#3b82f6', '#8b5cf6', '#f97316', '#ec4899'];
            const bg = colors[i % colors.length];
            return (
              <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                    background: bg + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={22} color={bg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name_ru}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.district}</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {s.open_promises} обещ. открыто
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn-shine"
                  onClick={() => onSchoolClick(s as any)}
                  style={{
                    width: '100%', background: P, color: DARK, fontWeight: 700,
                    border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Проверить →
                </button>
              </div>
            );
          })}
          {!stats && [1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 130, background: '#f7f8f6', borderRadius: 16, border: '1px solid rgba(124,238,43,0.08)' }} />
          ))}
        </div>

        {/* ── Infrastructure + Funnel row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Infra */}
          <div style={{ ...card, background: DARK, border: '1px solid rgba(124,238,43,0.15)', color: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4a7a30', marginBottom: 12 }}>
              Инфраструктура
            </div>
            {[
              { label: 'Электричество', v: infra.electricity, c: P },
              { label: 'Вода',          v: infra.water,       c: '#38bdf8' },
              { label: 'Интернет',      v: infra.internet,    c: '#818cf8' },
              { label: 'Спортзал',      v: infra.gym,         c: '#fb923c' },
              { label: 'Столовая',      v: infra.cafeteria,   c: '#f472b6' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{item.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.c }}>{item.v}%</span>
                </div>
                <div style={{ height: 4, background: '#2a3a1a', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.v}%`, background: item.c, borderRadius: 100, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Funnel */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12 }}>
              Воронка обещаний
            </div>
            {[
              { label: 'Ожидают',   v: funnel.pending ?? 0,        c: '#f59e0b' },
              { label: 'В работе',  v: funnel['in-progress'] ?? 0, c: '#38bdf8' },
              { label: 'Выполнено', v: funnel.resolved ?? 0,       c: P },
              { label: 'Игнорир.',  v: funnel.ignored ?? 0,        c: '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#64748b', width: 58, flexShrink: 0 }}>{item.label}</span>
                <div style={{ flex: 1, height: 5, background: '#f1f5f0', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${totalFunnel ? item.v / totalFunnel * 100 : 0}%`, background: item.c, borderRadius: 100, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.c, minWidth: 30, textAlign: 'right' }}>{val(item.v)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #f1f5f0', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              {[
                { label: 'Норма',    v: statuses.ok ?? 0,      c: P },
                { label: 'Проблема', v: statuses.problem ?? 0, c: '#ef4444' },
                { label: 'Непров.',  v: statuses.stale ?? 0,   c: '#94a3b8' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{val(s.v)}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </FadeIn>
  );
}

function val(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

// ─── RATING ───────────────────────────────────────────────────────────────────

function RatingView() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDistricts('Toshkent shahar').then(d => { setDistricts(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <FadeIn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0d1b2e', marginBottom: 4 }}>Рейтинг районов</h2>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Прозрачное сравнение эффективности управления школами</p>
          </div>
          <button className="btn btn-secondary btn-sm"><Filter size={14} /> Фильтр</button>
        </div>

        {/* Header top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <div className="card-blue" style={{ padding: '18px 20px' }}>
            <div className="stat-label">Районов в рейтинге</div>
            <div className="stat-value">{districts.length}</div>
          </div>
          <div className="card-pink" style={{ padding: '18px 20px' }}>
            <div className="stat-label">Лучший район</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
              {districts[0]?.name?.replace(' tumani', '') ?? '—'}
            </div>
          </div>
          <div className="card-dark" style={{ padding: '18px 20px' }}>
            <div className="stat-label" style={{ color: '#5c7a9a' }}>Ср. выполнение</div>
            <div className="stat-value">
              {districts.length ? Math.round(districts.reduce((a, d) => a + d.fulfillment_rate, 0) / districts.length) : 0}%
            </div>
          </div>
        </div>

        {/* Districts table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1.5px solid #f1f5f9' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1b2e' }}>Все районы</div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Загрузка…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Район</th>
                  <th>Школ</th>
                  <th>Выполнение</th>
                  <th>Проверено</th>
                  <th>Игнорируется</th>
                  <th>Тренд</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d, i) => (
                  <tr key={d.name}>
                    <td>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: i < 3 ? '#2563eb' : '#f1f5f9',
                        color: i < 3 ? '#fff' : '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800
                      }}>{i + 1}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0d1b2e' }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.oblast}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{d.total_schools}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                        <div className="progress-track" style={{ flex: 1 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${d.fulfillment_rate}%`,
                              background: d.fulfillment_rate > 70 ? '#22c55e' : d.fulfillment_rate > 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2e', minWidth: 32 }}>{d.fulfillment_rate}%</span>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 700 }}>{d.checked_ratio}%</span></td>
                    <td>
                      {d.ignored_count > 0
                        ? <span className="badge badge-red">{d.ignored_count}</span>
                        : <span className="badge badge-green">0</span>}
                    </td>
                    <td>
                      {d.trend === 'up'
                        ? <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700 }}><TrendingUp size={14} /> Рост</span>
                        : <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700 }}><TrendingDown size={14} /> Падение</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

// ─── SCHOOL DETAIL ────────────────────────────────────────────────────────────

function SchoolView({ school, onBack, onInspect }: {
  school: School; onBack: () => void; onInspect: (pid?: string) => void;
}) {
  const [tab, setTab] = useState<'promises' | 'checks' | 'analytics'>('promises');
  const [selectedPromise, setSelectedPromise] = useState<SchoolPromise | null>(null);

  const capturePercent = [0, 33, 66, 100][school.capture_level] ?? 0;
  const trustScore = Math.min(5.0, 3.8 + school.promises.filter(p => p.status === 'resolved').length * 0.08);

  const PROMISE_ICONS = ['🔧', '📦', '🏗️', '💡', '🖥️', '🏃', '📚', '🌊', '⚡', '🔬'];
  const FUNNEL_LABEL: Record<string, string>  = { pending: 'ОЖИДАНИЕ', 'in-progress': 'ИСПОЛНЕНИЕ', resolved: 'ВЫПОЛНЕНО', ignored: 'ИГНОРИРУЕТСЯ' };
  const FUNNEL_COLOR: Record<string, string>  = { pending: '#f59e0b', 'in-progress': '#7cee2b', resolved: '#7cee2b', ignored: '#ef4444' };
  const FUNNEL_PCT:   Record<string, number>  = { pending: 20, 'in-progress': 60, resolved: 100, ignored: 0 };
  const TYPE_TAG: Record<string, { label: string; bg: string; color: string }> = {
    capital:    { label: 'CAPITAL',    bg: '#dbeafe', color: '#1d4ed8' },
    consumable: { label: 'CONSUMABLE', bg: '#ede9fe', color: '#7c3aed' },
  };

  const TABS = [
    { id: 'promises',  label: `Обращения (${school.promises.length})` },
    { id: 'checks',    label: 'Проверки' },
    { id: 'analytics', label: 'Аналитика' },
  ];

  return (
    <FadeIn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: '#7cee2b', fontWeight: 700, cursor: 'pointer' }} onClick={onBack}>Школы</span>
          <ChevronRight size={13} color="#cbd5e1" />
          <span style={{ color: '#0d1b2e', fontWeight: 600 }}>{school.name_ru}</span>
        </div>

        {/* Hero card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap' }}>

            {/* School photo */}
            <div style={{ width: 160, minHeight: 130, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <img
                src={`https://picsum.photos/seed/sch${school.uid ?? school.id}/320/240`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                alt={school.name_ru}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1, padding: '18px 20px', minWidth: 180 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0d1b2e', marginBottom: 5, lineHeight: 1.25 }}>
                {school.name_ru}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                <MapPin size={12} color="#94a3b8" />
                ID: SCH-{String(school.uid ?? school.id).slice(0, 4).toUpperCase()} | {school.district}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {statusBadge(school.status)}
                <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} /> Updated 2 hours ago
                </span>
              </div>

              {/* Infra chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {[
                  { label: '👥 ' + school.students, title: 'учеников' },
                  { label: '📅 ' + (school.year_built || '—'), title: 'год' },
                  { label: school.gym?.includes('Нет') ? '❌ Спортзал' : '✅ Спортзал', title: '' },
                  { label: school.internet?.includes('Нет') ? '❌ Инет' : '✅ Инет', title: '' },
                ].map((c, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9'
                  }}>{c.label}</span>
                ))}
              </div>
            </div>

            {/* Capture status */}
            <div style={{
              padding: '18px 20px', borderLeft: '1.5px solid #f1f5f9',
              minWidth: 170, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Capture Status</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#7cee2b' }}>{capturePercent}%</span>
              </div>
              <div className="progress-track" style={{ height: 8, marginBottom: 6 }}>
                <div className="progress-fill" style={{ width: `${capturePercent}%`, background: 'linear-gradient(90deg, #7cee2b, #4ade80)' }} />
              </div>
              <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 14 }}>GOAL: 100% DATA COMPLETION FOR Q4</div>
              <button className="btn btn-primary btn-shine" style={{ justifyContent: 'center', width: '100%' }} onClick={() => onInspect(undefined)}>
                <CameraIcon size={14} /> Проверить
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              color: tab === t.id ? '#7cee2b' : '#64748b',
              borderBottom: `2.5px solid ${tab === t.id ? '#7cee2b' : 'transparent'}`,
              marginBottom: -2, whiteSpace: 'nowrap'
            }}>{t.label}</button>
          ))}
        </div>

        {/* TAB: Promises */}
        {tab === 'promises' && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Left: promise cards */}
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0d1b2e' }}>Facility Promises</span>
                <button className="btn btn-primary btn-sm btn-shine" onClick={() => onInspect(undefined)}>
                  + Новое обращение
                </button>
              </div>

              {school.promises.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                  Нет обращений по этой школе
                </div>
              )}

              {school.promises.map((p, i) => {
                const typeTag = TYPE_TAG[p.type] ?? TYPE_TAG['consumable'];
                const funnelPct = FUNNEL_PCT[p.status] ?? 0;
                const funnelColor = FUNNEL_COLOR[p.status] ?? '#94a3b8';
                const funnelLabel = FUNNEL_LABEL[p.status] ?? p.status.toUpperCase();
                const sourceIsEtender = p.source === 'E-tender';

                return (
                  <div key={p.id} className="card" style={{ padding: '16px 18px', cursor: 'pointer' }}
                    onClick={() => setSelectedPromise(p)}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: '#f0fdf4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                      }}>{PROMISE_ICONS[i % PROMISE_ICONS.length]}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.3 }}>{p.title}</div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Contract Amount</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#0d1b2e' }}>
                              {p.amount > 0 ? `${(p.amount / 1_000_000).toFixed(1)}M сум` : '—'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: typeTag.bg, color: typeTag.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {typeTag.label}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                            background: sourceIsEtender ? '#dbeafe' : '#fce7f3',
                            color: sourceIsEtender ? '#1d4ed8' : '#be185d',
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                          }}>{p.source}</span>
                        </div>

                        <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.07em', marginBottom: 6 }}>
                          FUNNEL STATUS: <span style={{ color: funnelColor }}>{funnelLabel}</span>
                          <span style={{ marginLeft: 8, color: '#cbd5e1' }}>{funnelPct}%</span>
                        </div>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[20, 40, 60, 80, 100].map(step => (
                            <div key={step} style={{
                              flex: 1, height: 5, borderRadius: 3,
                              background: funnelPct >= step ? funnelColor : '#f1f5f9'
                            }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: checks + trust + map */}
            <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Recent Checks */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px', borderBottom: '1.5px solid #f1f5f9' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e' }}>Recent Checks</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7cee2b', cursor: 'pointer' }}>VIEW ALL</span>
                </div>
                {(school.inspections as any[]).length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    Проверок нет. Будь первым!
                  </div>
                ) : (
                  (school.inspections as any[]).slice(0, 3).map((ins: any, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderBottom: i < 2 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: ins.comment ? 6 : 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 50,
                          background: '#f0fdf4', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
                        }}>👤</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2e' }}>{ins.user_id ?? 'Гражданин'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            {ins.created_at ? new Date(ins.created_at).toLocaleDateString('ru-RU') : '—'}
                          </div>
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: 50, background: ins.camera_validated ? '#7cee2b' : '#cbd5e1' }} />
                      </div>
                      {ins.comment && (
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45, fontStyle: 'italic', paddingLeft: 40 }}>
                          "{ins.comment}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Community Trust Score */}
              <div style={{ background: '#f0fdf4', borderRadius: 16, padding: '16px 18px', border: '1.5px solid #dcfce7' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>Community Trust Score</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 5 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: '#0d1b2e' }}>{trustScore.toFixed(1)}</span>
                  <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>/ 5.0</span>
                </div>
                <div style={{ fontSize: 11, color: '#166534' }}>
                  Based on {school.promises.length * 12} crowd-sourced verifications this month.
                </div>
              </div>

              {/* Mini map */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <MapContainer
                  center={[school.lat, school.lng]} zoom={15}
                  style={{ height: 160, width: '100%' }}
                  zoomControl={false} scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[school.lat, school.lng]} icon={schoolIcon(school.status)} />
                </MapContainer>
                <div style={{ padding: '8px 12px', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={10} /> {school.lat.toFixed(4)}, {school.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Checks */}
        {tab === 'checks' && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
            История всех проверок появится здесь
          </div>
        )}

        {/* TAB: Analytics */}
        {tab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { label: 'Выполнено',    val: school.promises.filter(p => p.status === 'resolved').length,    color: '#7cee2b', bg: '#f0fdf4' },
              { label: 'В работе',     val: school.promises.filter(p => p.status === 'in-progress').length, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Ожидает',      val: school.promises.filter(p => p.status === 'pending').length,     color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Игнорируется', val: school.promises.filter(p => p.status === 'ignored').length,     color: '#ef4444', bg: '#fef2f2' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 16, padding: '22px 20px', border: `1.5px solid ${item.color}30` }}>
                <div style={{ fontSize: 38, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.val}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 6 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Promise Timeline Modal ── */}
      {selectedPromise && (() => {
        const STEPS = [
          { title: 'Создана',         desc: 'Обращение зарегистрировано в системе', icon: '📋' },
          { title: 'Гос. одобрило',   desc: 'Государственный орган подтвердил обращение', icon: '🏛️' },
          { title: 'Сделано',         desc: 'Работы завершены подрядчиком', icon: '🔨' },
          { title: 'Ждёт проверки',   desc: 'Ожидает проверки гражданами', icon: '👁️' },
          { title: 'Проверено',       desc: 'Подтверждено гражданским сообществом', icon: '✅' },
        ];
        const activeStep = { pending: 1, 'in-progress': 2, resolved: 4, ignored: 0 }[selectedPromise.status] ?? 1;

        return ReactDOM.createPortal(
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,46,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)' }}
            onClick={() => setSelectedPromise(null)}
          >
            <div
              style={{ background: '#f8fafc', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '20px 20px 14px', borderBottom: '1.5px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {school.name_ru}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0d1b2e', lineHeight: 1.3 }}>{selectedPromise.title}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {promiseStatusBadge(selectedPromise.status)}
                      {selectedPromise.amount > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0d1b2e', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                          {(selectedPromise.amount / 1_000_000).toFixed(1)}M сум
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedPromise(null)} style={{
                    width: 34, height: 34, borderRadius: 50, border: 'none',
                    background: '#f1f5f9', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <X size={16} color="#64748b" />
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ padding: '28px 20px 20px', position: 'relative' }}>
                {/* Vertical center line */}
                <div style={{
                  position: 'absolute', left: '50%', top: 28, bottom: 40,
                  width: 2, background: '#e2e8f0', transform: 'translateX(-50%)', zIndex: 0
                }} />

                {STEPS.map((step, i) => {
                  const isDone   = i < activeStep;
                  const isActive = i === activeStep;
                  const isRight  = i % 2 === 0; // card on right side

                  const cardStyle: React.CSSProperties = {
                    background: '#fff',
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: `1.5px solid ${isActive ? '#7cee2b' : isDone ? '#f1f5f9' : '#f1f5f9'}`,
                    boxShadow: isActive ? '0 4px 20px rgba(124,238,43,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                    opacity: !isDone && !isActive ? 0.45 : 1,
                    flex: 1,
                  };

                  const card = (
                    <div style={cardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0d1b2e' }}>{step.title}</span>
                        {isActive && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#7cee2b', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ACTIVE
                          </span>
                        )}
                        {isDone && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#7cee2b' }}>Completed</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{step.desc}</div>
                      {isActive && selectedPromise.deadline && (
                        <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700, marginTop: 5 }}>
                          До {new Date(selectedPromise.deadline).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                  );

                  const circleColor = isDone || isActive ? '#7cee2b' : '#fff';
                  const circleBorder = isDone || isActive ? '#4ade80' : '#e2e8f0';

                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: i < STEPS.length - 1 ? 20 : 0, position: 'relative', zIndex: 1 }}>
                      {/* Left side */}
                      <div style={{ flex: 1, paddingRight: 14 }}>
                        {!isRight ? card : null}
                      </div>

                      {/* Center circle */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 50, flexShrink: 0,
                        background: circleColor,
                        border: `2.5px solid ${circleBorder}`,
                        boxShadow: isActive ? '0 0 0 5px rgba(124,238,43,0.18)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, zIndex: 2, position: 'relative'
                      }}>
                        {step.icon}
                      </div>

                      {/* Right side */}
                      <div style={{ flex: 1, paddingLeft: 14 }}>
                        {isRight ? card : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer CTA */}
              <div style={{ padding: '0 20px 20px' }}>
                <button
                  className="btn btn-primary btn-shine"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { setSelectedPromise(null); onInspect(selectedPromise.id); }}
                >
                  <CameraIcon size={15} /> Проверить это обращение
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </FadeIn>
  );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────

function schoolIcon(status: string) {
  const color = statusColor(status);
  const html = `
    <div style="
      width:38px;height:38px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 3px 10px rgba(0,0,0,0.28);
      display:flex;align-items:center;justify-content:center;
      position:relative;
    ">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="white"/>
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="white" opacity="0.85"/>
      </svg>
    </div>
  `;
  return L.divIcon({ html, className: '', iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -22] });
}

const OBLAST_CENTERS: Record<string, [number, number, number]> = {
  'Toshkent shahar':    [41.299, 69.240, 12],
  'Toshkent viloyati':  [41.05,  69.65,  10],
  "Farg'ona viloyati":  [40.383, 71.783, 12],
  'Samarqand viloyati': [39.649, 66.957, 13],
};

function SchoolMarkers({ schools, onSchoolClick }: { schools: SchoolMapItem[]; onSchoolClick: (s: SchoolMapItem) => void }) {
  const map = useMap();
  return (
    <>
      {schools.map(s => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={schoolIcon(s.status)}
          eventHandlers={{
            click: () => {
              const zoom = map.getZoom();
              const isMobile = window.innerWidth <= 768;
              const popupOffset = isMobile ? 120 : 80;
              const markerPoint = map.project([s.lat, s.lng], zoom);
              const centeredPoint = markerPoint.subtract([0, popupOffset]);
              const centeredLatLng = map.unproject(centeredPoint, zoom);
              map.panTo(centeredLatLng, { animate: true, duration: 0.4 });
            },
          }}
        >
          <Popup autoPan autoPanPaddingTopLeft={[20, 20]} autoPanPaddingBottomRight={[20, 120]}>
            <div style={{ padding: '12px 14px', minWidth: 180, maxWidth: 210 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0d1b2e', lineHeight: 1.35, marginBottom: 5, paddingRight: 20, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.name_ru}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{s.district.replace(' tumani', '')}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {statusBadge(s.status)}
                <span className="badge badge-blue">{s.promise_count} {s.promise_count % 10 === 1 && s.promise_count % 100 !== 11 ? 'обращение' : s.promise_count % 10 >= 2 && s.promise_count % 10 <= 4 && (s.promise_count % 100 < 10 || s.promise_count % 100 >= 20) ? 'обращения' : 'обращений'}</span>
              </div>
              <button
                onClick={() => onSchoolClick(s)}
                style={{
                  width: '100%', padding: '7px 0', borderRadius: 8,
                  background: '#7cee2b', color: '#182210',
                  fontWeight: 700, fontSize: 12, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Перейти →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function FlyToLocation({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 1.2 }); }, [lat, lng, zoom]);
  return null;
}

function UserDot({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  return <Marker position={[lat, lng]} icon={icon} />;
}

function CaptureView({ onSchoolClick }: { onSchoolClick: (s: SchoolMapItem) => void; user: User | null }) {
  const [mapSchools, setMapSchools] = useState<SchoolMapItem[]>([]);
  const [oblast, setOblast] = useState('Toshkent shahar');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [oblastOpen, setOblastOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => { api.getMapSchools(oblast).then(setMapSchools).catch(console.error); }, [oblast]);

  // Auto-request location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setFlyTo({ ...loc, zoom: 14 });
        api.getAllMapSchools().then(setMapSchools).catch(console.error);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLocate = () => {
    if (locating || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setFlyTo({ ...loc, zoom: 14 });
        api.getAllMapSchools().then(setMapSchools).catch(console.error);
        setStatusFilter(null);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const oblastOpts = [
    { key: 'Toshkent shahar',    label: 'Ташкент' },
    { key: 'Toshkent viloyati',  label: 'Таш. обл.' },
    { key: "Farg'ona viloyati",  label: 'Фергана' },
    { key: 'Samarqand viloyati', label: 'Самарканд' },
  ];

  const statusOpts = [
    { key: 'ok',      label: 'Норма',        color: '#22c55e' },
    { key: 'problem', label: 'Проблема',     color: '#ef4444' },
    { key: 'stale',   label: 'Не проверено', color: '#f59e0b' },
  ];

  const [flyLat, flyLng, flyZoom] = OBLAST_CENTERS[oblast];
  const filtered = statusFilter ? mapSchools.filter(s => s.status === statusFilter) : mapSchools;
  const currentOblast = oblastOpts.find(o => o.key === oblast)!;

  const glassBtn: React.CSSProperties = {
    padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    color: '#0d1b2e', transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
    display: 'flex', alignItems: 'center', gap: 6,
  };

  return (
    <div className="map-fullscreen" style={{ position: 'relative', margin: '-20px -24px', height: 'calc(100vh - 64px)' }}>
      <MapContainer
        center={[41.31, 69.25]} zoom={11}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFlyTo lat={flyLat} lng={flyLng} zoom={flyZoom} />
        {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}
        {userLoc && <UserDot lat={userLoc.lat} lng={userLoc.lng} />}
        <SchoolMarkers schools={filtered} onSchoolClick={onSchoolClick} />
      </MapContainer>

      {/* Locate me button — top left */}
      <button
        onClick={handleLocate}
        style={{
          position: 'absolute', top: 14, left: 14, zIndex: 1000,
          padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
          border: 'none', cursor: locating ? 'wait' : 'pointer', fontFamily: 'inherit',
          background: userLoc ? 'rgba(37,99,235,0.92)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          color: userLoc ? '#fff' : '#0d1b2e',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s', whiteSpace: 'nowrap',
          opacity: locating ? 0.7 : 1,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
        {locating ? 'Определяем...' : userLoc ? 'Моя локация' : 'Найти меня'}
      </button>

      {/* Oblast dropdown — top right */}
      {oblastOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => setOblastOpen(false)}
        />
      )}
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 1000 }}>
        <button
          style={glassBtn}
          onClick={() => setOblastOpen(v => !v)}
        >
          {currentOblast.label}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: oblastOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M2 4l4 4 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {oblastOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
            minWidth: 150,
          }}>
            {oblastOpts.map(o => (
              <button
                key={o.key}
                onMouseDown={e => { e.preventDefault(); setOblast(o.key); setOblastOpen(false); }}
                style={{
                  display: 'block', width: '100%', padding: '10px 16px',
                  textAlign: 'left', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  background: oblast === o.key ? '#f0fdf4' : 'transparent',
                  color: oblast === o.key ? '#16a34a' : '#0d1b2e',
                  transition: 'background 0.12s',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status filter pills — bottom right (mobile: above nav) */}
      <div className="map-status-pills" style={{
        position: 'absolute', bottom: 24, right: 14, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end',
      }}>
        {statusOpts.map(o => {
          const active = statusFilter === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setStatusFilter(active ? null : o.key)}
              style={{
                ...glassBtn,
                background: active ? o.color : 'rgba(255,255,255,0.88)',
                color: active ? '#fff' : '#0d1b2e',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.7)' : o.color, flexShrink: 0 }} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── INSPECTION ───────────────────────────────────────────────────────────────

function InspectionView({ school, promiseId, onCancel, onDone }: {
  school: School; promiseId?: string; onCancel: () => void; onDone: (pts?: number) => void;
}) {
  const promise = promiseId ? school.promises.find(p => p.id === promiseId) : school.promises[0];
  const checklist: string[] = Array.isArray(promise?.checklist) && promise.checklist.length > 0
    ? promise.checklist
    : ['Работы выполнены?', 'Соответствует тендеру?', 'Доступно для учеников?'];

  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitInspection({
        school_id: school.id,
        promise_id: promise?.id,
        checklist_answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v ?? false])) as Record<string, boolean>,
        comment,
      });
      setResult((res as any).feedback);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <FadeIn>
        <div style={{ maxWidth: 500, margin: '60px auto' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0d1b2e', marginBottom: 8 }}>
              +{result.points_awarded} очков!
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>{result.message}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              <span className="badge badge-blue">Захват: {result.new_capture_level}/3</span>
              <span className="badge badge-pink">x{result.streak_multiplier} множитель</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 28 }}>
              Публикация через ~{result.publish_in_hours} часов (анонимно)
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onDone(result.points_awarded)}>
              Готово
            </button>
          </div>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0d1b2e', marginBottom: 4 }}>Инспекция</h2>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>{school.name_ru} · {school.district}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}><X size={14} /> Отмена</button>
        </div>

        {promise && (
          <div className="card-blue" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Проверяем обещание</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{promise.title}</div>
          </div>
        )}

        <div className="card-dark" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <CameraIcon size={40} color="#3d5166" />
          <div style={{ fontSize: 13, color: '#3d5166', fontWeight: 600 }}>Камера активна</div>
          <div style={{ fontSize: 11, color: '#2a3f54' }}>GPS: {school.lat.toFixed(4)}, {school.lng.toFixed(4)}</div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1b2e', marginBottom: 16 }}>Чек-лист проверки</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {checklist.map((q, i) => (
              <div key={i} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 14, border: '1.5px solid #f1f5f9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0d1b2e', marginBottom: 10 }}>{q}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setAnswers(p => ({ ...p, [q]: true }))}
                    className={`btn btn-sm ${answers[q] === true ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={13} /> Да
                  </button>
                  <button
                    onClick={() => setAnswers(p => ({ ...p, [q]: false }))}
                    className="btn btn-sm"
                    style={{
                      flex: 1, justifyContent: 'center',
                      background: answers[q] === false ? '#fce7f3' : '#f1f5f9',
                      color: answers[q] === false ? '#db2777' : '#64748b',
                      border: 'none'
                    }}
                  >
                    <X size={13} /> Нет
                  </button>
                </div>
              </div>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)..."
            style={{
              marginTop: 14, width: '100%', background: '#f8fafc',
              border: '1.5px solid #f1f5f9', borderRadius: 12,
              padding: '10px 14px', fontSize: 13, color: '#0d1b2e',
              resize: 'none', outline: 'none', fontFamily: 'inherit'
            }}
            rows={2}
          />

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 12, padding: '12px' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Отправить инспекцию'}
          </button>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── CREATE PROMISE ───────────────────────────────────────────────────────────

function CreatePromiseView({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [form, setForm] = useState({ title: '', description: '', amount: '', deadline: '' });
  const [checklist, setChecklist] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSchoolSearch = async (q: string) => {
    setSchoolQuery(q);
    setSelectedSchool(null);
    if (q.length < 2) { setSchoolResults([]); return; }
    const res = await api.searchSchools(q).catch(() => [] as School[]);
    setSchoolResults(res);
  };

  const addCheckItem    = () => setChecklist(c => [...c, '']);
  const removeCheckItem = (i: number) => setChecklist(c => c.filter((_, idx) => idx !== i));
  const updateCheckItem = (i: number, val: string) =>
    setChecklist(c => c.map((v, idx) => idx === i ? val : v));

  const handleSubmit = async () => {
    if (!selectedSchool) { setError('Выберите школу'); return; }
    if (!form.title.trim()) { setError('Введите название'); return; }
    setError(''); setSubmitting(true);
    try {
      await api.createPromise({
        school_id: selectedSchool.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        source: 'Народный',
        amount: form.amount ? parseInt(form.amount) : undefined,
        deadline: form.deadline || undefined,
        checklist: checklist.filter(c => c.trim()),
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Ошибка при создании');
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 14px', border: '1.5px solid #e8ecf0',
    borderRadius: 14, fontSize: 14, color: '#0d1b2e', background: '#fff',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7, display: 'block',
  };

  const STEPS = ['Школа', 'Детали', 'Чеклист'];

  /* ── Success screen ── */
  if (done) return (
    <FadeIn>
      <div style={{ maxWidth: 440, margin: '32px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '0 16px' }}>
        <div style={{ background: '#0d1b2e', borderRadius: 24, padding: '40px 32px', textAlign: 'center', width: '100%', marginBottom: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 50, background: 'rgba(124,238,43,0.15)', border: '2px solid rgba(124,238,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 34 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Обращение создано!</div>
          <div style={{ fontSize: 13, color: '#5c7a9a', lineHeight: 1.5 }}>
            Обращение по школе <span style={{ color: '#7cee2b', fontWeight: 700 }}>{selectedSchool?.name_ru}</span> зарегистрировано и передано на рассмотрение.
          </div>
        </div>
        <button className="btn btn-primary btn-shine" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={onSuccess}>
          На главную
        </button>
      </div>
    </FadeIn>
  );

  return (
    <FadeIn>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Page header */}
        <div style={{ background: '#0d1b2e', borderRadius: 20, padding: '20px 20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: '#7cee2b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} color="#182210" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>Новое обращение</div>
            <div style={{ fontSize: 12, color: '#5c7a9a', marginTop: 3 }}>Источник: <span style={{ color: '#7cee2b', fontWeight: 700 }}>👥 Народный</span></div>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '4px 0' }}>
          {STEPS.map((s, i) => {
            const isActive = i + 1 === step;
            const isDone   = i + 1 < step;
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 50, fontWeight: 900, fontSize: 13,
                    background: isDone ? '#7cee2b' : isActive ? '#0d1b2e' : '#f1f5f9',
                    color: isDone ? '#182210' : isActive ? '#7cee2b' : '#94a3b8',
                    border: `2px solid ${isDone ? '#4ade80' : isActive ? '#7cee2b' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#0d1b2e' : '#94a3b8', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isDone ? '#7cee2b' : '#f1f5f9', borderRadius: 2, marginTop: 15, marginBottom: 22, minWidth: 20 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: School ── */}
        {step === 1 && (
          <div className="card" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0d1b2e' }}>Выберите школу</div>

            <div style={{ position: 'relative' }}>
              <label style={lbl}>Название или район</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  style={{ ...inp, paddingLeft: 38 }}
                  placeholder="Например: школа №42, Чиланзар…"
                  value={schoolQuery}
                  onChange={e => handleSchoolSearch(e.target.value)}
                />
              </div>

              {schoolResults.length > 0 && !selectedSchool && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                  background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(13,27,46,0.13)',
                  border: '1.5px solid #f1f5f9', overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
                }}>
                  {schoolResults.map(s => (
                    <button key={s.id}
                      onClick={() => { setSelectedSchool(s); setSchoolQuery(s.name_ru); setSchoolResults([]); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e' }}>{s.name_ru}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.district} · {s.oblast}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSchool && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: '#f0fdf4', borderRadius: 14, border: '1.5px solid #bbf7d0' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏫</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSchool.name_ru}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{selectedSchool.district} · {selectedSchool.oblast}</div>
                </div>
                <CheckCircle2 size={20} color="#16a34a" />
              </div>
            )}

            {error && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{error}</div>}

            <button className="btn btn-primary btn-shine"
              style={{ justifyContent: 'center', padding: '14px', opacity: selectedSchool ? 1 : 0.45 }}
              disabled={!selectedSchool}
              onClick={() => { setError(''); setStep(2); }}
            >
              Далее →
            </button>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div className="card" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Selected school banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0fdf4', borderRadius: 12, border: '1.5px solid #bbf7d0', marginBottom: 2 }}>
              <span style={{ fontSize: 16 }}>🏫</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSchool?.name_ru}</span>
            </div>

            <div style={{ fontSize: 16, fontWeight: 900, color: '#0d1b2e', marginBottom: 2 }}>Детали обращения</div>

            <div>
              <label style={lbl}>Название <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inp} placeholder="Например: Сломана система отопления"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div>
              <label style={lbl}>Описание</label>
              <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }}
                placeholder="Подробно опишите проблему — что сломано, где, как давно…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Сумма (сум)</label>
                <input style={inp} type="number" placeholder="необязательно"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Дедлайн</label>
                <input style={inp} type="date"
                  value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Назад</button>
              <button className="btn btn-primary btn-shine"
                style={{ flex: 2, justifyContent: 'center', opacity: form.title.trim() ? 1 : 0.45 }}
                disabled={!form.title.trim()}
                onClick={() => { setError(''); setStep(3); }}
              >Далее →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Checklist ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0d1b2e', marginBottom: 4 }}>Чеклист проверки</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Что граждане будут проверять на месте</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklist.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#16a34a', flexShrink: 0 }}>{i + 1}</div>
                    <input style={{ ...inp, flex: 1, padding: '10px 12px' }}
                      placeholder={`Пункт ${i + 1}…`} value={item}
                      onChange={e => updateCheckItem(i, e.target.value)} />
                    {checklist.length > 1 && (
                      <button onClick={() => removeCheckItem(i)} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addCheckItem} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1.5px dashed #bbf7d0', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#16a34a', fontFamily: 'inherit' }}>
                <Plus size={14} /> Добавить пункт
              </button>
            </div>

            {/* Summary dark card */}
            <div style={{ background: '#0d1b2e', borderRadius: 18, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#5c7a9a', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Итог</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 5, lineHeight: 1.3 }}>{form.title}</div>
              <div style={{ fontSize: 12, color: '#5c7a9a', marginBottom: 10 }}>🏫 {selectedSchool?.name_ru}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(124,238,43,0.12)', color: '#7cee2b', border: '1px solid rgba(124,238,43,0.2)' }}>
                  👥 Народный
                </span>
                {checklist.filter(c => c.trim()).length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(124,238,43,0.12)', color: '#7cee2b', border: '1px solid rgba(124,238,43,0.2)' }}>
                    {checklist.filter(c => c.trim()).length} пунктов чеклиста
                  </span>
                )}
                {form.deadline && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'rgba(124,238,43,0.12)', color: '#7cee2b', border: '1px solid rgba(124,238,43,0.2)' }}>
                    📅 {new Date(form.deadline).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, padding: '0 4px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(2)}>← Назад</button>
              <button className="btn btn-primary btn-shine"
                style={{ flex: 2, justifyContent: 'center', padding: '14px', opacity: submitting ? 0.65 : 1 }}
                disabled={submitting} onClick={handleSubmit}
              >
                {submitting ? 'Отправка…' : <><CheckCircle2 size={16} /> Создать обращение</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </FadeIn>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

function ProfileView({ user }: { user: User | null }) {
  if (!user) return (
    <FadeIn>
      <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Загрузка...</div>
    </FadeIn>
  );

  const xpPct = Math.min(100, Math.round((user.xp / user.xp_next) * 100));
  const SEASON_MAX = 2000;
  const seasonPct = Math.min(100, Math.round((user.points_season / SEASON_MAX) * 100));
  const TIER_THRESHOLDS = [300, 800, 1500, 2500];
  const TIERS = ['T1', 'T2', 'T3', 'T4'];
  const unlockedTiers = TIER_THRESHOLDS.map(t => user.points_total >= t);
  const currentTierIdx = unlockedTiers.filter(Boolean).length;

  const REWARDS = [
    { icon: '👕', name: 'Неон Скин',      pts: 450 },
    { icon: '🛡️', name: 'Exp Буст',       pts: 120 },
    { icon: '❄️', name: 'Заморозка',      pts: 80  },
    { icon: '🔥', name: 'Огненный фрейм', pts: 600 },
  ];

  const BADGE_COLORS = [
    { bg: '#dcfce7', color: '#16a34a' },
    { bg: '#dbeafe', color: '#2563eb' },
    { bg: '#fef3c7', color: '#d97706' },
    { bg: '#fce7f3', color: '#ec4899' },
    { bg: '#f3e8ff', color: '#9333ea' },
  ];

  return (
    <FadeIn>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>

        {/* User card */}
        <div className="card" style={{ padding: '22px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src="https://picsum.photos/seed/anvar/200/200"
                style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }}
                alt="avatar"
              />
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 22, height: 22, borderRadius: 6,
                background: '#ec4899', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Award size={12} color="#fff" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                ID: UX-{(user.id ?? 'demo').slice(0, 4).toUpperCase()}-491
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7cee2b', marginTop: 4 }}>
                Уровень {user.level} · Сезон 4
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
              <span>XP до Уровня {user.level + 1}</span>
              <span style={{ color: '#0d1b2e', fontWeight: 800 }}>{user.xp.toLocaleString()} / {user.xp_next.toLocaleString()}</span>
            </div>
            <div className="progress-track" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #7cee2b, #4ade80)' }} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              flex: 1, padding: '13px 20px',
              background: '#7cee2b', border: 'none', borderRadius: 50,
              fontSize: 14, fontWeight: 800, color: '#0d1b2e', cursor: 'pointer'
            }}>
              Edit Profile
            </button>
            <button style={{
              width: 48, height: 48, flexShrink: 0,
              background: '#f1f5f9', border: 'none', borderRadius: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <Share2 size={18} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Season Progress */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0d1b2e' }}>Season 4 Progress</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Ends in 5 days</div>
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#7cee2b' }}>{user.points_season.toLocaleString()}</span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}> / {SEASON_MAX.toLocaleString()} XP</span>
            </div>
          </div>

          <div className="progress-track" style={{ height: 8, marginBottom: 16 }}>
            <div className="progress-fill" style={{ width: `${seasonPct}%`, background: 'linear-gradient(90deg, #7cee2b, #4ade80)' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {TIERS.map((t, i) => {
              const unlocked = unlockedTiers[i];
              const isCurrent = i === currentTierIdx;
              return (
                <div key={t} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 50,
                    background: unlocked ? '#7cee2b' : isCurrent ? '#f0fdf4' : '#f1f5f9',
                    border: `2.5px solid ${unlocked ? '#4ade80' : isCurrent ? '#7cee2b' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {unlocked
                      ? <CheckCircle2 size={20} color="#0d1b2e" />
                      : isCurrent
                        ? <Star size={18} color="#7cee2b" />
                        : <Shield size={16} color="#cbd5e1" />}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: unlocked ? '#0d1b2e' : isCurrent ? '#7cee2b' : '#94a3b8'
                  }}>{t}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streak stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
              <Zap size={12} color="#f97316" />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Current Streak</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{user.streak}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 2 }}>Days</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7cee2b', marginTop: 8 }}>+2% Efficiency</div>
          </div>
          <div className="card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
              <Star size={12} color="#f59e0b" />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Max Streak</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{user.max_streak}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 2 }}>Days</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>All-time record</div>
          </div>
        </div>

        {/* Total Points — dark block */}
        <div style={{
          background: '#0d1b2e', borderRadius: 20, padding: '22px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5c7a9a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Total Citizen Points
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {user.points_total.toLocaleString('ru-RU')}
            </div>
          </div>
          <div style={{
            width: 54, height: 54, borderRadius: 14,
            background: 'rgba(124,238,43,0.12)',
            border: '1.5px solid rgba(124,238,43,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Award size={26} color="#7cee2b" />
          </div>
        </div>

        {/* District Achievements */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0d1b2e' }}>District Achievements</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7cee2b', cursor: 'pointer' }}>View All</span>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {user.badges.length > 0 ? user.badges.map((b, i) => {
              const colors = BADGE_COLORS[i % BADGE_COLORS.length];
              return (
                <div key={b.id} style={{
                  flexShrink: 0, width: 112, padding: '16px 12px',
                  background: '#fff', borderRadius: 18,
                  border: '1.5px solid #f1f5f9', textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 13, margin: '0 auto 10px',
                    background: colors.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24
                  }}>{b.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.3 }}>{b.title}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.description}</div>
                </div>
              );
            }) : (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: '10px 0' }}>Пока нет достижений</div>
            )}
          </div>
        </div>

        {/* Reward Store */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0d1b2e', marginBottom: 12 }}>Reward Store</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {REWARDS.map((r, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 18, padding: '18px 14px',
                border: '1.5px solid #f1f5f9', textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer'
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, margin: '0 auto 10px',
                  background: '#f0fdf4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26
                }}>{r.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0d1b2e', marginBottom: 6 }}>{r.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Zap size={11} color="#7cee2b" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#7cee2b' }}>{r.pts} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak Freezes */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>❄️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e' }}>Streak Freeze</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Защита от потери стрика</div>
            </div>
          </div>
          <div style={{
            background: '#f0fdf4', borderRadius: 10, padding: '7px 16px',
            fontSize: 16, fontWeight: 900, color: '#0d1b2e'
          }}>x{user.streak_freezes}</div>
        </div>

      </div>
    </FadeIn>
  );
}
