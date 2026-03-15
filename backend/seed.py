"""
Seed script: loads geoasr_data.xlsx into PostgreSQL.
Run once: py -3 seed.py
"""
import sys, os, json, random, uuid
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import get_db, init_db
import openpyxl

XLSX_PATH = Path(__file__).parent.parent / "geoasr_data.xlsx"

random.seed(42)

# Tashkent district centre coordinates
DISTRICT_COORDS = {
    "Yangihayot tumani":    (41.2395, 69.1765),
    "Chilonzor tumani":     (41.2931, 69.2076),
    "Yunusobod tumani":     (41.3659, 69.3076),
    "Shayxontoxur tumani":  (41.3297, 69.2698),
    "Mirzo Ulug'bek tumani":(41.3385, 69.3350),
    "Mirzo Ulugʻbek tumani":(41.3385, 69.3350),
    "Uchtepa tumani":       (41.2993, 69.2266),
    # Tashkent region districts
    "Bekobod tumani":       (40.2228, 69.2214),
    "Quyichirchiq tumani":  (41.20,   69.80),
    "Chinoz tuman":         (40.9376, 68.7656),
    "Boʻka tumani":         (41.50,   69.70),
    "Zangiota tumani":      (41.24,   69.38),
    "Ohangaron tumani":     (40.90,   69.65),
    "Boʻstonliq tumani":    (41.80,   70.00),
    "Yangiyo'l tumani":     (40.98,   69.04),
    "Oqqo'rg'on tumani":    (41.06,   69.78),
    "Olmaliq Shahar":       (40.85,   69.59),
}

OBLAST_COORDS = {
    "Samarqand viloyati":           (39.65, 66.96),
    "Qoraqolpog'iston Respublikasi":(43.80, 59.60),
    "Surxondaryo viloyati":         (37.93, 67.57),
    "Qashqadaryo viloyati":         (38.86, 65.79),
    "Jizzax viloyati":              (40.12, 67.84),
    "Andijon viloyati":             (40.78, 72.34),
    "Farg'ona viloyati":            (40.38, 71.78),
    "Toshkent viloyati":            (41.26, 69.48),
    "Toshkent shahar":              (41.30, 69.25),
    "Sirdaryo viloyati":            (40.83, 68.66),
    "Namangan viloyati":            (41.00, 71.67),
    "Buxoro viloyati":              (39.77, 64.42),
    "Navoiy viloyati":              (40.10, 65.38),
    "Xorazm viloyati":              (41.55, 60.63),
}


def coords_for(district: str, oblast: str):
    if district in DISTRICT_COORDS:
        base = DISTRICT_COORDS[district]
    else:
        base = OBLAST_COORDS.get(oblast, (41.30, 69.25))
    spread = 0.04
    return (
        round(base[0] + random.uniform(-spread, spread), 6),
        round(base[1] + random.uniform(-spread, spread), 6),
    )


def school_status(row):
    problems = 0
    gym = str(row.get("Спортзал") or "Нет")
    cafe = str(row.get("Столовая") or "Нет")
    water = str(row.get("Питьевая вода") or "Нет")
    elec = str(row.get("Электричество") or "Нет")
    if "Нет" in gym or "qisman" in gym.lower():
        problems += 1
    if "Нет" in cafe or "qisman" in cafe.lower() or "ishlamaydi" in cafe.lower():
        problems += 1
    if "Нет" in water or "Привозная" in water:
        problems += 1
    if "Частично" in elec or elec == "Нет":
        problems += 1
    if problems >= 3:
        return "problem"
    if problems >= 1:
        return "stale"
    return "ok"


