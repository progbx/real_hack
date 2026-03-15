import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from database import init_db
from routers import schools, promises, inspections, districts, stats, users, auth

load_dotenv()

app = FastAPI(
    title="Реал Холат API",
    description="Civic monitoring platform for school infrastructure in Uzbekistan",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(schools.router, prefix="/api")
app.include_router(promises.router, prefix="/api")
app.include_router(inspections.router, prefix="/api")
app.include_router(districts.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "project": "Реал Холат", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
