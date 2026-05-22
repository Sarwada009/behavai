"""
POST /devices/token   — register an Expo push token for the current user
DELETE /devices/token — unregister (on logout)
"""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.device_token import DeviceToken
from app.models.user import User

router = APIRouter(prefix="/devices", tags=["devices"])


class TokenPayload(BaseModel):
    token: str


@router.post("/token", status_code=status.HTTP_204_NO_CONTENT)
def register_token(
    payload: TokenPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exists = db.query(DeviceToken).filter(DeviceToken.token == payload.token).first()
    if not exists:
        db.add(DeviceToken(user_id=current_user.id, token=payload.token))
        db.commit()


@router.delete("/token", status_code=status.HTTP_204_NO_CONTENT)
def unregister_token(
    payload: TokenPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(DeviceToken).filter(
        DeviceToken.token == payload.token,
        DeviceToken.user_id == current_user.id,
    ).delete()
    db.commit()
