import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_NAME = os.getenv("DB_NAME", "realholat")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")


def get_connection():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    kwargs = dict(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, cursor_factory=psycopg2.extras.RealDictCursor)
    if DB_PASSWORD:
        kwargs["password"] = DB_PASSWORD
    return psycopg2.connect(**kwargs)


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    uid INTEGER,
    inn TEXT,
    name_uz TEXT,
    name_ru TEXT NOT NULL,
    district TEXT,
    oblast TEXT,
    capacity INTEGER DEFAULT 0,
    students INTEGER DEFAULT 0,
    year_built TEXT,
    capital_repair TEXT,
    wall_material TEXT,
    gym TEXT DEFAULT 'Нет',
    auditorium TEXT DEFAULT 'Нет',
    cafeteria TEXT DEFAULT 'Нет',
    electricity TEXT DEFAULT 'Есть',
    water TEXT DEFAULT 'Нет',
    internet TEXT DEFAULT 'Нет',
    shifts TEXT DEFAULT '1',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status TEXT DEFAULT 'stale',
    capture_level INTEGER DEFAULT 0,
    object_code TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promises (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'E-tender',
    deadline DATE,
    amount BIGINT,
    type TEXT DEFAULT 'consumable',
    status TEXT DEFAULT 'pending',
    confirmation_rate INTEGER DEFAULT 0,
    checklist JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    promise_id TEXT REFERENCES promises(id),
    user_id TEXT DEFAULT 'anonymous',
    checklist_answers JSONB DEFAULT '{}',
    comment TEXT,
    status TEXT DEFAULT 'processing',
    points_awarded INTEGER DEFAULT 0,
    camera_validated BOOLEAN DEFAULT FALSE,
    publish_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL DEFAULT '',
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    district TEXT,
    streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    points_season INTEGER DEFAULT 0,
    points_total INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_next INTEGER DEFAULT 1000,
    streak_freezes INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS districts (
    name TEXT PRIMARY KEY,
    oblast TEXT,
    total_schools INTEGER DEFAULT 0,
    checked_ratio INTEGER DEFAULT 0,
    fulfillment_rate INTEGER DEFAULT 0,
    ignored_count INTEGER DEFAULT 0,
    trend TEXT DEFAULT 'up',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_oblast ON schools(oblast);
CREATE INDEX IF NOT EXISTS idx_schools_district ON schools(district);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);
CREATE INDEX IF NOT EXISTS idx_promises_school ON promises(school_id);
CREATE INDEX IF NOT EXISTS idx_inspections_school ON inspections(school_id);
"""


MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''",
]


def init_db():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(SCHEMA)
        for migration in MIGRATIONS:
            try:
                cur.execute(migration)
            except Exception:
                pass
        print("Database schema initialized.")
