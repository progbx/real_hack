from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
import uuid

router = APIRouter(prefix="/promises", tags=["promises"])


class PromiseCreate(BaseModel):
    school_id: str
    title: str
    description: Optional[str] = None
    source: str = "Residents"
    deadline: Optional[str] = None
    amount: Optional[int] = None
    type: str = "consumable"
    checklist: Optional[list] = []


@router.get("")
def list_promises(school_id: Optional[str] = None, status: Optional[str] = None):
    with get_db() as conn:
        cur = conn.cursor()
        where = ["1=1"]
        params = []
        if school_id:
            where.append("school_id = %s")
            params.append(school_id)
        if status:
            where.append("status = %s")
            params.append(status)
        cur.execute(f"SELECT * FROM promises WHERE {' AND '.join(where)} ORDER BY deadline", params)
        return [dict(r) for r in cur.fetchall()]


@router.post("")
def create_promise(data: PromiseCreate):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM schools WHERE id = %s", (data.school_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="School not found")

        import json
        promise_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO promises (id, school_id, title, description, source, deadline, amount, type, checklist, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'waiting')
            RETURNING *
        """, (promise_id, data.school_id, data.title, data.description, data.source,
              data.deadline, data.amount, data.type, json.dumps(data.checklist)))
        return dict(cur.fetchone())


@router.patch("/{promise_id}/status")
def update_status(promise_id: str, status: str):
    valid = {"pending", "in-progress", "resolved", "waiting", "confirmed", "ignored"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid}")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE promises SET status = %s WHERE id = %s RETURNING *", (status, promise_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Promise not found")
        return dict(row)


@router.get("/{promise_id}")
def get_promise(promise_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM promises WHERE id = %s", (promise_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Promise not found")
        return dict(row)
