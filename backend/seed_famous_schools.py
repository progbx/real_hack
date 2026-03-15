"""
Adds famous Tashkent schools with real coordinates to the DB.
Run: py -3 seed_famous_schools.py
"""
import sys, uuid, random
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent))
from database import get_db

random.seed(77)

SCHOOLS = [
    {
        "id": "famous-001",
        "name_ru": "Школа №1 имени Алишера Навои",
        "name_uz": "Alisher Navoiy nomidagi 1-maktab",
        "district": "Shayxontoxur tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3151, "lng": 69.2703,
        "capacity": 1200, "students": 1450,
        "year_built": "1936",
        "gym": "Есть", "cafeteria": "Есть", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "problem", "capture_level": 1,
        "promises": [
            {"title": "Капитальный ремонт актового зала", "type": "capital", "amount": 850_000_000,
             "source": "E-tender", "status": "in-progress", "deadline_days": 120,
             "checklist": ["Ремонт завершён?", "Сцена оборудована?", "Звуковая система установлена?"]},
            {"title": "Замена кровли главного корпуса", "type": "capital", "amount": 420_000_000,
             "source": "E-tender", "status": "pending", "deadline_days": 60,
             "checklist": ["Протечки устранены?", "Новая кровля установлена?"]},
            {"title": "Установка системы видеонаблюдения", "type": "consumable", "amount": 95_000_000,
             "source": "Краудсорс", "status": "pending", "deadline_days": 30,
             "checklist": ["Камеры установлены?", "Запись работает?"]},
        ]
    },
    {
        "id": "famous-002",
        "name_ru": "Школа №110",
        "name_uz": "110-maktab",
        "district": "Yunusobod tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3748, "lng": 69.3215,
        "capacity": 1000, "students": 1180,
        "year_built": "1972",
        "gym": "Есть", "cafeteria": "Есть", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "ok", "capture_level": 2,
        "promises": [
            {"title": "Модернизация компьютерного класса (40 ПК)", "type": "capital", "amount": 280_000_000,
             "source": "E-tender", "status": "resolved", "deadline_days": -30,
             "checklist": ["Компьютеры установлены?", "Интернет подключён?", "Программы установлены?"]},
            {"title": "Ремонт спортивного зала", "type": "capital", "amount": 190_000_000,
             "source": "E-tender", "status": "in-progress", "deadline_days": 45,
             "checklist": ["Пол заменён?", "Инвентарь обновлён?"]},
            {"title": "Закупка учебников на 2025-2026 год", "type": "consumable", "amount": 48_000_000,
             "source": "E-tender", "status": "resolved", "deadline_days": -10,
             "checklist": ["Учебники получены?", "Распределены ученикам?"]},
        ]
    },
    {
        "id": "famous-003",
        "name_ru": "Школа №114",
        "name_uz": "114-maktab",
        "district": "Mirzo Ulug'bek tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3492, "lng": 69.3401,
        "capacity": 900, "students": 1050,
        "year_built": "1968",
        "gym": "Есть", "cafeteria": "Нет", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "problem", "capture_level": 0,
        "promises": [
            {"title": "Строительство школьной столовой", "type": "capital", "amount": 1_200_000_000,
             "source": "E-tender", "status": "pending", "deadline_days": 180,
             "checklist": ["Фундамент заложен?", "Стены возведены?", "Оборудование установлено?", "Санэпид разрешение получено?"]},
            {"title": "Замена отопительной системы", "type": "capital", "amount": 340_000_000,
             "source": "Краудсорс", "status": "in-progress", "deadline_days": 90,
             "checklist": ["Старые трубы демонтированы?", "Новые радиаторы установлены?", "Теплоноситель запущен?"]},
            {"title": "Ремонт туалетов (4 блока)", "type": "consumable", "amount": 62_000_000,
             "source": "Краудсорс", "status": "ignored", "deadline_days": -60,
             "checklist": ["Сантехника заменена?", "Вентиляция работает?"]},
        ]
    },
    {
        "id": "famous-004",
        "name_ru": "Республиканская специализированная школа-интернат №1",
        "name_uz": "1-Respublika ixtisoslashtirilgan maktab-internat",
        "district": "Yunusobod tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3680, "lng": 69.3058,
        "capacity": 600, "students": 580,
        "year_built": "1960",
        "gym": "Есть", "cafeteria": "Есть", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "ok", "capture_level": 3,
        "promises": [
            {"title": "Оснащение лаборатории физики и химии", "type": "capital", "amount": 520_000_000,
             "source": "E-tender", "status": "resolved", "deadline_days": -45,
             "checklist": ["Оборудование получено?", "Лаборатория сертифицирована?"]},
            {"title": "Ремонт общежития (блок А)", "type": "capital", "amount": 780_000_000,
             "source": "E-tender", "status": "in-progress", "deadline_days": 75,
             "checklist": ["Комнаты отремонтированы?", "Санузлы исправны?", "Мебель обновлена?"]},
        ]
    },
    {
        "id": "famous-005",
        "name_ru": "Президентская школа г. Ташкент",
        "name_uz": "Toshkent shahri Prezident maktabi",
        "district": "Yunusobod tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3720, "lng": 69.3140,
        "capacity": 800, "students": 720,
        "year_built": "2019",
        "gym": "Есть", "cafeteria": "Есть", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "ok", "capture_level": 2,
        "promises": [
            {"title": "Установка солнечных панелей (энергонезависимость)", "type": "capital", "amount": 950_000_000,
             "source": "E-tender", "status": "in-progress", "deadline_days": 200,
             "checklist": ["Панели смонтированы?", "Инвертор установлен?", "Сеть подключена?"]},
            {"title": "Расширение библиотечного фонда", "type": "consumable", "amount": 75_000_000,
             "source": "E-tender", "status": "pending", "deadline_days": 40,
             "checklist": ["Книги получены?", "Каталог обновлён?"]},
        ]
    },
    {
        "id": "famous-006",
        "name_ru": "Школа №278 имени Амира Темура",
        "name_uz": "Amir Temur nomidagi 278-maktab",
        "district": "Chilonzor tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.2914, "lng": 69.2034,
        "capacity": 1400, "students": 1680,
        "year_built": "1985",
        "gym": "Есть", "cafeteria": "Нет", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "problem", "capture_level": 1,
        "promises": [
            {"title": "Капремонт фасада и кровли", "type": "capital", "amount": 1_100_000_000,
             "source": "E-tender", "status": "pending", "deadline_days": 150,
             "checklist": ["Фасад оштукатурен?", "Кровля заменена?", "Окна установлены?"]},
            {"title": "Строительство второй столовой", "type": "capital", "amount": 680_000_000,
             "source": "Краудсорс", "status": "ignored", "deadline_days": -90,
             "checklist": ["Проект согласован?", "Строительство начато?"]},
            {"title": "Закупка спортивного инвентаря", "type": "consumable", "amount": 35_000_000,
             "source": "E-tender", "status": "resolved", "deadline_days": -15,
             "checklist": ["Инвентарь получен?", "Распределён по секциям?"]},
        ]
    },
    {
        "id": "famous-007",
        "name_ru": "Школа №6 с углублённым изучением английского",
        "name_uz": "Chuqurlashtirilgan ingliz tili ta'limi 6-maktab",
        "district": "Mirzo Ulug'bek tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3420, "lng": 69.3280,
        "capacity": 750, "students": 810,
        "year_built": "1978",
        "gym": "Нет", "cafeteria": "Есть", "internet": "Есть",
        "electricity": "Есть", "water": "Есть",
        "status": "stale", "capture_level": 0,
        "promises": [
            {"title": "Строительство спортзала", "type": "capital", "amount": 920_000_000,
             "source": "E-tender", "status": "pending", "deadline_days": 300,
             "checklist": ["Разрешение получено?", "Фундамент заложен?", "Строительство завершено?"]},
            {"title": "Закупка интерактивных досок (12 шт.)", "type": "capital", "amount": 144_000_000,
             "source": "E-tender", "status": "in-progress", "deadline_days": 25,
             "checklist": ["Доски получены?", "Установлены в классах?", "Учителя прошли обучение?"]},
        ]
    },
    {
        "id": "famous-008",
        "name_ru": "Школа №34 имени Бобура",
        "name_uz": "Bobur nomidagi 34-maktab",
        "district": "Shayxontoxur tumani",
        "oblast": "Toshkent shahar",
        "lat": 41.3250, "lng": 69.2780,
        "capacity": 850, "students": 920,
        "year_built": "1955",
        "gym": "Есть", "cafeteria": "Нет", "internet": "Нет",
        "electricity": "Есть", "water": "Есть",
        "status": "problem", "capture_level": 0,
        "promises": [
            {"title": "Подключение интернета (оптоволокно)", "type": "consumable", "amount": 28_000_000,
             "source": "Краудсорс", "status": "ignored", "deadline_days": -120,
             "checklist": ["Кабель проложен?", "Роутеры установлены?", "Скорость >100 Мбит/с?"]},
            {"title": "Строительство столовой", "type": "capital", "amount": 750_000_000,
             "source": "E-tender", "status": "pending", "deadline_days": 240,
             "checklist": ["Проект готов?", "Стройка начата?", "Объект сдан?"]},
            {"title": "Ремонт классных комнат (1-й этаж)", "type": "consumable", "amount": 95_000_000,
             "source": "E-tender", "status": "in-progress", "deadline_days": 50,
             "checklist": ["Штукатурка выполнена?", "Покраска завершена?", "Мебель расставлена?"]},
        ]
    },
]


