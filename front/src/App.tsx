import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, BarChart3, Target, User as UserIcon,
  Search, Bell, ChevronRight, TrendingUp, Users, Clock,
  Globe, X, Zap, Shield, Award, CheckCircle2, AlertCircle,
  MapPin, Camera as CameraIcon, Maximize2, Plus, Info, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, School, District, User, SchoolMapItem, Stats, SchoolPromise } from './api';

type View = 'dashboard' | 'rating' | 'school' | 'capture' | 'inspection' | 'profile';

// Fix Leaflet icon issue in webpack/vite
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function statusColor(status: string) {
  if (status === 'ok') return '#22c55e';
  if (status === 'problem') return '#ef4444';
  return '#94a3b8';
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.5 });
  }, [lat, lng]);
  return null;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [activePromiseId, setActivePromiseId] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.getUser().then(setUser).catch(console.error);
  }, []);

  const handleSchoolClick = useCallback(async (schoolOrItem: School | SchoolMapItem) => {
    try {
      const full = await api.getSchool(schoolOrItem.id);
      setSelectedSchool(full);
      setCurrentView('school');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await api.searchSchools(q);
      setSearchResults(results);
      setShowSearch(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="glass sticky top-0 z-50 px-8 py-4 flex items-center justify-between mx-8 mt-6 rounded-[32px]">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/20">
              <Shield className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Реал Холат</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={18} />} label="Дашборд" />
            <NavButton active={currentView === 'rating'} onClick={() => setCurrentView('rating')} icon={<BarChart3 size={18} />} label="Рейтинг" />
            <NavButton active={currentView === 'capture'} onClick={() => setCurrentView('capture')} icon={<Target size={18} />} label="Захват" />
            <NavButton active={currentView === 'profile'} onClick={() => setCurrentView('profile')} icon={<UserIcon size={18} />} label="Профиль" />
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              placeholder="Поиск школы или района..."
              className="pl-12 pr-6 py-2.5 bg-white/50 rounded-full text-sm font-medium focus:bg-white border border-transparent focus:border-gray-200 transition-all outline-none w-72"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                {searchResults.map(s => (
                  <button
                    key={s.id}
                    onMouseDown={() => handleSchoolClick(s)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-bold text-gray-900 truncate">{s.name_ru}</p>
                    <p className="text-xs text-slate-400">{s.district} · {s.oblast}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-gray-900 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900">{user?.name ?? '...'}</p>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                Lvl {user?.level ?? 1} Inspector
              </p>
            </div>
            <img src="https://picsum.photos/seed/anvar/100/100" className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm" alt="User" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <DashboardView key="dashboard" onSchoolClick={handleSchoolClick} />
          )}
          {currentView === 'rating' && (
            <RatingView key="rating" />
          )}
          {currentView === 'school' && selectedSchool && (
            <SchoolDetailView
              key="school"
              school={selectedSchool}
              onBack={() => setCurrentView('dashboard')}
              onInspect={(promiseId) => { setActivePromiseId(promiseId); setCurrentView('inspection'); }}
            />
          )}
          {currentView === 'capture' && (
            <CaptureMapView key="capture" onSchoolClick={handleSchoolClick} />
          )}
          {currentView === 'inspection' && selectedSchool && (
            <InspectionView
              key="inspection"
              school={selectedSchool}
              promiseId={activePromiseId}
              onCancel={() => setCurrentView('school')}
              onSubmit={() => { setCurrentView('school'); }}
            />
          )}
          {currentView === 'profile' && (
            <ProfileView key="profile" user={user} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`dash-nav-link flex items-center gap-2 ${active ? 'active' : 'inactive'}`}>
      {icon}
      <span className={active ? 'block' : 'hidden xl:block'}>{label}</span>
    </button>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function DashboardView({ onSchoolClick }: { onSchoolClick: (s: SchoolMapItem) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [mapSchools, setMapSchools] = useState<SchoolMapItem[]>([]);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [oblast, setOblast] = useState('Toshkent shahar');

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    api.getMapSchools(oblast).then(setMapSchools).catch(console.error);
  }, [oblast]);

  const oblasts = ['Toshkent shahar', 'Toshkent viloyati', 'Samarqand viloyati', 'Farg\'ona viloyati'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-12 gap-8">
      {/* Left Stats Panel */}
      <div className="col-span-12 lg:col-span-3 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Глобальная Статистика</h2>

        <div className="dash-card bg-gray-900 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Всего школ</p>
          <h3 className="text-4xl font-bold">{stats?.total_schools?.toLocaleString() ?? '...'}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium">
            <TrendingUp size={14} className="text-lime-400" />
            <span>Данные GEOASR</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="dash-card !p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Проверки</p>
            <h3 className="text-2xl font-bold">{stats?.weekly_inspections ?? 0}</h3>
            <p className="text-[9px] text-slate-400 mt-1">за 7 дней</p>
          </div>
          <div className="dash-card !p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Инспекторы</p>
            <h3 className="text-2xl font-bold">{stats?.active_inspectors ?? 0}</h3>
            <p className="text-[9px] text-slate-400 mt-1">активные</p>
          </div>
        </div>

        <div className="dash-card">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Выполнение</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{stats?.promise_completion ?? 0}%</h3>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats?.promise_completion ?? 0}%` }}
              className="h-full bg-lime-500"
            />
          </div>
        </div>

        <div className="dash-card">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Проблемные школы</p>
          <div className="space-y-3">
            {stats?.top_problem_schools.slice(0, 4).map((s, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                <p className="font-medium text-slate-600 truncate">
                  <span className="text-gray-900 font-bold">{s.name_ru}</span>
                  <span className="text-slate-400"> · {s.open_promises} обещ.</span>
                </p>
              </div>
            )) ?? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1 shrink-0" />
                  <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center Map */}
      <div className="col-span-12 lg:col-span-9 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {oblasts.map(o => (
              <button
                key={o}
                onClick={() => setOblast(o)}
                className={`dash-pill ${oblast === o ? 'bg-gray-900 text-white' : 'bg-white border border-gray-100'}`}
              >
                {o.replace(' viloyati', '').replace(' shahar', ' ш.')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-lime-500" /> Норма</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Проблема</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300" /> Давно не было</div>
          </div>
        </div>

        <div className="dash-card !p-0 overflow-hidden" style={{ height: 580 }}>
          <MapContainer
            center={[41.31, 69.25]}
            zoom={11}
            style={{ height: '100%', width: '100%', borderRadius: 40 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {flyTo && <MapFlyTo lat={flyTo.lat} lng={flyTo.lng} />}
            {mapSchools.map(school => (
              <CircleMarker
                key={school.id}
                center={[school.lat, school.lng]}
                radius={school.capture_level > 0 ? 10 : 7}
                pathOptions={{
                  color: '#fff',
                  weight: 2,
                  fillColor: statusColor(school.status),
                  fillOpacity: 0.9,
                }}
                eventHandlers={{
                  click: () => onSchoolClick(school),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{school.name_ru}</p>
                    <p className="text-xs text-gray-500">{school.district}</p>
                    <p className="text-xs mt-1">Обещаний: {school.promise_count} · Захват: {school.capture_level}/3</p>
                    <button
                      onClick={() => onSchoolClick(school)}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline block"
                    >
                      Подробнее →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </motion.div>
  );
}

// ─── RATING ───────────────────────────────────────────────────────────────────

function RatingView() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'fulfillment_rate' | 'total_schools'>('fulfillment_rate');

  useEffect(() => {
    api.getDistricts('Toshkent shahar')
      .then(d => { setDistricts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...districts].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Рейтинг Районов</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Прозрачное сравнение эффективности</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('fulfillment_rate')}
            className={`dash-pill ${sortBy === 'fulfillment_rate' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-100'}`}
          >
            По % выполнения
          </button>
          <button
            onClick={() => setSortBy('total_schools')}
            className={`dash-pill ${sortBy === 'total_schools' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-100'}`}
          >
            По кол-ву школ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="dash-card animate-pulse">
              <div className="h-32 bg-slate-100 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sorted.map((district, idx) => (
            <motion.div
              key={district.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="dash-card flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-bold text-gray-900">
                  {idx + 1}
                </div>
                <div className={`flex items-center gap-1 font-bold text-xs ${district.trend === 'up' ? 'text-lime-600' : 'text-red-500'}`}>
                  {district.trend === 'up' ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                  {district.trend === 'up' ? '+' : '-'}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-4 leading-tight">{district.name}</h3>

              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <span>Выполнение</span>
                    <span className="text-gray-900">{district.fulfillment_rate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${district.fulfillment_rate}%` }} className="h-full bg-gray-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Школ</p>
                    <p className="text-lg font-bold text-gray-900">{district.total_schools}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Проверено</p>
                    <p className="text-lg font-bold text-gray-900">{district.checked_ratio}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Игнорируется</p>
                  <p className="text-lg font-bold text-red-500">{district.ignored_count}</p>
                </div>
                <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-gray-900 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── SCHOOL DETAIL ────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Ожидает',
    'in-progress': 'В работе',
    resolved: 'Выполнено',
    ignored: 'Игнорируется',
  };
  return map[status] ?? status;
}

function SchoolDetailView({
  school,
  onBack,
  onInspect,
}: {
  school: School;
  onBack: () => void;
  onInspect: (promiseId?: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-6xl mx-auto space-y-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-gray-900 transition-colors">
        <ChevronRight size={16} className="rotate-180" /> Назад
      </button>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-8">
          <div className="dash-card">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900">{school.name_ru}</h2>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    school.status === 'ok' ? 'bg-lime-500/10 text-lime-600' :
                    school.status === 'problem' ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 text-slate-500'
                  }`}>
                    Захват {school.capture_level}/3
                  </div>
                </div>
                <p className="text-slate-400 font-medium flex items-center gap-2 text-sm">
                  <MapPin size={14} /> {school.district}, {school.oblast}
                </p>
              </div>
              <button onClick={() => onInspect(undefined)} className="dash-button-black flex items-center gap-2">
                <CameraIcon size={16} /> Проверить
              </button>
            </div>

            {/* Infrastructure info */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Вместимость', value: `${school.capacity} чел.` },
                { label: 'Учеников', value: school.students.toString() },
                { label: 'Год постройки', value: school.year_built || '—' },
                { label: 'Спортзал', value: school.gym?.includes('Нет') ? 'Нет' : 'Есть' },
                { label: 'Столовая', value: school.cafeteria?.includes('Нет') ? 'Нет' : 'Есть' },
                { label: 'Интернет', value: school.internet || '—' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-4">Обещания ({school.promises.length})</h3>
            <div className="space-y-3">
              {school.promises.length === 0 && (
                <p className="text-slate-400 text-sm">Нет активных обещаний.</p>
              )}
              {school.promises.map(p => (
                <div key={p.id} className="p-4 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                      p.source === 'E-tender' ? 'bg-gray-900' : 'bg-blue-500'
                    }`}>
                      {p.source === 'E-tender' ? <Globe size={16} /> : <Users size={16} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{p.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {p.source} · {p.deadline ? new Date(p.deadline).toLocaleDateString('ru-RU') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1 ${
                      p.status === 'resolved' ? 'bg-lime-500 text-white' :
                      p.status === 'ignored' ? 'bg-red-500/10 text-red-500' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {statusLabel(p.status)}
                    </div>
                    <p className="text-xs font-medium text-slate-400">{p.confirmation_rate}% подт.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Mini map for school location */}
          <div className="dash-card !p-0 overflow-hidden" style={{ height: 220 }}>
            <MapContainer
              center={[school.lat, school.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%', borderRadius: 40 }}
              zoomControl={false}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CircleMarker
                center={[school.lat, school.lng]}
                radius={12}
                pathOptions={{ color: '#fff', weight: 3, fillColor: statusColor(school.status), fillOpacity: 1 }}
              />
            </MapContainer>
          </div>

          <div className="dash-card bg-gray-900 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <Info className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold">Общественный Контроль</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Результаты проверок агрегируются анонимно. Отображается только процент подтверждения обещаний.
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="text-xl font-bold text-white">{school.promises.filter(p => p.status === 'resolved').length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Выполнено</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="text-xl font-bold text-white">{school.promises.filter(p => p.status === 'ignored').length}</p>
                <p className="text-[10px] text-red-400 uppercase tracking-widest">Игнорируется</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── CAPTURE MAP ──────────────────────────────────────────────────────────────

function CaptureMapView({ onSchoolClick }: { onSchoolClick: (s: SchoolMapItem) => void }) {
  const [mapSchools, setMapSchools] = useState<SchoolMapItem[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.getMapSchools('Toshkent shahar').then(setMapSchools).catch(console.error);
    api.getUser().then(setUser).catch(console.error);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[calc(100vh-160px)] -m-8 relative bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Left Panel */}
      <div className="absolute top-12 left-12 z-10 space-y-4 pointer-events-auto">
        <div className="glass-dark p-6 rounded-[40px] w-72">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center text-white">
              <Target size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Карта Захвата</h3>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Инспектор</p>
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ваш Стрик</p>
              <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                <Zap size={12} /> {user?.streak ?? 0} дн.
              </div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, ((user?.streak ?? 0) / 30) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Leaflet Map — dark style */}
      <div className="absolute inset-0">
        <MapContainer
          center={[41.31, 69.25]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {mapSchools.map(school => (
            <CircleMarker
              key={school.id}
              center={[school.lat, school.lng]}
              radius={school.capture_level > 0 ? 14 : 10}
              pathOptions={{
                color: statusColor(school.status),
                weight: 2,
                fillColor: statusColor(school.status),
                fillOpacity: school.capture_level > 0 ? 0.4 : 0.2,
              }}
              eventHandlers={{ click: () => onSchoolClick(school) }}
            >
              <Popup className="dark-popup">
                <div className="text-sm text-white bg-gray-900 p-2 rounded-xl">
                  <p className="font-bold">{school.name_ru}</p>
                  <p className="text-xs text-gray-400">{school.district}</p>
                  <p className="text-xs mt-1 text-blue-300">Обещаний: {school.promise_count}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="absolute bottom-12 right-12 z-10 flex gap-4">
        <button className="dash-button-black !h-14 px-10 text-base !rounded-[28px] shadow-2xl shadow-blue-500/20">
          Сканировать Область
        </button>
      </div>
    </motion.div>
  );
}

// ─── INSPECTION ───────────────────────────────────────────────────────────────

function InspectionView({
  school,
  promiseId,
  onCancel,
  onSubmit,
}: {
  school: School;
  promiseId?: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const promise = promiseId ? school.promises.find(p => p.id === promiseId) : school.promises[0];
  const checklist: string[] = Array.isArray(promise?.checklist)
    ? promise.checklist
    : ['Работы выполнены?', 'Соответствует тендеру?', 'Доступно для учеников?'];

  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const setAnswer = (q: string, val: boolean) => {
    setAnswers(prev => ({ ...prev, [q]: val }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitInspection({
        school_id: school.id,
        promise_id: promise?.id,
        checklist_answers: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [k, v ?? false])
        ) as Record<string, boolean>,
        comment,
      });
      setResult((res as any).feedback);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <CameraIcon size={64} className="text-white/10" />
          <p className="absolute bottom-20 text-white/40 font-bold uppercase tracking-widest text-xs">
            Камера · GPS: {school.lat.toFixed(4)}, {school.lng.toFixed(4)}
          </p>
        </div>

        <button onClick={onCancel} className="absolute top-10 left-10 w-12 h-12 glass-dark rounded-full flex items-center justify-center text-white z-10">
          <X size={24} />
        </button>

        {result ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-dark p-10 rounded-[40px] max-w-md text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-white text-2xl font-bold mb-2">+{result.points_awarded} очков!</h3>
              <p className="text-slate-400 mb-6">{result.message}</p>
              <button onClick={onSubmit} className="dash-button-black w-full py-4">
                Закрыть
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="absolute top-10 right-10 w-80 glass-dark p-6 rounded-[40px] z-10">
            <h3 className="text-white text-base font-bold mb-2">{promise?.title ?? 'Проверка'}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">{school.name_ru}</p>
            <div className="space-y-4">
              {checklist.map((q, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-xs font-bold text-slate-400">{q}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAnswer(q, true)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                        answers[q] === true ? 'bg-lime-500 text-white' : 'bg-white/10 text-white hover:bg-lime-500/30'
                      }`}
                    >ДА</button>
                    <button
                      onClick={() => setAnswer(q, false)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                        answers[q] === false ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-red-500/30'
                      }`}
                    >НЕТ</button>
                  </div>
                </div>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Комментарий (необязательно)..."
              className="mt-4 w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-600 resize-none outline-none"
              rows={2}
            />
          </div>
        )}
      </div>

      {!result && (
        <div className="h-32 bg-black flex items-center justify-center gap-12">
          <div className="w-14 h-14 rounded-2xl border-2 border-white/20 flex items-center justify-center text-white/40">
            <Calendar size={20} />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-20 h-20 rounded-full border-8 border-white/20 p-2 group disabled:opacity-50"
          >
            <div className="w-full h-full bg-white rounded-full group-active:scale-90 transition-transform" />
          </button>
          <div className="w-14 h-14 rounded-2xl border-2 border-white/20 flex items-center justify-center text-white/40">
            <Users size={20} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

function ProfileView({ user }: { user: User | null }) {
  if (!user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-slate-400 font-bold">Загрузка профиля...</div>
      </motion.div>
    );
  }

  const QUESTS = [
    { title: 'Проверь 10 школ', reward: '500 XP', progress: Math.min(100, user.points_total / 50) },
    { title: 'Найди 5 проблем', reward: '300 XP', progress: Math.min(100, user.streak * 5) },
    { title: 'Ежедневный патруль', reward: '100 XP', progress: user.streak > 0 ? 100 : 0 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-4 space-y-8">
        <div className="dash-card text-center relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="relative z-10">
            <div className="w-28 h-28 mx-auto mb-6 relative">
              <img src="https://picsum.photos/seed/anvar/200/200" className="w-full h-full rounded-[40px] object-cover border-4 border-white shadow-xl" alt="Profile" />
              <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-orange-500 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white">
                <Award size={16} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              Lvl {user.level} · {user.points_season.toLocaleString()} PTS
            </p>
            <div className="mb-6">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>XP</span><span>{user.xp}/{user.xp_next}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(user.xp / user.xp_next) * 100}%` }} className="h-full bg-blue-500 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100">
                <p className="text-xl font-bold text-gray-900">{user.streak}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Стрик</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100">
                <p className="text-xl font-bold text-gray-900">{user.max_streak}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Рекорд</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Достижения</h3>
          <div className="grid grid-cols-2 gap-3">
            {user.badges.map(b => (
              <div key={b.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center cursor-pointer hover:bg-white hover:shadow-md transition-all">
                <span className="text-2xl mb-2 block">{b.icon}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{b.title}</p>
                <p className="text-[8px] font-medium text-slate-400 uppercase">{b.description}</p>
              </div>
            ))}
            {user.badges.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
                Пока нет достижений. Начните проверять школы!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div className="dash-card bg-gray-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold mb-1">Battle Pass</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Сезон 4: Цифровой Контроль</p>
              </div>
              <div className="text-right">
                <p className="text-orange-400 font-bold text-sm">{user.streak_freezes} заморозки</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">streak freeze</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(i => {
                const unlocked = user.level >= i * 2;
                return (
                  <div key={i} className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    unlocked ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500'
                  }`}>
                    <span className="text-xl">{i === 1 ? '📦' : i === 2 ? '💎' : i === 3 ? '⚡' : i === 4 ? '🏆' : '🔒'}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest">Tier {i + 10}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dash-card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Активные Квесты</h3>
          <div className="space-y-4">
            {QUESTS.map((q, i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center gap-5 flex-1">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                    <Target size={18} />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-gray-900 text-sm">{q.title}</p>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{q.reward}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${q.progress}%` }}
                        className={`h-full ${q.progress >= 100 ? 'bg-lime-500' : 'bg-blue-500'}`}
                      />
                    </div>
                  </div>
                </div>
                <div className="ml-6">
                  {q.progress >= 100
                    ? <CheckCircle2 className="text-lime-500" size={22} />
                    : <ChevronRight className="text-slate-300" size={22} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

