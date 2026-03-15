const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Ошибка ${res.status}`);
  }
  return res.json();
}

export interface SchoolMapItem {
  id: string;
  name_ru: string;
  district: string;
  oblast: string;
  lat: number;
  lng: number;
  status: 'ok' | 'problem' | 'stale';
  capture_level: number;
  promise_count: number;
  resolved_count?: number;
}

export interface SchoolPromise {
  id: string;
  school_id: string;
  title: string;
  description: string;
  source: string;
  deadline: string;
  amount: number;
  type: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'waiting' | 'confirmed' | 'ignored';
  confirmation_rate: number;
  checklist: string[];
}

export interface School extends SchoolMapItem {
  uid: number;
  inn: string;
  name_uz: string;
  capacity: number;
  students: number;
  year_built: string;
  capital_repair: string;
  wall_material: string;
  gym: string;
  auditorium: string;
  cafeteria: string;
  electricity: string;
  water: string;
  internet: string;
  shifts: string;
  promises: SchoolPromise[];
  inspections: unknown[];
}

export interface TaskSchool {
  id: string;
  name_ru: string;
  district: string;
  oblast: string;
  lat: number;
  lng: number;
  status: 'ok' | 'problem' | 'stale';
  capture_level: number;
  promise_count: number;
  nearest_deadline: string | null;
  max_amount: number | null;
  source: string | null;
  has_overdue: boolean;
}

export interface District {
  name: string;
  oblast: string;
  total_schools: number;
  checked_ratio: number;
  fulfillment_rate: number;
  ignored_count: number;
  trend: 'up' | 'down';
}

export interface Stats {
  total_schools: number;
  total_promises: number;
  weekly_inspections: number;
  promise_completion: number;
  active_inspectors: number;
  top_problem_schools: { name_ru: string; district: string; status: string; open_promises: number }[];
  recent_activity: { school_id: string; name_ru: string; created_at: string }[];
  infrastructure: { gym: number; water: number; internet: number; cafeteria: number; electricity: number };
  promise_funnel: { pending?: number; 'in-progress'?: number; resolved?: number; waiting?: number; confirmed?: number; ignored?: number };
  school_statuses: { ok?: number; problem?: number; stale?: number };
}

export interface User {
  id: string;
  uid: number;
  username: string;
  first_name: string;
  last_name: string;
  name: string;
  district: string;
  streak: number;
  max_streak: number;
  points_season: number;
  points_total: number;
  level: number;
  xp: number;
  xp_next: number;
  streak_freezes: number;
  badges: { id: string; icon: string; title: string; description: string }[];
  recent_inspections: unknown[];
}

export const api = {
  getMapSchools: (oblast = 'Toshkent shahar') =>
    get<SchoolMapItem[]>(`/schools/map?oblast=${encodeURIComponent(oblast)}`),

  getAllMapSchools: () =>
    get<SchoolMapItem[]>('/schools/all-map'),

  getSchool: (id: string) =>
    get<School>(`/schools/${id}`),

  searchSchools: (search: string) =>
    get<School[]>(`/schools?search=${encodeURIComponent(search)}&limit=10`),

  getDistricts: (oblast?: string) =>
    get<District[]>(`/districts${oblast ? `?oblast=${encodeURIComponent(oblast)}` : ''}`),

  getTaskSchools: (opts?: { source?: string; overdue?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.source) params.set('source', opts.source);
    if (opts?.overdue !== undefined) params.set('overdue', String(opts.overdue));
    const qs = params.toString();
    return get<TaskSchool[]>(`/schools/tasks${qs ? '?' + qs : ''}`);
  },

  getStats: () =>
    get<Stats>('/stats'),

  getUser: (id = 'demo_user') =>
    get<User>(`/users/${id}`),

  submitInspection: async (data: { school_id: string; promise_id?: string; checklist_answers: Record<string, boolean>; comment?: string; photos?: File[] }, userId = 'demo_user') => {
    const fd = new FormData();
    fd.append('school_id', data.school_id);
    if (data.promise_id) fd.append('promise_id', data.promise_id);
    fd.append('user_id', userId);
    fd.append('checklist_answers', JSON.stringify(data.checklist_answers));
    if (data.comment) fd.append('comment', data.comment);
    if (data.photos) {
      for (const photo of data.photos) {
        fd.append('photos', photo);
      }
    }
    const res = await fetch(`${BASE}/inspections`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка ${res.status}`);
    }
    return res.json();
  },

  signup: (username: string, first_name: string, last_name: string, password: string) =>
    post<User>('/auth/signup', { username, first_name, last_name, password }),

  login: (username: string, password: string) =>
    post<User>('/auth/login', { username, password }),

  createPromise: async (data: {
    school_id: string;
    title: string;
    description?: string;
    source?: string;
    deadline?: string;
    type?: string;
    checklist?: string[];
    photos?: File[];
  }) => {
    const fd = new FormData();
    fd.append('school_id', data.school_id);
    fd.append('title', data.title);
    if (data.description) fd.append('description', data.description);
    fd.append('source', data.source || 'Народный');
    if (data.deadline) fd.append('deadline', data.deadline);
    fd.append('type', data.type || 'consumable');
    fd.append('checklist', JSON.stringify(data.checklist || []));
    if (data.photos) {
      for (const photo of data.photos) fd.append('photos', photo);
    }
    const res = await fetch(`${BASE}/promises`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка ${res.status}`);
    }
    return res.json();
  },
};
