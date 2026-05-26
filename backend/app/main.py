import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import analytics, auth, behavior, cameras, devices, patients, health_history, presence, reports, stream, ws
from app.services.stream_manager import stream_manager
from app.services.ws_manager import ws_manager as websocket_manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CareWatch API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://behavai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(health_history.router)
app.include_router(cameras.router)
app.include_router(presence.router)
app.include_router(behavior.router)
app.include_router(devices.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(stream.router)
app.include_router(ws.router)


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "BehavAI CareWatch API is running",
        "version": "2.0.0",
        "status": "healthy"
    }


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        stream_manager.start(db, websocket_manager, SessionLocal)
    finally:
        db.close()


@app.on_event("shutdown")
def on_shutdown():
    stream_manager.stop()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "ws_connections": websocket_manager.connection_count,
        "stream_workers": len(stream_manager._workers),
    }
