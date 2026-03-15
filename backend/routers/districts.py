from fastapi import APIRouter
from database import get_db

router = APIRouter(prefix="/districts", tags=["districts"])


@router.get("")
def list_districts(oblast: str = None):
    with get_db() as conn:
        cur = conn.cursor()
        if oblast:
            cur.execute(
                "SELECT * FROM districts WHERE oblast = %s ORDER BY fulfillment_rate DESC",
                (oblast,)
            )
        else:
            cur.execute("SELECT * FROM districts ORDER BY fulfillment_rate DESC")
        return [dict(r) for r in cur.fetchall()]


@router.get("/{name}")
def get_district(name: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM districts WHERE name = %s", (name,))
        row = cur.fetchone()
        if not row:
            return {"name": name, "total_schools": 0, "fulfillment_rate": 0}
        d = dict(row)

        cur.execute("""
            SELECT id, name_ru, status, capture_level, lat, lng
            FROM schools WHERE district = %s
            ORDER BY name_ru
        """, (name,))
        d["schools"] = [dict(s) for s in cur.fetchall()]
        return d