PROMISE_TEMPLATES = [
    {
        "condition": lambda r: "Нет" in str(r.get("Спортзал") or "") or "qisman" in str(r.get("Спортзал") or "").lower(),
        "title": "Ремонт/строительство спортивного зала",
        "desc": "Школа не имеет функционирующего спортивного зала.",
        "type": "capital",
        "checklist": ["Спортивный зал построен/отремонтирован?", "Оборудование установлено?", "Зал доступен для учащихся?"],
    },
    {
        "condition": lambda r: any(x in str(r.get("Столовая") or "") for x in ["Нет", "qisman", "ishlamaydi"]),
        "title": "Восстановление столовой",
        "desc": "Столовая не функционирует или требует ремонта.",
        "type": "consumable",
        "checklist": ["Столовая работает?", "Питание предоставляется?", "Санитарные нормы соблюдаются?"],
    },
    {
        "condition": lambda r: str(r.get("Питьевая вода") or "") in ("Нет", "Привозная"),
        "title": "Подключение к водоснабжению",
        "desc": "Школа не имеет доступа к централизованной питьевой воде.",
        "type": "capital",
        "checklist": ["Водопровод проведён?", "Вода соответствует нормам?", "Сантехника исправна?"],
    },
    {
        "condition": lambda r: str(r.get("Электричество") or "") in ("Нет", "Частично"),
        "title": "Восстановление электроснабжения",
        "desc": "Электроснабжение ненадёжно или отсутствует.",
        "type": "consumable",
        "checklist": ["Электроснабжение стабильно?", "Освещение работает во всех классах?", "Аварийное освещение установлено?"],
    },
]

STATUSES = ["pending", "in-progress", "resolved", "ignored"]


def make_promises(school_id, row):
    now = datetime.now()
    results = []
    sources = ["E-tender", "Residents"]

    for tmpl in PROMISE_TEMPLATES:
        if tmpl["condition"](row):
            deadline = now + timedelta(days=random.randint(30, 365))
            results.append({
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "title": tmpl["title"],
                "description": tmpl["desc"],
                "source": random.choice(sources),
                "deadline": deadline.date().isoformat(),
                "amount": random.randint(50_000_000, 1_000_000_000),
                "type": tmpl["type"],
                "status": random.choice(STATUSES),
                "confirmation_rate": random.randint(0, 95),
                "checklist": json.dumps(tmpl["checklist"]),
            })

    # Always add at least one general promise
    if not results or random.random() > 0.5:
        deadline = now + timedelta(days=random.randint(60, 730))
        results.append({
            "id": str(uuid.uuid4()),
            "school_id": school_id,
            "title": "Общий плановый ремонт",
            "description": "Плановый капитальный ремонт здания школы.",
            "source": "E-tender",
            "deadline": deadline.date().isoformat(),
            "amount": random.randint(100_000_000, 2_000_000_000),
            "type": "capital",
            "status": random.choice(STATUSES),
            "confirmation_rate": random.randint(0, 80),
            "checklist": json.dumps([
                "Кровля отремонтирована?",
                "Фасад в удовлетворительном состоянии?",
                "Внутренние помещения отремонтированы?",
                "Сантехника исправна?",
            ]),
        })

    return results


def compute_districts(schools_data):
    dist_map = {}
    for s in schools_data:
        key = s["district"]
        if not key:
            continue
        if key not in dist_map:
            dist_map[key] = {"name": key, "oblast": s["oblast"], "total": 0, "ok": 0, "prob": 0, "checked": 0}
        d = dist_map[key]
        d["total"] += 1
        if s["status"] == "ok":
            d["ok"] += 1
        if s["status"] == "problem":
            d["prob"] += 1
        if s["capture_level"] > 0:
            d["checked"] += 1

    result = []
    for d in dist_map.values():
        result.append({
            "name": d["name"],
            "oblast": d["oblast"],
            "total_schools": d["total"],
            "checked_ratio": round(d["checked"] / d["total"] * 100) if d["total"] else 0,
            "fulfillment_rate": round(d["ok"] / d["total"] * 100) if d["total"] else 0,
            "ignored_count": d["prob"],
            "trend": "up" if random.random() > 0.35 else "down",
        })
    return result


