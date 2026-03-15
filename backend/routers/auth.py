import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SignupRequest(BaseModel):
    username: str
    first_name: str
    last_name: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


def _safe_user(u: dict) -> dict:
    u.pop("password_hash", None)
    return u


@router.post("/signup")
def signup(body: SignupRequest):
    username = body.username.strip().lower()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Юзернейм минимум 3 символа")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Пароль минимум 4 символа")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Юзернейм уже занят")

        user_id = str(uuid.uuid4())
        name = f"{body.first_name} {body.last_name}"
        password_hash = pwd_context.hash(body.password)

        cur.execute("""
            INSERT INTO users (id, username, first_name, last_name, name, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (user_id, username, body.first_name.strip(), body.last_name.strip(), name, password_hash))

        user = dict(cur.fetchone())
        return _safe_user(user)


@router.post("/login")
def login(body: LoginRequest):
    username = body.username.strip().lower()

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Неверный юзернейм или пароль")

        user = dict(user)
        if not pwd_context.verify(body.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Неверный юзернейм или пароль")

        cur.execute("""
            SELECT i.id, i.school_id, s.name_ru, i.points_awarded, i.created_at, i.status
            FROM inspections i
            JOIN schools s ON s.id = i.school_id
            WHERE i.user_id = %s
            ORDER BY i.created_at DESC
            LIMIT 20
        """, (user["id"],))
        user["recent_inspections"] = [dict(r) for r in cur.fetchall()]

        return _safe_user(user)
