from fastapi import APIRouter, HTTPException, Form, UploadFile, File, Query
from typing import Optional
from database import get_db
import uuid, json, os

router = APIRouter(prefix="/promises", tags=["promises"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "promises")
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
async def create_promise(
    school_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    source: str = Form("Народный"),
    deadline: Optional[str] = Form(None),
    type: str = Form("consumable"),
    checklist: str = Form("[]"),
    photos: list[UploadFile] = File(default=[]),
):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM schools WHERE id = %s", (school_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="School not found")

        # Save uploaded photos
        photo_paths = []
        for photo in photos:
            ext = os.path.splitext(photo.filename or "photo.jpg")[1] or ".jpg"
            fname = f"{uuid.uuid4()}{ext}"
            fpath = os.path.join(UPLOAD_DIR, fname)
            content = await photo.read()
            with open(fpath, "wb") as f:
                f.write(content)
            photo_paths.append(f"/uploads/promises/{fname}")

        checklist_data = json.loads(checklist)
        promise_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO promises (id, school_id, title, description, source, deadline, type, checklist, photos, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'waiting')
            RETURNING *
        """, (
            promise_id, school_id, title, description, source,
            deadline or None, type,
            json.dumps(checklist_data), json.dumps(photo_paths),
        ))
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