def run():
    with get_db() as conn:
        cur = conn.cursor()

        inserted = 0
        skipped = 0

        for s in SCHOOLS:
            # Check if exists
            cur.execute("SELECT id FROM schools WHERE id = %s", (s["id"],))
            if cur.fetchone():
                print(f"  skip (exists): {s['id']}")
                skipped += 1
                continue

            cur.execute("""
                INSERT INTO schools
                  (id, name_uz, name_ru, district, oblast, lat, lng,
                   capacity, students, year_built, gym, cafeteria, internet,
                   electricity, water, status, capture_level)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                s["id"], s["name_uz"], s["name_ru"], s["district"], s["oblast"],
                s["lat"], s["lng"], s["capacity"], s["students"], s["year_built"],
                s["gym"], s["cafeteria"], s["internet"], s["electricity"], s["water"],
                s["status"], s["capture_level"],
            ))

            # Insert promises
            for p in s["promises"]:
                pid = str(uuid.uuid4())
                deadline = datetime.now() + timedelta(days=p["deadline_days"])
                confirmation = random.randint(60, 95) if p["status"] == "resolved" else random.randint(5, 50)
                cur.execute("""
                    INSERT INTO promises
                      (id, school_id, title, type, source, status, deadline,
                       amount, confirmation_rate, checklist)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                """, (
                    pid, s["id"], p["title"],
                    "capital" if p["type"] == "capital" else "consumable",
                    p["source"], p["status"], deadline.date(),
                    p["amount"], confirmation,
                    __import__("json").dumps(p["checklist"], ensure_ascii=False),
                ))

            print(f"  + inserted: {s['id']} ({len(s['promises'])} promises)")
            inserted += 1

        print(f"\nDone: {inserted} inserted, {skipped} skipped")


if __name__ == "__main__":
    run()
