from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from datetime import datetime, timedelta
import uuid, random, json

router = APIRouter(prefix="/inspections", tags=["inspections"])


class InspectionCreate(BaseModel):
    school_id: str
    promise_id: Optional[str] = None
    user_id: str = "demo_user"
    checklist_answers: dict = {}
    comment: Optional[str] = None


@router.post("")
def submit_inspection(data: InspectionCreate):
    """Submit a new inspection (photo + checklist)."""
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("SELECT * FROM schools WHERE id = %s", (data.school_id,))
        school = cur.fetchone()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

        cur.execute("SELECT * FROM users WHERE id = %s", (data.user_id,))
        user = cur.fetchone()
        streak = user["streak"] if user else 1

        # Scoring
        base_points = 10
        streak_mult = 1.0
        if streak >= 30:
            streak_mult = 3.0
        elif streak >= 14:
            streak_mult = 2.0
        elif streak >= 7:
            streak_mult = 1.5

        density_mult = 1 / (random.randint(1, 5) + 1)
        points = max(1, round(base_points * density_mult * streak_mult))

        # Delayed publication 12-72h
        delay_hours = random.randint(12, 72)
        publish_at = datetime.now() + timedelta(hours=delay_hours)

        inspection_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inspections
            (id, school_id, promise_id, user_id, checklist_answers, comment, status, points_awarded, publish_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'processing', %s, %s)
            RETURNING *
        """, (
            inspection_id, data.school_id, data.promise_id, data.user_id,
            json.dumps(data.checklist_answers), data.comment, points, publish_at
        ))
        inspection = dict(cur.fetchone())

        # Update user streak and points
        if user:
            new_streak = user["streak"] + 1
            max_streak = max(user["max_streak"], new_streak)
            new_xp = user["xp"] + points * 10
            new_level = user["level"]
            xp_next = user["xp_next"]
            if new_xp >= xp_next:
                new_level += 1
                new_xp -= xp_next
                xp_next = round(xp_next * 1.5)

            cur.execute("""
                UPDATE users SET
                    streak = %s, max_streak = %s,
                    points_season = points_season + %s,
                    points_total = points_total + %s,
                    xp = %s, level = %s, xp_next = %s
                WHERE id = %s
            """, (new_streak, max_streak, points, points, new_xp, new_level, xp_next, data.user_id))

        # Update school capture level
        s = dict(school)
        new_capture = min(3, s["capture_level"] + 1)
        cur.execute("UPDATE schools SET capture_level = %s WHERE id = %s", (new_capture, data.school_id))

        return {
            "inspection": inspection,
            "feedback": {
                "points_awarded": points,
                "streak_multiplier": streak_mult,
                "new_capture_level": new_capture,
                "publish_in_hours": delay_hours,
                "message": f"+{points} очков! Стрик: {streak} дней. Проверка появится через {delay_hours}ч.",
            }
        }


@router.get("")
def list_inspections(school_id: Optional[str] = None, limit: int = 20):
    with get_db() as conn:
        cur = conn.cursor()
        if school_id:
            cur.execute("""
                SELECT * FROM inspections WHERE school_id = %s
                ORDER BY created_at DESC LIMIT %s
            """, (school_id, limit))
        else:
            cur.execute("SELECT * FROM inspections ORDER BY created_at DESC LIMIT %s", (limit,))
        return [dict(r) for r in cur.fetchall()]
