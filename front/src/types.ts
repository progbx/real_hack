export type View = 'dashboard' | 'rating' | 'school' | 'capture' | 'inspection' | 'profile';

export interface School {
  id: string;
  name: string;
  address: string;
  district: string;
  status: 'ok' | 'problem' | 'stale';
  captureLevel: number; // 0-3
  promises: Promise[];
  photos: string[];
  coordinates: { lat: number; lng: number };
}

export interface Promise {
  id: string;
  title: string;
  source: 'E-tender' | 'Residents';
  deadline: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'ignored';
  confirmationRate: number; // percentage
}

export interface District {
  name: string;
  fulfillmentRate: number;
  totalSchools: number;
  checkedRatio: number;
  ignoredCount: number;
  trend: 'up' | 'down';
}

export interface User {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpNext: number;
  streak: number;
  maxStreak: number;
  streakFrozen: boolean;
  points: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CheckItem {
  id: string;
  question: string;
  type: 'boolean' | 'scale';
}
