from fastapi import APIRouter
from database import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def global_stats():
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) AS total FROM schools")
        total_schools = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM inspections WHERE created_at > NOW() - INTERVAL '7 days'")
        weekly_inspections = cur.fetchone()["total"]

        cur.execute("""
            SELECT ROUND(AVG(confirmation_rate)) AS avg_rate FROM promises
            WHERE status = 'resolved'
        """)
        avg = cur.fetchone()["avg_rate"]
        promise_completion = int(avg) if avg else 0

        cur.execute("SELECT COUNT(DISTINCT user_id) AS active FROM inspections WHERE created_at > NOW() - INTERVAL '30 days'")
        active_inspectors = cur.fetchone()["active"]

        cur.execute("""
            SELECT s.name_ru, s.district, s.status, COUNT(p.id) AS open_promises
            FROM schools s
            JOIN promises p ON p.school_id = s.id
            WHERE p.status IN ('pending', 'in-progress')
            GROUP BY s.id
            ORDER BY open_promises DESC
            LIMIT 5
        """)
        top_schools = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT i.school_id, s.name_ru, i.created_at
            FROM inspections i
            JOIN schools s ON s.id = i.school_id
            ORDER BY i.created_at DESC
            LIMIT 10
        """)
        recent_activity = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE gym NOT ILIKE '%нет%' AND gym NOT ILIKE '%qisman%' AND gym != '') AS has_gym,
                COUNT(*) FILTER (WHERE water NOT ILIKE '%нет%' AND water NOT ILIKE '%привоз%' AND water != '') AS has_water,
                COUNT(*) FILTER (WHERE internet NOT ILIKE '%нет%' AND internet != '') AS has_internet,
                COUNT(*) FILTER (WHERE cafeteria NOT ILIKE '%нет%' AND cafeteria NOT ILIKE '%ishlamaydi%' AND cafeteria != '') AS has_cafeteria,
                COUNT(*) FILTER (WHERE electricity NOT ILIKE '%нет%' AND electricity NOT ILIKE '%частично%' AND electricity != '') AS has_electricity,
                COUNT(*) AS total
            FROM schools
        """)
        inf = dict(cur.fetchone())
        total = inf["total"] or 1
        infrastructure = {
            "gym":         round(inf["has_gym"] / total * 100),
            "water":       round(inf["has_water"] / total * 100),
            "internet":    round(inf["has_internet"] / total * 100),
            "cafeteria":   round(inf["has_cafeteria"] / total * 100),
            "electricity": round(inf["has_electricity"] / total * 100),
        }

        cur.execute("""
            SELECT status, COUNT(*) AS cnt FROM promises GROUP BY status
        """)
        promise_funnel = {r["status"]: r["cnt"] for r in cur.fetchall()}

        cur.execute("""
            SELECT status, COUNT(*) AS cnt FROM schools GROUP BY status
        """)
        school_statuses = {r["status"]: r["cnt"] for r in cur.fetchall()}

        cur.execute("""
            SELECT COUNT(*) AS total FROM promises
        """)
        total_promises = cur.fetchone()["total"]

        return {
            "total_schools": total_schools,
            "total_promises": total_promises,
            "weekly_inspections": weekly_inspections,
            "promise_completion": promise_completion,
            "active_inspectors": active_inspectors,
            "top_problem_schools": top_schools,
            "recent_activity": recent_activity,
            "infrastructure": infrastructure,
            "promise_funnel": promise_funnel,
            "school_statuses": school_statuses,
        }
