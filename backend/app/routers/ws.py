"""
WebSocket endpoint: ws://<host>/ws?token=<jwt>

Clients connect here to receive real-time presence and alert events.
"""

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


def _authenticate_token(token: str) -> bool:
    """Validate JWT token passed as a query parameter."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if not user_id:
            return False
        db: Session = SessionLocal()
        try:
            user = db.get(User, user_id)
            return user is not None
        finally:
            db.close()
    except JWTError:
        return False


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    if not _authenticate_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; we only send, not receive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
