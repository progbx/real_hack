const BASE = 'http://localhost:8000/api';

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
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
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
  status: 'pending' | 'in-progress' | 'resolved' | 'ignored';
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
  weekly_inspections: number;
  promise_completion: number;
  active_inspectors: number;
  top_problem_schools: { name_ru: string; district: string; status: string; open_promises: number }[];
  recent_activity: { school_id: string; name_ru: string; created_at: string }[];
}

export interface User {
  id: string;
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

  getStats: () =>
    get<Stats>('/stats'),

  getUser: (id = 'demo_user') =>
    get<User>(`/users/${id}`),

  submitInspection: (data: { school_id: string; promise_id?: string; checklist_answers: Record<string, boolean>; comment?: string }) =>
    post('/inspections', { ...data, user_id: 'demo_user' }),
};
