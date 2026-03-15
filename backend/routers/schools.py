from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db

router = APIRouter(prefix="/schools", tags=["schools"])


@router.get("")
def list_schools(
    district: Optional[str] = None,
    oblast: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
):
    with get_db() as conn:
        cur = conn.cursor()
        where = ["1=1"]
        params = []

        if district:
            where.append("district = %s")
            params.append(district)
        if oblast:
            where.append("oblast = %s")
            params.append(oblast)
        if status:
            where.append("status = %s")
            params.append(status)
        if search:
            where.append("(name_ru ILIKE %s OR name_uz ILIKE %s OR district ILIKE %s)")
            s = f"%{search}%"
            params.extend([s, s, s])

        query = f"SELECT * FROM schools WHERE {' AND '.join(where)} ORDER BY name_ru LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        cur.execute(query, params)
        schools = cur.fetchall()

        result = []
        for school in schools:
            s = dict(school)
            cur.execute("SELECT * FROM promises WHERE school_id = %s ORDER BY deadline", (s["id"],))
            s["promises"] = [dict(p) for p in cur.fetchall()]
            result.append(s)

        return result


@router.get("/map")
def map_schools(oblast: str = "Toshkent shahar"):
    """Optimized endpoint for map view — returns coords + status only."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT s.id, s.name_ru, s.district, s.oblast, s.lat, s.lng,
                   s.status, s.capture_level,
                   COUNT(p.id) AS promise_count,
                   SUM(CASE WHEN p.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count
            FROM schools s
            LEFT JOIN promises p ON p.school_id = s.id
            WHERE s.oblast = %s
            GROUP BY s.id
            ORDER BY s.name_ru
        """, (oblast,))
        return [dict(r) for r in cur.fetchall()]


@router.get("/all-map")
def all_map_schools():
    """All schools for full map view."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT s.id, s.name_ru, s.district, s.oblast, s.lat, s.lng,
                   s.status, s.capture_level,
                   COUNT(p.id) AS promise_count
            FROM schools s
            LEFT JOIN promises p ON p.school_id = s.id
            GROUP BY s.id
        """)
        return [dict(r) for r in cur.fetchall()]


@router.get("/tasks")
def task_schools(limit: int = Query(1000, le=5000), offset: int = 0, source: Optional[str] = None, overdue: Optional[bool] = None):
    """Schools with open promises — for the Tasks/Inspections page."""
    with get_db() as conn:
        cur = conn.cursor()
        where = ["p.status IN ('pending','in-progress','resolved','waiting')"]
        params = []
        if source:
            where.append("p.source = %s")
            params.append(source)
        if overdue is True:
            where.append("p.deadline < CURRENT_DATE")
        elif overdue is False:
            where.append("(p.deadline >= CURRENT_DATE OR p.deadline IS NULL)")

        query = f"""
            SELECT s.id, s.name_ru, s.district, s.oblast, s.lat, s.lng,
                   s.status, s.capture_level,
                   COUNT(p.id) AS promise_count,
                   MIN(p.deadline) AS nearest_deadline,
                   MAX(p.amount) AS max_amount,
                   (SELECT p2.source FROM promises p2 WHERE p2.school_id = s.id AND p2.status IN ('pending','in-progress','resolved','waiting') ORDER BY p2.deadline LIMIT 1) AS source,
                   BOOL_OR(p.deadline < CURRENT_DATE) AS has_overdue
            FROM schools s
            JOIN promises p ON p.school_id = s.id
            WHERE {' AND '.join(where)}
            GROUP BY s.id
            ORDER BY BOOL_OR(p.deadline < CURRENT_DATE) DESC, MIN(p.deadline) ASC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        cur.execute(query, params)
        return [dict(r) for r in cur.fetchall()]


@router.get("/{school_id}")
def get_school(school_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM schools WHERE id = %s", (school_id,))
        school = cur.fetchone()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

        s = dict(school)
        cur.execute("SELECT * FROM promises WHERE school_id = %s ORDER BY deadline", (school_id,))
        s["promises"] = [dict(p) for p in cur.fetchall()]

        cur.execute("""
            SELECT * FROM inspections
            WHERE school_id = %s AND status = 'published'
            ORDER BY created_at DESC LIMIT 10
        """, (school_id,))
        s["inspections"] = [dict(i) for i in cur.fetchall()]

        return s
