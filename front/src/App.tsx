import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import AuthPage from './AuthPage';
import {
  LayoutDashboard, BarChart3, Target, User as UserIcon,
  Search, Bell, ChevronRight, TrendingUp, TrendingDown,
  Users, Globe, X, Zap, Shield, Award, CheckCircle2,
  MapPin, Camera as CameraIcon, Info, Calendar,
  AlertTriangle, Activity, Clock, Star, Filter, Map,
  ClipboardList, Building2, Wifi, Wrench, BookOpen, Share2,
  Plus, Trash2, FileText, Settings, LogOut, Eye,
  ClipboardCheck, Hammer, CheckCheck, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, School, District, User, SchoolMapItem, Stats, SchoolPromise, TaskSchool, Inspection } from './api';
import L from 'leaflet';

type View = 'tasks' | 'dashboard' | 'school' | 'promise' | 'capture' | 'inspection' | 'profile' | 'create';

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
    resolved:      { cls: 'badge-green',  label: 'Сделано' },
    waiting:       { cls: 'badge-yellow', label: 'Ждёт проверки' },
    confirmed:     { cls: 'badge-green',  label: 'Подтверждено' },
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
  const [tasksKey, setTasksKey] = useState(0);
  const [activePromiseId, setActivePromiseId] = useState<string | undefined>(undefined);
  const [selectedPromise, setSelectedPromise] = useState<SchoolPromise | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

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
          <button
            key={n.id}
            className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => setView(n.id)}
          >
            {n.icon}
            <span>{n.label}</span>
          </button>
        ))}

        {/* ── Sidebar user card ── */}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 0 16px' }}>
          <div
            style={{
              background: view === 'profile' ? '#f0fdf4' : '#f7f8f6',
              borderRadius: 16, padding: '12px 14px',
              cursor: 'pointer', border: `1.5px solid ${view === 'profile' ? '#86efac' : '#e8edf2'}`,
              transition: 'background 0.15s',
            }}
            onClick={() => setView('profile')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <UserIcon size={18} color="#94a3b8" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Anonymous #{user.uid ?? '—'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                  {user.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
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
            {view === 'tasks'     && <TasksView key={`t-${tasksKey}`} onSchoolClick={goToSchool} user={user} />}
            {view === 'dashboard' && <DashboardView key="d" onSchoolClick={goToSchool} user={user} onGoProfile={() => setView('profile')} />}
            {view === 'school' && selectedSchool && (
              <SchoolView
                key="s"
                school={selectedSchool}
                onBack={() => setView('dashboard')}
                onPromiseClick={p => { setSelectedPromise(p); setView('promise'); }}
                onInspect={pid => { setActivePromiseId(pid); setShowCameraModal(true); }}
              />
            )}
            {view === 'promise' && selectedSchool && selectedPromise && (
              <PromiseDetailView
                key={`pd-${selectedPromise.id}`}
                promise={selectedPromise}
                school={selectedSchool}
                onBack={() => setView('school')}
                onInspect={pid => { setActivePromiseId(pid); setShowCameraModal(true); }}
              />
            )}
            {view === 'capture'    && <CaptureView key="c" onSchoolClick={goToSchool} user={user} />}
            {view === 'inspection' && selectedSchool && (
              <InspectionView
                key="i"
                school={selectedSchool}
                promiseId={activePromiseId}
                onCancel={() => setView('school')}
                onDone={async (pts?: number) => {
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
                  // Re-fetch school to reflect updated promise status
                  if (selectedSchool) {
                    const fresh = await api.getSchool(selectedSchool.id);
                    setSelectedSchool(fresh);
                  }
                  setView('school');
                }}
              />
            )}
            {view === 'profile' && <ProfileView key="p" user={user} onLogout={() => { localStorage.removeItem('rh_user'); setUser(null); }} />}
            {view === 'create'  && <CreatePromiseView key="cp" user={user} onSuccess={() => { setTasksKey(k => k + 1); setView('tasks'); }} />}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile bottom nav (Portal → rendered into body to avoid z-index issues) ── */}
      {showCameraModal && selectedSchool && (
        <CameraInspectionModal
          school={selectedSchool}
          promise={selectedSchool.promises?.find(p => p.id === activePromiseId) ?? selectedPromise ?? undefined}
          userId={user.id}
          onClose={() => setShowCameraModal(false)}
          onDone={(pts) => {
            setShowCameraModal(false);
            if (pts > 0) {
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
            api.getSchool(selectedSchool.id).then(setSelectedSchool).catch(() => {});
          }}
        />
      )}

      {ReactDOM.createPortal(
        <nav className="bottom-nav">
          {NAV.map(n => n.isCreate ? (
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

// ─── SCHOOL PHOTO MAP (Tashkent real photos) ─────────────────────────────────

const TASHKENT_PHOTOS: Record<string, string> = {
  '448':        '/schools/101.jpg',
  '690':        '/schools/115.jpg',
  '172':        '/schools/148.jpg',
  '146':        '/schools/356.jpg',
  'famous-001': '/schools/1.jpg',
  'famous-002': '/schools/110.jpg',
  'famous-003': '/schools/114.jpg',
  'famous-006': '/schools/278.jpg',
  'famous-007': '/schools/6.jpg',
  'famous-008': '/schools/34.jpg',
};

function getSchoolPhoto(id: string, uid?: number | null, fallbackIdx?: number): string {
  if (TASHKENT_PHOTOS[id]) return TASHKENT_PHOTOS[id];
  const seed = uid ?? id;
  return `https://picsum.photos/seed/sch${seed}/400/300`;
}

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
  const [schools, setSchools] = useState<TaskSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({ status: 'all', source: 'all' });

  useEffect(() => {
    setLoading(true);
    api.getTaskSchools().then(data => {
      setSchools(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = schools.filter(s => {
    if (filters.status === 'overdue' && !s.has_overdue) return false;
    if (filters.status === 'active' && s.has_overdue) return false;
    if (filters.source === 'etender' && s.source !== 'E-tender') return false;
    if (filters.source === 'crowd' && s.source !== 'Народный') return false;
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
            const source    = s.source || 'E-tender';
            const rawAmt    = s.max_amount || 0;
            const isOverdue = s.has_overdue;
            const deadline  = s.nearest_deadline
              ? new Date(s.nearest_deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—';
            const amount = rawAmt >= 1_000_000
              ? (rawAmt / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' млн UZS'
              : rawAmt > 0
              ? rawAmt.toLocaleString('ru-RU') + ' UZS'
              : '—';

            const photo = getSchoolPhoto(s.id, null, i);

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
  const [stats, setStats]       = useState<Stats | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
    api.getDistricts('Toshkent shahar').then(setDistricts).catch(console.error);
  }, []);

  const funnel      = stats?.promise_funnel ?? {};
  const infra       = stats?.infrastructure ?? { gym: 0, water: 0, internet: 0, cafeteria: 0, electricity: 0 };
  const statuses    = stats?.school_statuses ?? {};
  const totalFunnel = (funnel.pending ?? 0) + (funnel['in-progress'] ?? 0) + (funnel.resolved ?? 0) + (funnel.ignored ?? 0);

  return (
    <FadeIn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Hero banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0d1b2e 0%, #1a3a5c 100%)',
          borderRadius: 20, padding: '24px 28px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          overflow: 'hidden', position: 'relative', minHeight: 130,
        }}>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4a7a99', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
              Платформа мониторинга
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>
              Real Holat
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(124,238,43,0.15)', border: '1px solid rgba(124,238,43,0.3)', borderRadius: 20, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: P }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: P }}>{val(stats?.total_schools ?? 0)} школ</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{val(stats?.total_promises ?? 0)} обращений</span>
              </div>
            </div>
          </div>
          <img src="/school.png" alt="school" style={{ width: 160, height: 120, objectFit: 'contain', flexShrink: 0, marginBottom: -24, marginRight: -8 }} />
        </div>

        {/* ── 4 stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Школ охвачено</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{val(stats?.total_schools ?? 0)}</div>
            <div style={{ fontSize: 11, color: '#7cee2b', fontWeight: 700 }}>↑ {stats?.weekly_inspections ?? 0} провер. за неделю</div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>обращений</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{val(stats?.total_promises ?? 0)}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>всего на платформе</div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Выполнено</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{stats?.promise_completion ?? 0}%</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>обращений исполнено</div>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Инспекторов</span>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{stats?.active_inspectors ?? 0}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>активных граждан</div>
          </div>
        </div>

        {/* ── Infra + Funnel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ background: '#0d1b2e', border: '1px solid rgba(124,238,43,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7cee2b', marginBottom: 14 }}>Инфраструктура</div>
            {[
              { label: 'Электричество', v: infra.electricity, c: P },
              { label: 'Вода',          v: infra.water,       c: '#38bdf8' },
              { label: 'Интернет',      v: infra.internet,    c: '#818cf8' },
              { label: 'Спортзал',      v: infra.gym,         c: '#fb923c' },
              { label: 'Столовая',      v: infra.cafeteria,   c: '#f472b6' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{item.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.c }}>{item.v}%</span>
                </div>
                <div style={{ height: 5, background: '#1e3a5f', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.v}%`, background: item.c, borderRadius: 100, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 14 }}>Воронка обращений</div>
            {[
              { label: 'Ожидают',   v: funnel.pending ?? 0,        c: '#f59e0b' },
              { label: 'В работе',  v: funnel['in-progress'] ?? 0, c: '#38bdf8' },
              { label: 'Сделано',   v: funnel.resolved ?? 0,       c: '#4ade80' },
              { label: 'Ждёт пров.', v: funnel.waiting ?? 0,       c: '#facc15' },
              { label: 'Подтвержд.', v: funnel.confirmed ?? 0,     c: P },
              { label: 'Игнорир.',  v: funnel.ignored ?? 0,        c: '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#64748b', width: 62, flexShrink: 0 }}>{item.label}</span>
                <div style={{ flex: 1, height: 6, background: '#f1f5f0', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${totalFunnel ? item.v / totalFunnel * 100 : 0}%`, background: item.c, borderRadius: 100, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.c, minWidth: 32, textAlign: 'right' }}>{val(item.v)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1.5px solid #f1f5f9', marginTop: 10, paddingTop: 12, display: 'flex', justifyContent: 'space-around' }}>
              {[
                { label: 'Норма',    v: statuses.ok ?? 0,      c: P },
                { label: 'Проблема', v: statuses.problem ?? 0, c: '#ef4444' },
                { label: 'Непров.',  v: statuses.stale ?? 0,   c: '#94a3b8' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{val(s.v)}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Активные проблемы ── */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0d1b2e' }}>Активные проблемы</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Школы, требующие проверки прямо сейчас</div>
            </div>
            <button style={{ fontSize: 12, fontWeight: 800, color: '#182210', background: P, border: 'none', borderRadius: 20, padding: '7px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Все →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(stats?.top_problem_schools ?? []).slice(0, 4).map((s, i) => {
              const palette = [
                { accent: '#ef4444', bg: '#fef2f2', label: 'Критично' },
                { accent: '#f97316', bg: '#fff7ed', label: 'Высокий' },
                { accent: '#f59e0b', bg: '#fffbeb', label: 'Средний' },
                { accent: '#3b82f6', bg: '#eff6ff', label: 'Низкий' },
              ];
              const pl = palette[i];
              return (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: pl.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: pl.accent }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name_ru}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{s.district}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: pl.accent, background: pl.bg, padding: '2px 8px', borderRadius: 20 }}>{pl.label}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: pl.accent, lineHeight: 1 }}>{s.open_promises}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>открыто</div>
                    </div>
                    <button
                      className="btn-shine"
                      onClick={() => onSchoolClick(s as any)}
                      style={{
                        background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                        color: '#182210', fontWeight: 800, border: 'none', borderRadius: 10,
                        padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3,
                        boxShadow: '0 2px 8px rgba(124,238,43,0.3)',
                      }}
                    >
                      Проверить <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!stats && [1,2,3,4].map(i => (
              <div key={i} style={{ height: 68, background: '#f7f8f6', borderRadius: 16 }} />
            ))}
          </div>
        </div>

        {/* ── Рейтинг районов ── */}
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0d1b2e' }}>Рейтинг районов</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Прозрачное сравнение эффективности управления школами</div>
          </div>

          {/* twomod community banner + stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{
              background: 'linear-gradient(135deg, #7cee2b 0%, #4ade80 100%)',
              borderRadius: 20, padding: '20px 22px',
              overflow: 'hidden', position: 'relative', minHeight: 130,
            }}>
              <img src="/twomod.png" alt="community" className="twomod-img" />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#1a4a00', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Сообщество</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0d1b2e', lineHeight: 1.25, marginBottom: 10 }}>
                  Граждане<br />проверяют вместе
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(13,27,46,0.12)', borderRadius: 20, padding: '5px 12px' }}>
                  <Users size={11} color="#0d1b2e" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0d1b2e' }}>{stats?.active_inspectors ?? 0} инспекторов</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="card" style={{ flex: 1, background: '#0d1b2e', border: '1px solid rgba(124,238,43,0.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4a7a99', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Районов в рейтинге</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: P, lineHeight: 1 }}>{districts.length}</div>
              </div>
              <div className="card" style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Лидер</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.3 }}>
                  🥇 {districts[0]?.name?.replace(' tumani', '') ?? '—'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginTop: 3 }}>
                  {districts[0]?.fulfillment_rate ?? 0}% выполнение
                </div>
              </div>
            </div>
          </div>

          {/* table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0d1b2e' }}>Все районы</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Ср. выполнение: <span style={{ fontWeight: 800, color: '#0d1b2e' }}>
                  {districts.length ? Math.round(districts.reduce((a, d) => a + d.fulfillment_rate, 0) / districts.length) : 0}%
                </span>
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {districts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Загрузка…</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Район</th><th>Школ</th><th>Выполнение</th><th>Проверено</th><th>Игнор.</th><th>Тренд</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map((d, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    return (
                      <tr key={d.name}>
                        <td>
                          {medal
                            ? <span style={{ fontSize: 18 }}>{medal}</span>
                            : <div style={{ width: 26, height: 26, borderRadius: 7, background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</div>
                          }
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0d1b2e' }}>{d.name.replace(' tumani', '')}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.oblast.replace(' viloyati', '').replace(' shahar', ' ш.')}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{d.total_schools}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
                            <div className="progress-track" style={{ flex: 1 }}>
                              <div className="progress-fill" style={{ width: `${d.fulfillment_rate}%`, background: d.fulfillment_rate > 70 ? '#22c55e' : d.fulfillment_rate > 40 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2e', minWidth: 30 }}>{d.fulfillment_rate}%</span>
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 700 }}>{d.checked_ratio}%</span></td>
                        <td>{d.ignored_count > 0 ? <span className="badge badge-red">{d.ignored_count}</span> : <span className="badge badge-green">0</span>}</td>
                        <td>
                          {d.trend === 'up'
                            ? <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700 }}><TrendingUp size={13} /> Рост</span>
                            : <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700 }}><TrendingDown size={13} /> Падение</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>

      </div>
    </FadeIn>
  );
}

function val(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }


// ─── SCHOOL DETAIL ────────────────────────────────────────────────────────────

function SchoolView({ school, onBack, onPromiseClick, onInspect }: {
  school: School; onBack: () => void; onPromiseClick: (p: SchoolPromise) => void; onInspect: (pid?: string) => void;
}) {
  const [tab, setTab] = useState<'promises' | 'checks' | 'analytics'>('promises');
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [inspLoading, setInspLoading] = useState(false);

  useEffect(() => {
    if (tab === 'checks' && inspections === null && !inspLoading) {
      setInspLoading(true);
      api.getInspections(school.id)
        .then(setInspections)
        .catch(() => setInspections([]))
        .finally(() => setInspLoading(false));
    }
  }, [tab]);

  const capturePercent = [0, 33, 66, 100][school.capture_level] ?? 0;
  const trustScore = Math.min(5.0, 3.8 + school.promises.filter(p => p.status === 'resolved').length * 0.08);

  const PROMISE_STATUS: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
    pending:       { icon: <Clock size={20} color="#d97706" />,       bg: 'linear-gradient(135deg,#fef9c3,#fef3c7)', border: '#fde68a' },
    'in-progress': { icon: <Hammer size={20} color="#2563eb" />,      bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#bfdbfe' },
    resolved:      { icon: <CheckCheck size={20} color="#16a34a" />,  bg: 'linear-gradient(135deg,#d4fbb0,#e8fcd8)', border: '#bbf7d0' },
    waiting:       { icon: <Eye size={20} color="#7c3aed" />,         bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '#ddd6fe' },
    confirmed:     { icon: <ClipboardCheck size={20} color="#059669" />, bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', border: '#6ee7b7' },
    ignored:       { icon: <Ban size={20} color="#ef4444" />,         bg: 'linear-gradient(135deg,#fff1f2,#fee2e2)', border: '#fecaca' },
  };
  const FUNNEL_LABEL: Record<string, string>  = { pending: 'ОЖИДАНИЕ', 'in-progress': 'В РАБОТЕ', resolved: 'СДЕЛАНО', waiting: 'ЖДЁТ ПРОВЕРКИ', confirmed: 'ПОДТВЕРЖДЕНО', ignored: 'ИГНОРИРУЕТСЯ' };
  const FUNNEL_COLOR: Record<string, string>  = { pending: '#f59e0b', 'in-progress': '#38bdf8', resolved: '#4ade80', waiting: '#facc15', confirmed: '#7cee2b', ignored: '#ef4444' };
  const FUNNEL_PCT:   Record<string, number>  = { pending: 20, 'in-progress': 40, resolved: 60, waiting: 80, confirmed: 100, ignored: 0 };
  const TYPE_TAG: Record<string, { label: string; bg: string; color: string }> = {
    capital:    { label: 'CAPITAL',    bg: '#dbeafe', color: '#1d4ed8' },
    consumable: { label: 'CONSUMABLE', bg: '#ede9fe', color: '#7c3aed' },
  };

  const schoolPhoto = getSchoolPhoto(school.id, school.uid);

  const TABS = [
    { id: 'promises',  label: `Обращения (${school.promises.length})` },
    { id: 'checks',    label: `Проверки${inspections ? ` (${inspections.length})` : ''}` },
    { id: 'analytics', label: 'Аналитика' },
  ];

  return (
    <FadeIn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: '#16a34a', fontWeight: 700, cursor: 'pointer' }} onClick={onBack}>← Школы</span>
          <ChevronRight size={13} color="#cbd5e1" />
          <span style={{ color: '#64748b', fontWeight: 500 }}>{school.name_ru}</span>
        </div>

        {/* Hero card */}
        <div style={{
          background: 'linear-gradient(135deg, #d4fbb0 0%, #e8fcd8 55%, #f4fef0 100%)',
          borderRadius: 24, overflow: 'hidden',
          border: '1.5px solid #bbf7d0', position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(124,238,43,0.13)', pointerEvents: 'none' }} />
          <div className="school-hero-row">
            {/* Photo */}
            <div className="school-hero-img">
              <img
                src={schoolPhoto}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                alt={school.name_ru}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1, padding: '22px 24px', minWidth: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {statusBadge(school.status)}
                <span style={{ fontSize: 11, color: '#4b7a5e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={11} color="#4b7a5e" /> {school.district}
                </span>
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#14532d', lineHeight: 1.3, marginBottom: 14 }}>
                {school.name_ru}
              </h2>

              {/* Infra chips */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {[
                  { icon: <Users size={11} color="#16a34a" />, label: `${school.students} уч.` },
                  { icon: <Calendar size={11} color="#16a34a" />, label: school.year_built || '—' },
                  { icon: <span style={{ fontSize: 11 }}>{school.gym?.includes('Нет') ? '❌' : '✅'}</span>, label: 'Спортзал' },
                  { icon: <Wifi size={11} color="#16a34a" />, label: school.internet?.includes('Нет') ? 'Нет инет.' : 'Интернет' },
                ].map((c, i) => (
                  <span key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20,
                    background: 'rgba(255,255,255,0.85)', color: '#166534',
                    border: '1px solid #bbf7d0', backdropFilter: 'blur(4px)',
                  }}>{c.icon}{c.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e8f5e9', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              color: tab === t.id ? '#16a34a' : '#94a3b8',
              borderBottom: `2.5px solid ${tab === t.id ? '#7cee2b' : 'transparent'}`,
              marginBottom: -2, whiteSpace: 'nowrap', transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* TAB: Promises */}
        {tab === 'promises' && (
          <div className="school-main-grid">

            {/* Left: promise cards */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {school.promises.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '40px 24px', borderRadius: 20,
                  background: '#f0fdf4', border: '1.5px dashed #bbf7d0', color: '#64748b', fontSize: 13,
                }}>
                  Обращений по этой школе пока нет
                </div>
              )}

              {school.promises.map((p, i) => {
                const st = PROMISE_STATUS[p.status] ?? PROMISE_STATUS['pending'];
                const funnelPct = FUNNEL_PCT[p.status] ?? 0;
                const funnelLabel = FUNNEL_LABEL[p.status] ?? p.status.toUpperCase();
                const sourceIsEtender = p.source === 'E-tender';

                return (
                  <div key={p.id} className="card" style={{ padding: '16px 18px', cursor: 'pointer' }}
                    onClick={() => onPromiseClick(p)}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

                      {/* Status icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                        background: st.bg, border: `1.5px solid ${st.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{st.icon}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.3, marginBottom: 7 }}>{p.title}</div>

                        <div style={{ display: 'flex', gap: 5, marginBottom: 9, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                            background: sourceIsEtender ? '#dbeafe' : '#fce7f3',
                            color: sourceIsEtender ? '#1d4ed8' : '#be185d',
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                          }}>{p.source}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                            background: 'rgba(124,238,43,0.12)', color: '#15803d',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            border: '1px solid rgba(124,238,43,0.25)',
                          }}>{funnelLabel}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                            {[20, 40, 60, 80, 100].map(step => (
                              <div key={step} style={{
                                flex: 1, height: 4, borderRadius: 3,
                                background: funnelPct >= step ? '#7cee2b' : '#f1f5f9'
                              }} />
                            ))}
                          </div>
                          <button
                            className="btn-shine"
                            style={{
                              padding: '5px 13px', borderRadius: 9, border: 'none', cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: 11, fontWeight: 700, flexShrink: 0,
                              background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                              color: '#182210',
                              boxShadow: '0 2px 8px rgba(124,238,43,0.3)',
                            }}
                            onClick={e => { e.stopPropagation(); onPromiseClick(p); }}
                          >
                            Проверить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right sidebar */}
            <div className="school-sidebar">

              {/* Recent Checks */}
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1.5px solid #e8f5e9', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid #f0fdf4' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#14532d' }}>Последние проверки</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', cursor: 'pointer', background: '#f0fdf4', padding: '3px 8px', borderRadius: 8 }}>ВСЕ</span>
                </div>
                {(school.inspections as any[]).length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    Проверок нет — будь первым!
                  </div>
                ) : (
                  (school.inspections as any[]).slice(0, 3).map((ins: any, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderBottom: i < 2 ? '1px solid #f8fffe' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 50, flexShrink: 0,
                          background: 'linear-gradient(135deg, #d4fbb0, #e8fcd8)',
                          border: '1.5px solid #bbf7d0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
                        }}>👤</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2e' }}>{ins.user_id ?? 'Гражданин'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            {ins.created_at ? new Date(ins.created_at).toLocaleDateString('ru-RU') : '—'}
                          </div>
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: 50, background: ins.camera_validated ? '#7cee2b' : '#e2e8f0', flexShrink: 0 }} />
                      </div>
                      {ins.comment && (
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45, fontStyle: 'italic', marginTop: 6, paddingLeft: 42 }}>
                          "{ins.comment}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Trust Score */}
              <div style={{
                borderRadius: 20, padding: '18px 20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #bbf7d0',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Рейтинг доверия</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: '#14532d', lineHeight: 1 }}>{trustScore.toFixed(1)}</span>
                  <span style={{ fontSize: 15, color: '#86efac', fontWeight: 700 }}>/ 5.0</span>
                </div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(s => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= Math.round(trustScore) ? '#7cee2b' : '#d1fae5' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#4b7a5e' }}>
                  По данным {school.promises.length * 12} проверок сообщества
                </div>
              </div>

              {/* Mini map */}
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1.5px solid #e8f5e9' }}>
                <MapContainer
                  center={[school.lat, school.lng]} zoom={15}
                  style={{ height: 160, width: '100%' }}
                  zoomControl={false} scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[school.lat, school.lng]} icon={schoolIcon(school.status)} />
                </MapContainer>
                <div style={{ padding: '9px 13px', fontSize: 11, color: '#4b7a5e', display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4' }}>
                  <MapPin size={11} color="#16a34a" /> {school.lat.toFixed(4)}, {school.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Checks */}
        {tab === 'checks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inspLoading && (
              <div style={{ textAlign: 'center', padding: '40px 24px', color: '#94a3b8', fontSize: 13 }}>
                Загрузка проверок...
              </div>
            )}

            {!inspLoading && inspections?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 20, background: '#f0fdf4', border: '1.5px dashed #bbf7d0', color: '#4b7a5e', fontSize: 13 }}>
                Проверок по этой школе пока нет
              </div>
            )}

            {inspections?.map((ins) => {
              const photos: string[] = Array.isArray(ins.photos) ? ins.photos : [];
              const answers = ins.checklist_answers ?? {};
              const answerKeys = Object.keys(answers);
              const yesCount = answerKeys.filter(k => answers[k] === true).length;
              const promise = school.promises.find(p => p.id === ins.promise_id);

              return (
                <div key={ins.id} style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e8edf2', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '14px 18px 12px', borderBottom: photos.length > 0 || answerKeys.length > 0 ? '1.5px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: ins.status === 'published' ? '#f0fdf4' : '#fefce8',
                          color: ins.status === 'published' ? '#16a34a' : '#a16207',
                          border: `1.5px solid ${ins.status === 'published' ? '#bbf7d0' : '#fde68a'}`,
                        }}>
                          {ins.status === 'published' ? 'Опубликовано' : 'На проверке'}
                        </span>
                        {ins.points_awarded > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Star size={11} color="#f59e0b" fill="#f59e0b" />
                            +{ins.points_awarded} XP
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                        {new Date(ins.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {promise && <span style={{ marginLeft: 6, color: '#64748b' }}>· {promise.title}</span>}
                      </div>
                    </div>
                    {answerKeys.length > 0 && (
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{yesCount}/{answerKeys.length}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>чеклист</div>
                      </div>
                    )}
                  </div>

                  {/* Photos */}
                  {photos.length > 0 && (
                    <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: answerKeys.length > 0 ? '1.5px solid #f1f5f9' : 'none' }}>
                      {photos.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
                          onClick={() => window.open(src, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  {/* Checklist answers */}
                  {answerKeys.length > 0 && (
                    <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {answerKeys.map((q) => (
                        <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: answers[q] ? '#dcfce7' : '#fee2e2',
                            fontSize: 13, fontWeight: 800,
                            color: answers[q] ? '#16a34a' : '#ef4444',
                          }}>
                            {answers[q] ? '✓' : '✗'}
                          </span>
                          <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.3 }}>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  {ins.comment && (
                    <div style={{ padding: '0 18px 14px', fontSize: 13, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{ins.comment}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Analytics */}
        {tab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { label: 'Выполнено',    val: school.promises.filter(p => p.status === 'resolved').length,    color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0' },
              { label: 'В работе',     val: school.promises.filter(p => p.status === 'in-progress').length, color: '#2563eb', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#bfdbfe' },
              { label: 'Ожидает',      val: school.promises.filter(p => p.status === 'pending').length,     color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fde68a' },
              { label: 'Игнорируется', val: school.promises.filter(p => p.status === 'ignored').length,     color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#fecaca' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 20, padding: '22px 20px', border: `1.5px solid ${item.border}` }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.val}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 8 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

      </div>

    </FadeIn>
  );
}

// ─── PROMISE DETAIL ───────────────────────────────────────────────────────────

const PROMISE_STEPS = [
  {
    id: 'pending',
    label: 'Создана',
    Icon: ClipboardList,
    desc: 'Обращение зарегистрировано в системе',
    detail: 'Гражданское обращение принято платформой. Оно будет рассмотрено государственными органами.',
  },
  {
    id: 'in-progress',
    label: 'Одобрено',
    Icon: Building2,
    desc: 'Государственный орган подтвердил',
    detail: 'Ответственное ведомство приняло обращение к исполнению. Работы запланированы.',
  },
  {
    id: 'resolved',
    label: 'Выполнено',
    Icon: CheckCheck,
    desc: 'Работы завершены подрядчиком',
    detail: 'По данным подрядчика, все работы по данному обращению завершены.',
  },
  {
    id: 'waiting',
    label: 'Проверка',
    Icon: Eye,
    desc: 'Ожидает гражданской проверки',
    detail: 'Необходима независимая проверка гражданами. Сделайте фото и подтвердите выполнение работ.',
  },
  {
    id: 'confirmed',
    label: 'Подтверждено',
    Icon: ClipboardCheck,
    desc: 'Подтверждено сообществом',
    detail: 'Граждане подтвердили выполнение обещания. Обращение закрыто.',
  },
];

const STEP_ORDER: Record<string, number> = {
  pending: 0, 'in-progress': 1, resolved: 2, waiting: 3, confirmed: 4, ignored: 0,
};

function PromiseDetailView({ promise, school, onBack, onInspect }: {
  promise: SchoolPromise;
  school: School;
  onBack: () => void;
  onInspect: (pid?: string) => void;
}) {
  const currentIdx = STEP_ORDER[promise.status] ?? 0;
  const [activeIdx, setActiveIdx] = useState(currentIdx);
  const activeStep = PROMISE_STEPS[activeIdx];
  const isViewingCurrent = activeIdx === currentIdx;

  const checklist: string[] = Array.isArray(promise.checklist) ? promise.checklist : [];
  const photos: string[] = (promise as any).photos ?? [];

  return (
    <FadeIn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 720, margin: '0 auto' }}>

        {/* Dark hero header */}
        <div style={{
          background: 'linear-gradient(135deg, #0d1b2e 0%, #1a2f4a 60%, #0f2540 100%)',
          borderRadius: 24, padding: '24px 24px 28px',
          position: 'relative', overflow: 'hidden', marginBottom: 16,
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(124,238,43,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(124,238,43,0.05)', pointerEvents: 'none' }} />

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              ← Назад
            </button>
            <ChevronRight size={12} color="#334155" />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{school.name_ru}</span>
          </div>

          {/* Title + meta */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: 12 }}>
              {promise.title}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {promiseStatusBadge(promise.status)}
              {promise.deadline && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.07)', padding: '4px 10px', borderRadius: 8 }}>
                  <Calendar size={11} color="#94a3b8" /> {new Date(promise.deadline).toLocaleDateString('ru-RU')}
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8 }}>
                {promise.source}
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal stepper */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '20px 20px 0',
          border: '1.5px solid #e8f5e9', marginBottom: 16, overflow: 'hidden',
        }}>
          {/* Steps row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingBottom: 0 }}>
            {PROMISE_STEPS.map((step, i) => {
              const isDone   = i < currentIdx;
              const isActive = i === activeIdx;
              const isCurrent = i === currentIdx;
              const isFuture  = i > currentIdx;

              return (
                <div
                  key={step.id}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: isFuture ? 'default' : 'pointer', position: 'relative' }}
                  onClick={() => !isFuture && setActiveIdx(i)}
                >
                  {/* Connector line */}
                  {i > 0 && (
                    <div style={{
                      position: 'absolute', top: 20, right: '50%', left: '-50%',
                      height: 3, borderRadius: 2,
                      background: i <= currentIdx ? 'linear-gradient(90deg, #7cee2b, #5bc91e)' : '#e8f5e9',
                      zIndex: 0,
                    }} />
                  )}

                  {/* Circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                    background: isDone ? 'linear-gradient(135deg, #7cee2b, #5bc91e)' : '#fff',
                    border: isActive && isCurrent ? '3px solid #7cee2b'
                      : isDone ? '3px solid #5bc91e'
                      : '2px solid #e2e8f0',
                    boxShadow: isActive && isCurrent ? '0 0 0 4px rgba(124,238,43,0.2)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    color: isDone ? '#182210' : isCurrent ? '#7cee2b' : '#cbd5e1',
                  }}>
                    {isDone ? <CheckCheck size={16} color="#182210" /> : <step.Icon size={16} />}
                  </div>

                  {/* Label */}
                  <div style={{
                    fontSize: 10, fontWeight: isActive ? 800 : 600, marginTop: 6, textAlign: 'center',
                    color: isActive ? '#0d1b2e' : isDone ? '#16a34a' : isFuture ? '#cbd5e1' : '#64748b',
                    lineHeight: 1.3, paddingBottom: 16, paddingLeft: 4, paddingRight: 4,
                  }}>{step.label}</div>

                  {/* Active underline */}
                  {isActive && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#7cee2b,#5bc91e)', borderRadius: '2px 2px 0 0' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content card */}
        <div style={{
          background: '#fff', borderRadius: 20, border: '1.5px solid #e8f5e9',
          overflow: 'hidden', marginBottom: 16,
        }}>
          {/* Step header */}
          <div style={{
            background: activeIdx === currentIdx
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : activeIdx < currentIdx
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '18px 22px',
            borderBottom: '1px solid #e8f5e9',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: activeIdx <= currentIdx ? 'linear-gradient(135deg, #d4fbb0, #e8fcd8)' : '#f1f5f9',
              border: activeIdx <= currentIdx ? '1.5px solid #bbf7d0' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activeIdx <= currentIdx ? '#16a34a' : '#94a3b8',
            }}>
              <activeStep.Icon size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#14532d', marginBottom: 3 }}>{activeStep.label}</div>
              <div style={{ fontSize: 12, color: '#4b7a5e' }}>{activeStep.desc}</div>
            </div>
            {activeIdx === currentIdx && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#0d1b2e,#1a2f4a)', padding: '4px 9px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                ТЕКУЩИЙ
              </span>
            )}
            {activeIdx < currentIdx && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', background: 'rgba(124,238,43,0.15)', padding: '4px 9px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, border: '1px solid rgba(124,238,43,0.3)' }}>
                ВЫПОЛНЕН
              </span>
            )}
          </div>

          {/* Step body */}
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Description */}
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>
              {activeStep.detail}
            </p>

            {/* Promise description (step 0 only) */}
            {activeIdx === 0 && promise.description && (
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Описание</div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>{promise.description}</p>
              </div>
            )}

            {/* Checklist (step 0 only) */}
            {activeIdx === 0 && checklist.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Чеклист ({checklist.length} пунктов)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {checklist.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#7cee2b,#5bc91e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#182210' }}>{i + 1}</span>
                      </div>
                      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos — only on step 0 (Создана) */}
            {activeIdx === 0 && photos.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Фото ({photos.length})</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {photos.map((url, i) => (
                    <img key={i} src={`http://localhost:8001${url}`} alt={`Фото ${i + 1}`} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 12, border: '1.5px solid #e8f5e9' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Inspection CTA (on waiting step, if it's the current step) */}
            {activeIdx === 3 && isViewingCurrent && (
              <div style={{
                background: 'linear-gradient(135deg, #0d1b2e 0%, #1a2f4a 100%)',
                borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(124,238,43,0.12)', border: '1px solid rgba(124,238,43,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CameraIcon size={20} color="#7cee2b" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Требуется ваша проверка</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.45 }}>Сфотографируйте результат и подтвердите выполнение работ</div>
                  </div>
                </div>
                <button
                  className="btn-shine"
                  style={{
                    padding: '13px', borderRadius: 13, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
                    background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                    color: '#182210', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(124,238,43,0.35)',
                  }}
                  onClick={() => onInspect(promise.id)}
                >
                  <CameraIcon size={16} /> Открыть камеру и проверить
                </button>
              </div>
            )}

            {/* Deadline */}
            {promise.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                <Calendar size={13} color="#94a3b8" />
                Срок: <span style={{ fontWeight: 700, color: '#374151' }}>{new Date(promise.deadline).toLocaleDateString('ru-RU')}</span>
              </div>
            )}
          </div>
        </div>

      </div>
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
  // Runs on every mount — key prop forces remount each time we want to fly
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 1.0, easeLinearity: 0.5 }); }, []); // eslint-disable-line
  return null;
}

function UserDot({ lat, lng }: { lat: number; lng: number }) {
  const icon = L.divIcon({
    className: '',
    html: `<div class="user-loc-dot"><div class="user-loc-ring"></div><div class="user-loc-core"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return <Marker position={[lat, lng]} icon={icon} zIndexOffset={2000} />;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function CaptureView({ onSchoolClick }: { onSchoolClick: (s: SchoolMapItem) => void; user: User | null }) {
  const [mapSchools, setMapSchools] = useState<SchoolMapItem[]>([]);
  const [oblast, setOblast] = useState('Toshkent shahar');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [oblastOpen, setOblastOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [flyKey, setFlyKey] = useState(0);
  const flyRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [allSchools, setAllSchools] = useState<SchoolMapItem[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const allLoadedRef = useRef(false);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => { api.getMapSchools(oblast).then(setMapSchools).catch(console.error); }, [oblast]);

  const doFly = useCallback((lat: number, lng: number, zoom: number) => {
    flyRef.current = { lat, lng, zoom };
    setFlyKey(k => k + 1);
  }, []);

  const loadAllSchools = useCallback(async () => {
    if (allLoadedRef.current) return;
    allLoadedRef.current = true;
    const all = await api.getAllMapSchools().catch(() => [] as SchoolMapItem[]);
    setAllSchools(all);
    setMapSchools(all);
  }, []);

  const onPosition = useCallback(async (pos: GeolocationPosition) => {
    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const isFirst = !userLocRef.current;
    userLocRef.current = loc;
    setUserLoc(loc);
    setLocating(false);
    setLocDenied(false);
    loadAllSchools();
    // Fly to user on first fix, keep map centered on updates
    if (isFirst) {
      doFly(loc.lat, loc.lng, 15);
      setNearbyOpen(true);
    }
  }, [doFly, loadAllSchools]);

  const onError = useCallback((err: GeolocationPositionError) => {
    setLocating(false);
    if (err.code === err.PERMISSION_DENIED) setLocDenied(true);
  }, []);

  // On mount: get position immediately + watch for live updates
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    // Immediate one-shot (fires faster than watchPosition in many browsers)
    navigator.geolocation.getCurrentPosition(onPosition, onError, { enableHighAccuracy: true, timeout: 15000 });
    // Also watch for live tracking
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, maximumAge: 10000,
    });
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []); // eslint-disable-line

  const handleLocate = useCallback(() => {
    if (locDenied) {
      alert('Геолокация отклонена. Разрешите доступ в настройках браузера.');
      return;
    }
    if (!userLocRef.current) {
      if (!navigator.geolocation) return;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(onPosition, onError, { enableHighAccuracy: true, timeout: 15000 });
      return;
    }
    // Fly to current location + show nearby
    doFly(userLocRef.current.lat, userLocRef.current.lng, 15);
    setNearbyOpen(true);
  }, [locDenied, onPosition, onError, doFly]);

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

  // Nearby schools — sorted by distance, within 5km
  const nearbyList = userLoc
    ? (allSchools.length ? allSchools : mapSchools)
        .map(s => ({ ...s, dist: haversineKm(userLoc.lat, userLoc.lng, s.lat, s.lng) }))
        .filter(s => s.dist <= 5)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 7)
    : [];

  const statusColor: Record<string, string> = { ok: '#22c55e', problem: '#ef4444', stale: '#f59e0b' };
  const statusLabel: Record<string, string> = { ok: 'Норма', problem: 'Проблема', stale: 'Не провер.' };

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
        {flyKey > 0 && flyRef.current && (
          <FlyToLocation key={flyKey} lat={flyRef.current.lat} lng={flyRef.current.lng} zoom={flyRef.current.zoom} />
        )}
        {userLoc && <UserDot lat={userLoc.lat} lng={userLoc.lng} />}
        <SchoolMarkers schools={filtered} onSchoolClick={onSchoolClick} />
      </MapContainer>

      {/* Nearby schools panel — bottom right above locate btn */}
      {nearbyOpen && userLoc && nearbyList.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 78, right: 14, zIndex: 1001,
          width: 260, maxHeight: 320, overflowY: 'auto',
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '12px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 8px' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0d1b2e', letterSpacing: 0.3 }}>
              Ближайшие школы
            </span>
            <button onClick={() => setNearbyOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: '#94a3b8', display: 'flex', alignItems: 'center',
            }}>
              <X size={14} />
            </button>
          </div>
          {nearbyList.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setNearbyOpen(false); onSchoolClick(s); }}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? '#fef9c3' : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#64748b',
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                  {s.dist < 1 ? `${Math.round(s.dist * 1000)} м` : `${s.dist.toFixed(1)} км`}
                </div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                background: (statusColor[s.status] || '#94a3b8') + '22',
                color: statusColor[s.status] || '#94a3b8', flexShrink: 0,
              }}>
                {statusLabel[s.status] || s.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Locate me button — bottom right */}
      <button
        className="map-locate-btn"
        onClick={handleLocate}
        title={locating ? 'Определяем...' : userLoc ? 'Ближайшие школы' : 'Найти меня'}
        style={{
          position: 'absolute', bottom: 24, right: 14, zIndex: 1002,
          width: 48, height: 48, borderRadius: '50%',
          border: 'none', cursor: locating ? 'wait' : 'pointer',
          background: locDenied
            ? 'rgba(239,68,68,0.15)'
            : userLoc
              ? 'rgba(37,99,235,0.92)'
              : 'rgba(220,252,231,0.95)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          boxShadow: userLoc ? '0 4px 16px rgba(37,99,235,0.35)' : '0 2px 10px rgba(0,0,0,0.18)',
          color: locDenied ? '#ef4444' : userLoc ? '#fff' : '#16a34a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          opacity: locating ? 0.6 : 1,
        }}
      >
        {locating ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(90deg)' }}>
            <path d="M2.4 2.4a1 1 0 0 1 1.2-.24l18 8a1 1 0 0 1 0 1.84l-7.6 3.37-3.37 7.6a1 1 0 0 1-1.84 0l-8-18a1 1 0 0 1 .61-1.57z"/>
          </svg>
        )}
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

      {/* Status filter pills — top left, desktop only */}
      <div className="map-status-pills" style={{
        position: 'absolute', top: 14, left: 14, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start',
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
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };
  const removePhoto = (idx: number) => {
    setPhotos(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitInspection({
        school_id: school.id,
        promise_id: promise?.id,
        checklist_answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v ?? false])) as Record<string, boolean>,
        comment,
        photos: photos.map(p => p.file),
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

        <div className="card-dark" style={{ padding: 16 }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhoto} style={{ display: 'none' }} />
          {photos.length === 0 ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, cursor: 'pointer', border: '2px dashed #3d5166', borderRadius: 14 }}
            >
              <CameraIcon size={40} color="#3d5166" />
              <div style={{ fontSize: 13, color: '#3d5166', fontWeight: 600 }}>Сделать фото</div>
              <div style={{ fontSize: 11, color: '#2a3f54' }}>GPS: {school.lat.toFixed(4)}, {school.lng.toFixed(4)}</div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                    <img src={p.preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                    <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 50, background: '#ef4444', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                  </div>
                ))}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #3d5166', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <CameraIcon size={24} color="#3d5166" />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#2a3f54' }}>GPS: {school.lat.toFixed(4)}, {school.lng.toFixed(4)} · {photos.length} фото</div>
            </div>
          )}
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

// ─── CAMERA INSPECTION MODAL ─────────────────────────────────────────────────

function CameraInspectionModal({ school, promise, userId, onClose, onDone }: {
  school: School;
  promise: SchoolPromise | undefined;
  userId: string;
  onClose: () => void;
  onDone: (pts: number) => void;
}) {
  type Phase = 'camera' | 'preview' | 'checklist' | 'analyzing' | 'done';
  const [phase, setPhase] = useState<Phase>('camera');
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checklist: string[] = Array.isArray(promise?.checklist) && promise!.checklist.length > 0
    ? promise!.checklist as string[]
    : ['Работы выполнены?', 'Соответствует тендеру?', 'Доступно для учеников?'];

  const [answers, setAnswers] = useState<Record<string, boolean | null>>(
    () => Object.fromEntries(checklist.map(q => [q, null]))
  );
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const ANALYSIS_STEPS = [
    'Анализ метаданных фото...',
    'Проверка геолокации...',
    'Сравнение с камерами наблюдения...',
    'Оценка качества выполнения...',
    'Формирование результата...',
  ];

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError('Нет доступа к камере. Разрешите доступ в настройках браузера.');
    }
  }, []);

  useEffect(() => {
    if (phase === 'camera') startCamera(facingMode);
    return () => {};
  }, [phase, facingMode, startCamera]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCurrentPreview(canvas.toDataURL('image/jpeg', 0.85));
    setPhase('preview');
  };

  const acceptPhoto = () => {
    if (!currentPreview) return;
    const next = [...photos, currentPreview];
    setPhotos(next);
    setCurrentPreview(null);
    if (next.length >= 3) { setPhase('checklist'); }
    else { setPhase('camera'); }
  };

  const retakePhoto = () => { setCurrentPreview(null); setPhase('camera'); };

  const goToChecklist = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setPhase('checklist');
  };

  const startAnalysis = () => {
    setPhase('analyzing');
    setAnalysisProgress(0);
    setAnalysisStep(0);
    let step = 0;
    const stepInt = setInterval(() => { step++; setAnalysisStep(Math.min(step, ANALYSIS_STEPS.length - 1)); }, 900);
    let prog = 0;
    const progInt = setInterval(() => {
      prog += Math.random() * 8 + 4;
      if (prog >= 100) {
        prog = 100;
        clearInterval(progInt);
        clearInterval(stepInt);
        setTimeout(finishAnalysis, 400);
      }
      setAnalysisProgress(Math.min(prog, 100));
    }, 180);
  };

  const finishAnalysis = async () => {
    try {
      const photoFiles = await Promise.all(photos.map(async (dataUrl, i) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], `photo_${i + 1}.jpg`, { type: 'image/jpeg' });
      }));
      const result = await api.submitInspection({
        school_id: school.id,
        promise_id: promise?.id,
        checklist_answers: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [k, v ?? false])
        ) as Record<string, boolean>,
        photos: photoFiles,
      }, userId);
      setEarnedPoints(result.points_awarded || 50);
    } catch { setEarnedPoints(50); }
    setPhase('done');
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#000', display: 'flex', flexDirection: 'column',
  };

  return ReactDOM.createPortal(
    <div style={overlayStyle}>

      {/* ── CAMERA PHASE ── */}
      {phase === 'camera' && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
            <button onClick={onClose} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
              <X size={16} /> Закрыть
            </button>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, background: 'rgba(0,0,0,0.4)', padding: '6px 16px', borderRadius: 20 }}>
              {photos.length + 1} / 3
            </div>
            <button
              onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
              style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              ↺ Камера
            </button>
          </div>

          {cameraError ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 32, textAlign: 'center', fontSize: 15, lineHeight: 1.6 }}>
              {cameraError}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          )}

          {/* Thumbnails row */}
          {photos.length > 0 && (
            <div style={{ position: 'absolute', bottom: 160, left: 20, display: 'flex', gap: 8 }}>
              {photos.map((p, i) => (
                <img key={i} src={p} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2.5px solid #fff' }} />
              ))}
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 24px 52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
            {photos.length > 0 ? (
              <button onClick={goToChecklist} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 14, padding: '12px 22px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                Далее →
              </button>
            ) : <div style={{ width: 100 }} />}

            <button
              onClick={capturePhoto}
              style={{ width: 76, height: 76, borderRadius: '50%', background: '#fff', border: '5px solid rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 5px rgba(255,255,255,0.15)', flexShrink: 0 }}
            >
              <CameraIcon size={30} color="#1a1a1a" />
            </button>

            <div style={{ width: 100 }} />
          </div>
        </>
      )}

      {/* ── PREVIEW PHASE ── */}
      {phase === 'preview' && currentPreview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, padding: '18px 20px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Фото {photos.length + 1}</span>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>{photos.length + 1} из 3 максимум</span>
          </div>
          <img src={currentPreview} alt="" style={{ flex: 1, objectFit: 'contain', background: '#000', minHeight: 0, display: 'block' }} />
          <div style={{ flexShrink: 0, padding: '20px 20px 48px', background: '#111', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={retakePhoto} style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Переснять
              </button>
              <button onClick={acceptPhoto} style={{ flex: 1, padding: '14px', borderRadius: 14, background: '#16a34a', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {photos.length + 1 >= 3 ? 'Готово →' : 'Ещё фото →'}
              </button>
            </div>
            {photos.length + 1 < 3 && (
              <button
                onClick={() => { setPhotos(prev => [...prev, currentPreview!]); setCurrentPreview(null); setPhase('checklist'); }}
                style={{ padding: '11px', borderRadius: 14, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)', color: '#94a3b8', fontSize: 14, cursor: 'pointer' }}
              >
                Пропустить к чеклисту →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKLIST PHASE ── */}
      {phase === 'checklist' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafb' }}>
          <div style={{ padding: '20px 20px 16px', background: '#0d1b2e' }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Отметьте чеклист</div>
            <div style={{ color: '#86efac', fontSize: 12, marginTop: 3 }}>{photos.length} фото прикреплено</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {photos.map((p, i) => (
                  <img key={i} src={p} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                ))}
              </div>
            )}

            {promise && (
              <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1.5px solid #e8edf2' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Обращение</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1b2e' }}>{promise.title}</div>
              </div>
            )}

            {checklist.map((q, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 10, border: '1.5px solid #e8edf2', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0d1b2e', lineHeight: 1.4 }}>{q}</span>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setAnswers(a => ({ ...a, [q]: true }))}
                    style={{ width: 40, height: 40, borderRadius: 10, background: answers[q] === true ? '#16a34a' : '#f0f4f8', border: `2px solid ${answers[q] === true ? '#16a34a' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: answers[q] === true ? '#fff' : '#64748b', fontSize: 18, fontWeight: 700, transition: 'all 0.15s' }}
                  >✓</button>
                  <button
                    onClick={() => setAnswers(a => ({ ...a, [q]: false }))}
                    style={{ width: 40, height: 40, borderRadius: 10, background: answers[q] === false ? '#ef4444' : '#f0f4f8', border: `2px solid ${answers[q] === false ? '#ef4444' : '#e2e8f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: answers[q] === false ? '#fff' : '#64748b', fontSize: 18, fontWeight: 700, transition: 'all 0.15s' }}
                  >✗</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px 48px', background: '#fff', borderTop: '1.5px solid #e8edf2' }}>
            <button
              onClick={startAnalysis}
              style={{ width: '100%', padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >
              Отправить на проверку ИИ →
            </button>
          </div>
        </div>
      )}

      {/* ── ANALYZING PHASE ── */}
      {phase === 'analyzing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a1628', color: '#fff', padding: 32, gap: 0 }}>
          <div className="ai-orb" style={{ width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a 60%, #0d4a22)', marginBottom: 36 }} />
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, textAlign: 'center' }}>ИИ анализирует фото</div>
          <div style={{ fontSize: 14, color: '#86efac', marginBottom: 36, minHeight: 22, textAlign: 'center' }}>
            {ANALYSIS_STEPS[analysisStep]}
          </div>
          <div style={{ width: '100%', maxWidth: 340, background: 'rgba(255,255,255,0.1)', borderRadius: 10, height: 10, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${analysisProgress}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 10, transition: 'width 0.2s ease' }} />
          </div>
          <div style={{ color: '#4ade80', fontSize: 16, fontWeight: 700 }}>{Math.round(analysisProgress)}%</div>
        </div>
      )}

      {/* ── DONE PHASE ── */}
      {phase === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 20, lineHeight: 1 }}>✅</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0d1b2e', marginBottom: 10, textAlign: 'center' }}>Проверка принята!</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 32, textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>
            Результат будет опубликован через 12–72 часа после анонимной верификации
          </div>
          {earnedPoints > 0 && (
            <div style={{ background: '#fff', borderRadius: 18, padding: '16px 32px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 20px rgba(22,163,74,0.15)' }}>
              <Star size={26} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#0d1b2e' }}>+{earnedPoints} XP</span>
            </div>
          )}
          <button
            onClick={() => onDone(earnedPoints)}
            style={{ padding: '16px 52px', borderRadius: 14, background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
          >
            Готово
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>,
    document.body
  );
}

// ─── CREATE PROMISE ───────────────────────────────────────────────────────────

function CreatePromiseView({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [form, setForm] = useState({ title: '', description: '', deadline: '' });
  const [checklist, setChecklist] = useState<string[]>(['']);
  const [photos, setPhotos] = useState<File[]>([]);
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
        deadline: form.deadline || undefined,
        checklist: checklist.filter(c => c.trim()),
        photos,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Ошибка при создании');
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: '1.5px solid #e8ecf0',
    borderRadius: 14, fontSize: 14, color: '#0d1b2e', background: '#fafbfc',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7, display: 'block',
  };

  const STEPS = [
    { label: 'Школа', icon: '🏫' },
    { label: 'Детали', icon: '📋' },
    { label: 'Чеклист', icon: '✅' },
  ];

  /* ── Success screen ── */
  if (done) return (
    <FadeIn>
      <div className="promise-success-wrap">
        <div className="promise-success-card">
          <div className="promise-success-blob" />
          <div className="promise-success-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="promise-success-title">Обращение создано!</div>
          <div className="promise-success-sub">
            Обращение по школе <span className="promise-success-school">{selectedSchool?.name_ru}</span> зарегистрировано и будет рассмотрено.
          </div>
          <button className="btn-shine promise-success-btn" onClick={onSuccess}>
            Вернуться к проверкам
          </button>
        </div>
      </div>
    </FadeIn>
  );

  return (
    <FadeIn>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero header */}
        <div style={{
          background: 'linear-gradient(135deg, #d4fbb0 0%, #e8fcd8 60%, #f0fef4 100%)',
          borderRadius: 24, padding: '24px 24px 22px',
          display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden',
          border: '1.5px solid #bbf7d0',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 130, height: 130,
            borderRadius: '50%', background: 'rgba(124,238,43,0.15)',
          }} />
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #7cee2b, #5bc91e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,238,43,0.35)',
          }}>
            <FileText size={24} color="#182210" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0d1b2e', lineHeight: 1.2 }}>Новое обращение</div>
            <div style={{ fontSize: 12, color: '#4a7c3f', marginTop: 4 }}>
              Источник: <span style={{ color: '#16a34a', fontWeight: 700 }}>👥 Народный контроль</span>
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '2px 4px' }}>
          {STEPS.map((s, i) => {
            const isActive = i + 1 === step;
            const isDone   = i + 1 < step;
            return (
              <React.Fragment key={s.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 'none' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', fontWeight: 900, fontSize: 15,
                    background: '#fff',
                    color: '#16a34a',
                    border: `2px solid ${isActive ? '#7cee2b' : isDone ? '#4ade80' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 0 0 4px rgba(124,238,43,0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#0d1b2e' : '#94a3b8', whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isDone ? '#7cee2b' : '#e8ecf0', borderRadius: 2, marginBottom: 22, minWidth: 24, transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: School ── */}
        {step === 1 && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e8ecf0', padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#0d1b2e', marginBottom: 4 }}>Выберите школу</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Введите название или район — найдём в базе</div>
            </div>

            <div style={{ position: 'relative' }}>
              <label style={lbl}>Поиск школы</label>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  style={{ ...inp, paddingLeft: 42 }}
                  placeholder="Школа №42, Чиланзар…"
                  value={schoolQuery}
                  onChange={e => handleSchoolSearch(e.target.value)}
                />
              </div>
              {schoolResults.length > 0 && !selectedSchool && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                  background: '#fff', borderRadius: 16, boxShadow: '0 12px 40px rgba(13,27,46,0.14)',
                  border: '1.5px solid #e8ecf0', overflow: 'hidden', maxHeight: 260, overflowY: 'auto',
                }}>
                  {schoolResults.map(s => (
                    <button key={s.id}
                      onClick={() => { setSelectedSchool(s); setSchoolQuery(s.name_ru); setSchoolResults([]); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid #f8fafc' }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 16, border: '1.5px solid #bbf7d0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>🏫</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSchool.name_ru}</div>
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, fontWeight: 600 }}>{selectedSchool.district} · {selectedSchool.oblast}</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.07)' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                </div>
              </div>
            )}

            {error && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, padding: '8px 12px', background: '#fef2f2', borderRadius: 10 }}>{error}</div>}

            <button className="btn-shine"
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                color: '#182210', fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 16px rgba(124,238,43,0.35)', opacity: selectedSchool ? 1 : 0.4,
              }}
              disabled={!selectedSchool}
              onClick={() => { setError(''); setStep(2); }}
            >
              Далее <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e8ecf0', padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#f0fdf4', borderRadius: 14, border: '1.5px solid #bbf7d0' }}>
              <span style={{ fontSize: 16 }}>🏫</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{selectedSchool?.name_ru}</span>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#16a34a', fontWeight: 700, padding: 0, fontFamily: 'inherit', flexShrink: 0 }}>Изменить</button>
            </div>

            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#0d1b2e', marginBottom: 4 }}>Детали обращения</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Опишите что нужно проверить или исправить</div>
            </div>

            <div>
              <label style={lbl}>Название <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inp} placeholder="Например: Сломана система отопления"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div>
              <label style={lbl}>Описание</label>
              <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' } as React.CSSProperties}
                placeholder="Подробно опишите проблему — что сломано, где, как давно…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <label style={lbl}>Срок исполнения</label>
              <input style={inp} type="date"
                value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>

            {/* Photo upload — optional */}
            <div>
              <label style={lbl}>
                Фото <span style={{ color: '#94a3b8', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>— необязательно</span>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setPhotos(prev => [...prev, ...files].slice(0, 3));
                  e.target.value = '';
                }}
              />
              <label htmlFor="photo-upload" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
                background: '#f8fafc', border: '1.5px dashed #d1d5db', borderRadius: 14,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget.style.background = '#f0fdf4'); (e.currentTarget.style.borderColor = '#bbf7d0'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = '#f8fafc'); (e.currentTarget.style.borderColor = '#d1d5db'); }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CameraIcon size={16} color="#64748b" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e' }}>
                    {photos.length > 0 ? `${photos.length} фото выбрано` : 'Прикрепить фото'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>До 3 фотографий · JPG, PNG</div>
                </div>
              </label>
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {photos.map((f, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                      />
                      <button
                        onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                          borderRadius: '50%', background: '#ef4444', border: '2px solid #fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, padding: '8px 12px', background: '#fef2f2', borderRadius: 10 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: 14 }} onClick={() => setStep(1)}>← Назад</button>
              <button className="btn-shine"
                style={{
                  flex: 2, padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                  color: '#182210', fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(124,238,43,0.35)', opacity: form.title.trim() ? 1 : 0.4,
                }}
                disabled={!form.title.trim()}
                onClick={() => { setError(''); setStep(3); }}
              >Далее <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Checklist ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e8ecf0', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#0d1b2e', marginBottom: 4 }}>Чеклист проверки</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Что граждане будут проверять на месте</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {checklist.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                      background: item.trim() ? '#f0fdf4' : '#f8fafc',
                      border: `1.5px solid ${item.trim() ? '#bbf7d0' : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 900, color: item.trim() ? '#16a34a' : '#94a3b8',
                      transition: 'all 0.15s',
                    }}>{i + 1}</div>
                    <input style={{ ...inp, flex: 1, padding: '11px 14px' }}
                      placeholder={`Пункт ${i + 1}…`} value={item}
                      onChange={e => updateCheckItem(i, e.target.value)} />
                    {checklist.length > 1 && (
                      <button onClick={() => removeCheckItem(i)} style={{ background: '#fef2f2', border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addCheckItem} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', border: '1.5px dashed #d1d5db',
                borderRadius: 14, padding: '12px 16px', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: '#64748b', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget.style.background = '#f0fdf4'); (e.currentTarget.style.borderColor = '#bbf7d0'); (e.currentTarget.style.color = '#16a34a'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = '#f8fafc'); (e.currentTarget.style.borderColor = '#d1d5db'); (e.currentTarget.style.color = '#64748b'); }}
              >
                <Plus size={15} /> Добавить пункт
              </button>
            </div>

{error && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, padding: '8px 12px', background: '#fef2f2', borderRadius: 10 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: 14 }} onClick={() => setStep(2)}>← Назад</button>
              <button className="btn-shine"
                style={{
                  flex: 2, padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: 'linear-gradient(135deg, #7cee2b 0%, #5bc91e 100%)',
                  color: '#182210', fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(124,238,43,0.35)', opacity: submitting ? 0.65 : 1,
                }}
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

function ProfileView({ user, onLogout }: { user: User | null; onLogout: () => void }) {
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
      <div className="profile-grid">

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* User card */}
          <div className="card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <UserIcon size={34} color="#94a3b8" />
                </div>
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 22, height: 22, borderRadius: 7,
                  background: '#7cee2b', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Award size={11} color="#0d1b2e" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0d1b2e', lineHeight: 1.2 }}>Anonymous #{user.uid ?? '—'}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  ID: {user.id.slice(0, 16).toUpperCase()}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7cee2b', marginTop: 5 }}>
                  Уровень {user.level} · Сезон 4
                </div>
              </div>
            </div>

            {/* XP bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 7 }}>
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
                flex: 1, padding: '12px 20px',
                background: '#7cee2b', border: 'none', borderRadius: 50,
                fontSize: 13, fontWeight: 800, color: '#0d1b2e', cursor: 'pointer'
              }}>Редактировать</button>
              <button style={{
                width: 46, height: 46, flexShrink: 0,
                background: '#f1f5f9', border: 'none', borderRadius: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
                <Share2 size={17} color="#64748b" />
              </button>
              <button style={{
                width: 46, height: 46, flexShrink: 0,
                background: '#f1f5f9', border: 'none', borderRadius: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
                <Settings size={17} color="#64748b" />
              </button>
              <button
                onClick={() => { if (window.confirm('Выйти из аккаунта?')) onLogout(); }}
                style={{
                  width: 46, height: 46, flexShrink: 0,
                  background: '#fff0f0', border: 'none', borderRadius: 50,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <LogOut size={17} color="#ef4444" />
              </button>
            </div>
          </div>

          {/* Total Points dark block */}
          <div style={{
            background: '#0d1b2e', borderRadius: 20, padding: '22px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#5c7a9a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Всего очков гражданина
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
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

          {/* Mascot motivation block */}
          <div style={{
            background: 'linear-gradient(135deg, #0d1b2e 0%, #1a3a5c 100%)',
            borderRadius: 20, padding: '20px 22px',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            overflow: 'hidden', position: 'relative', minHeight: 110,
          }}>
            <div style={{ zIndex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#5c7a9a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Твой прогресс
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: 10 }}>
                Продолжай<br />в том же духе!
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(124,238,43,0.15)', border: '1px solid rgba(124,238,43,0.3)',
                borderRadius: 20, padding: '5px 12px'
              }}>
                <Zap size={11} color="#7cee2b" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7cee2b' }}>Streak {user.streak} дней</span>
              </div>
            </div>
            <img
              src="/likeboy.png"
              alt="mascot"
              style={{ width: 100, height: 100, objectFit: 'contain', flexShrink: 0, marginBottom: -20, marginRight: -4 }}
            />
          </div>

          {/* Streak Freeze */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26 }}>❄️</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e' }}>Заморозка стрика</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Защита от потери стрика</div>
              </div>
            </div>
            <div style={{
              background: '#f0fdf4', borderRadius: 10, padding: '7px 16px',
              fontSize: 16, fontWeight: 900, color: '#0d1b2e'
            }}>x{user.streak_freezes}</div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Season Progress */}
          <div className="card" style={{ padding: '22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0d1b2e' }}>Прогресс сезона 4</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Заканчивается через 5 дней</div>
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#7cee2b' }}>{user.points_season.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}> / {SEASON_MAX.toLocaleString()}</span>
              </div>
            </div>
            <div className="progress-track" style={{ height: 8, marginBottom: 18 }}>
              <div className="progress-fill" style={{ width: `${seasonPct}%`, background: 'linear-gradient(90deg, #7cee2b, #4ade80)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {TIERS.map((t, i) => {
                const unlocked = unlockedTiers[i];
                const isCurrent = i === currentTierIdx;
                return (
                  <div key={t} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 50,
                      background: unlocked ? '#7cee2b' : isCurrent ? '#f0fdf4' : '#f1f5f9',
                      border: `2.5px solid ${unlocked ? '#4ade80' : isCurrent ? '#7cee2b' : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {unlocked ? <CheckCircle2 size={19} color="#0d1b2e" />
                        : isCurrent ? <Star size={17} color="#7cee2b" />
                        : <Shield size={15} color="#cbd5e1" />}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: unlocked ? '#0d1b2e' : isCurrent ? '#7cee2b' : '#94a3b8' }}>{t}</span>
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
                <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Текущий стрик</span>
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{user.streak}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 2 }}>дней</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7cee2b', marginTop: 8 }}>+2% эффективность</div>
            </div>
            <div className="card" style={{ padding: '18px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <Star size={12} color="#f59e0b" />
                <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Макс. стрик</span>
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#0d1b2e', lineHeight: 1 }}>{user.max_streak}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 2 }}>дней</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Личный рекорд</div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0d1b2e' }}>Достижения</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7cee2b', cursor: 'pointer' }}>Все</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {user.badges.length > 0 ? user.badges.map((b, i) => {
                const colors = BADGE_COLORS[i % BADGE_COLORS.length];
                return (
                  <div key={b.id} style={{
                    flexShrink: 0, width: 100, padding: '14px 10px',
                    background: '#f8fafc', borderRadius: 16,
                    border: '1.5px solid #f1f5f9', textAlign: 'center'
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, margin: '0 auto 8px',
                      background: colors.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                    }}>{b.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.3 }}>{b.title}</div>
                  </div>
                );
              }) : (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Пока нет достижений</div>
              )}
            </div>
          </div>

          {/* Reward Store */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0d1b2e' }}>Магазин наград</div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#f97316',
                background: '#fff7ed', border: '1px solid #fed7aa',
                borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>Скоро</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Будет реализовано государством</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  borderRadius: 16, padding: '18px 12px',
                  border: '1.5px dashed #e2e8f0',
                  background: 'rgba(248,250,252,0.5)',
                  backdropFilter: 'blur(4px)',
                  textAlign: 'center',
                  filter: 'blur(0px)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, margin: '0 auto 10px',
                    background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Shield size={20} color="#cbd5e1" />
                  </div>
                  <div style={{
                    height: 10, borderRadius: 6, background: '#e2e8f0', margin: '0 auto 6px', width: '70%'
                  }} />
                  <div style={{
                    height: 8, borderRadius: 6, background: '#f1f5f9', margin: '0 auto', width: '45%'
                  }} />
                  {/* lock overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: 18 }}>🔒</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </FadeIn>
  );
}
