import os

from fastapi import FastAPI, Request
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import analytics, auth, behavior, cameras, devices, patients, health_history, presence, reports, stream, ws
from app.services.stream_manager import stream_manager
from app.services.ws_manager import ws_manager as websocket_manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CareWatch API", version="2.3.0")

class CORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            )
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(CORSMiddleware)

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
        "version": "2.0.1",
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
