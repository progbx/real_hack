from fastapi import APIRouter, HTTPException
from database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
def get_user(user_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        u = dict(user)
        cur.execute("""
            SELECT i.id, i.school_id, s.name_ru, i.points_awarded, i.created_at, i.status
            FROM inspections i
            JOIN schools s ON s.id = i.school_id
            WHERE i.user_id = %s
            ORDER BY i.created_at DESC
            LIMIT 20
        """, (user_id,))
        u["recent_inspections"] = [dict(r) for r in cur.fetchall()]
        return u


@router.get("/{user_id}/leaderboard")
def district_leaderboard(user_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT district FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        district = user["district"] if user else None

        cur.execute("""
            SELECT u.id, u.name, u.level, u.points_season, u.streak,
                   COUNT(i.id) AS total_inspections
            FROM users u
            LEFT JOIN inspections i ON i.user_id = u.id
            GROUP BY u.id
            ORDER BY u.points_season DESC
            LIMIT 20
        """)
        return [dict(r) for r in cur.fetchall()]
