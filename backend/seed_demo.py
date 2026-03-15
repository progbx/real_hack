"""
Demo data seeder: adds realistic users + inspections + fixes infrastructure stats.
Run: py -3 seed_demo.py
"""
import sys, uuid, random
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from database import get_db, init_db
from passlib.context import CryptContext

random.seed(7)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    ("anvar_s",    "Анвар",      "Саидов",      "Chilonzor tumani"),
    ("malika_t",   "Малика",     "Турсунова",   "Yunusobod tumani"),
    ("jasur_r",    "Жасур",      "Рашидов",     "Uchtepa tumani"),
    ("dilnoza_k",  "Дилноза",    "Каримова",    "Shayxontoxur tumani"),
    ("bobur_x",    "Бобур",      "Холиков",     "Yangihayot tumani"),
    ("sarvinoz_u", "Сарвиноз",   "Усманова",    "Mirzo Ulug'bek tumani"),
    ("otabek_n",   "Отабек",     "Назаров",     "Chilonzor tumani"),
    ("feruza_m",   "Феруза",     "Мирзаева",    "Yunusobod tumani"),
    ("sherzod_b",  "Шерзод",     "Бахромов",    "Uchtepa tumani"),
    ("nodira_a",   "Нодира",     "Азимова",     "Shayxontoxur tumani"),
]

def seed_demo():
    init_db()

    with get_db() as conn:
        cur = conn.cursor()

        # Check if demo already seeded
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE username = 'anvar_s'")
        if cur.fetchone()["c"] > 0:
            print("Demo data already seeded.")
            return

        # Get school ids
        cur.execute("SELECT id FROM schools ORDER BY random() LIMIT 200")
        school_ids = [r["id"] for r in cur.fetchall()]

        # Get promise ids
        cur.execute("SELECT id, school_id FROM promises ORDER BY random() LIMIT 500")
        promises = [(r["id"], r["school_id"]) for r in cur.fetchall()]

        if not school_ids:
            print("No schools found. Run seed.py first.")
            return

        now = datetime.now()
        all_users = []

        print(f"Seeding {len(DEMO_USERS)} demo users...")
        for username, first, last, district in DEMO_USERS:
            uid = str(uuid.uuid4())
            streak = random.randint(1, 14)
            level = random.randint(2, 18)
            points = random.randint(500, 12000)
            xp = random.randint(0, 999)

            cur.execute("""
                INSERT INTO users
                (id, username, first_name, last_name, name, password_hash,
                 district, streak, max_streak, points_season, points_total,
                 level, xp, xp_next, streak_freezes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                uid, username, first, last, f"{first} {last}",
                pwd_context.hash("demo1234"),
                district, streak, streak + random.randint(0, 5),
                points, points + random.randint(100, 5000),
                level, xp, 1000, random.randint(0, 3),
            ))
            all_users.append(uid)

        # Seed inspections spread over last 30 days
        total_inspections = random.randint(140, 180)
        print(f"Seeding {total_inspections} demo inspections...")
        for _ in range(total_inspections):
            user_id = random.choice(all_users)
            school_id = random.choice(school_ids)
            promise_entry = random.choice(promises) if promises and random.random() > 0.3 else None
            promise_id = promise_entry[0] if promise_entry else None

            days_ago = random.randint(0, 29)
            hours_ago = random.randint(0, 23)
            created = now - timedelta(days=days_ago, hours=hours_ago)
            points_awarded = random.randint(10, 80)

            cur.execute("""
                INSERT INTO inspections
                (id, school_id, promise_id, user_id, checklist_answers,
                 comment, status, points_awarded, camera_validated, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                str(uuid.uuid4()), school_id, promise_id, user_id,
                '{"q1": true, "q2": true, "q3": false}',
                random.choice(["Хорошее состояние", "Требует ремонта", "Работы идут", None]),
                random.choice(["validated", "processing", "validated", "validated"]),
                points_awarded, random.random() > 0.6, created,
            ))

        # Fix infrastructure stats: update promises resolved confirmation rates to be realistic
        cur.execute("""
            UPDATE promises
            SET confirmation_rate = floor(random() * 60 + 35)::int
            WHERE status = 'resolved' AND confirmation_rate = 0
        """)

        print("Demo data seeded successfully!")
        print(f"  Users: {len(DEMO_USERS)}")
        print(f"  Inspections: {total_inspections}")
        print("  Passwords: demo1234")

if __name__ == "__main__":
    seed_demo()