def seed():
    print("Initializing database schema...")
    init_db()

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM schools")
        count = cur.fetchone()["count"]
        if count > 0:
            print(f"Already seeded: {count} schools. Delete data to reseed.")
            return

    print(f"Loading xlsx from {XLSX_PATH}...")
    wb = openpyxl.load_workbook(XLSX_PATH)
    ws = wb.active
    headers = [cell.value for cell in ws[1]]

    schools_data = []
    all_promises = []

    for row_vals in ws.iter_rows(min_row=2, values_only=True):
        row = dict(zip(headers, row_vals))
        uid = row.get("UID")
        if not uid:
            continue

        school_id = str(uid)
        district = str(row.get("Район") or "")
        oblast = str(row.get("Область") or "")
        lat, lng = coords_for(district, oblast)
        status = school_status(row)

        school = {
            "id": school_id,
            "uid": uid,
            "inn": str(row.get("ИНН") or ""),
            "name_uz": str(row.get("Название (узб)") or ""),
            "name_ru": str(row.get("Название (рус)") or ""),
            "district": district,
            "oblast": oblast,
            "capacity": int(row["Вместимость"]) if row.get("Вместимость") else 0,
            "students": int(row["Учеников"]) if row.get("Учеников") else 0,
            "year_built": str(row.get("Год постройки") or ""),
            "capital_repair": str(row.get("Капремонт") or ""),
            "wall_material": str(row.get("Материал стен") or ""),
            "gym": str(row.get("Спортзал") or "Нет"),
            "auditorium": str(row.get("Актовый зал") or "Нет"),
            "cafeteria": str(row.get("Столовая") or "Нет"),
            "electricity": str(row.get("Электричество") or "Есть"),
            "water": str(row.get("Питьевая вода") or "Нет"),
            "internet": str(row.get("Интернет") or "Нет"),
            "shifts": str(row.get("Смены") or "1"),
            "lat": lat,
            "lng": lng,
            "status": status,
            "capture_level": random.randint(0, 3),
            "object_code": str(row.get("Код объекта") or ""),
        }
        schools_data.append(school)
        all_promises.extend(make_promises(school_id, row))

    districts = compute_districts(schools_data)

    print(f"Inserting {len(schools_data)} schools, {len(all_promises)} promises, {len(districts)} districts...")

    with get_db() as conn:
        cur = conn.cursor()

        # Insert schools
        for s in schools_data:
            cur.execute("""
                INSERT INTO schools
                (id, uid, inn, name_uz, name_ru, district, oblast, capacity, students,
                 year_built, capital_repair, wall_material, gym, auditorium, cafeteria,
                 electricity, water, internet, shifts, lat, lng, status, capture_level, object_code)
                VALUES
                (%(id)s, %(uid)s, %(inn)s, %(name_uz)s, %(name_ru)s, %(district)s, %(oblast)s,
                 %(capacity)s, %(students)s, %(year_built)s, %(capital_repair)s, %(wall_material)s,
                 %(gym)s, %(auditorium)s, %(cafeteria)s, %(electricity)s, %(water)s, %(internet)s,
                 %(shifts)s, %(lat)s, %(lng)s, %(status)s, %(capture_level)s, %(object_code)s)
                ON CONFLICT (id) DO NOTHING
            """, s)

        # Insert promises
        for p in all_promises:
            cur.execute("""
                INSERT INTO promises
                (id, school_id, title, description, source, deadline, amount, type, status, confirmation_rate, checklist)
                VALUES
                (%(id)s, %(school_id)s, %(title)s, %(description)s, %(source)s, %(deadline)s,
                 %(amount)s, %(type)s, %(status)s, %(confirmation_rate)s, %(checklist)s)
                ON CONFLICT (id) DO NOTHING
            """, p)

        # Insert districts
        for d in districts:
            cur.execute("""
                INSERT INTO districts (name, oblast, total_schools, checked_ratio, fulfillment_rate, ignored_count, trend)
                VALUES (%(name)s, %(oblast)s, %(total_schools)s, %(checked_ratio)s, %(fulfillment_rate)s, %(ignored_count)s, %(trend)s)
                ON CONFLICT (name) DO UPDATE SET
                    total_schools = EXCLUDED.total_schools,
                    checked_ratio = EXCLUDED.checked_ratio,
                    fulfillment_rate = EXCLUDED.fulfillment_rate,
                    ignored_count = EXCLUDED.ignored_count,
                    trend = EXCLUDED.trend,
                    updated_at = NOW()
            """, d)

        # Demo user
        cur.execute("""
            INSERT INTO users (id, name, district, streak, max_streak, points_season, points_total, level, xp, xp_next, streak_freezes, badges)
            VALUES ('demo_user', 'Анвар Саидов', 'Yunusobod tumani', 5, 14, 1250, 3400, 12, 850, 1000, 2,
            '[{"id":"b1","icon":"🛡️","title":"Страж Порядка","description":"Проверено 50 школ"},
              {"id":"b2","icon":"⚡","title":"Молния","description":"5 проверок за один день"},
              {"id":"b3","icon":"🔥","title":"Несокрушимый","description":"Серия 14 дней"}]'::jsonb)
            ON CONFLICT (id) DO NOTHING
        """)

    print(f"[OK] Seeded successfully: {len(schools_data)} schools, {len(all_promises)} promises, {len(districts)} districts")


if __name__ == "__main__":
    seed()
