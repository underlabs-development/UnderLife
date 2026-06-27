from datetime import datetime
from typing import Optional

from ninja import Router, Schema
from ninja.errors import HttpError
from ninja_extra import NinjaExtraAPI
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.controller import NinjaJWTDefaultController

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

User = get_user_model()

api = NinjaExtraAPI()
api.register_controllers(NinjaJWTDefaultController)

users_router = Router()


# ── /users/me ─────────────────────────────────────────────────────────────────

class MeSchema(Schema):
    id: int
    email: str
    username: Optional[str]
    first_name: str
    last_name: str
    display_name: str
    last_login: Optional[datetime]


def _me_schema(user) -> MeSchema:
    return MeSchema(
        id=user.pk,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=user.display_name or user.email.split("@")[0],
        last_login=user.last_login,
    )


@users_router.get("/me", auth=JWTAuth(), response=MeSchema)
def get_me(request):
    return _me_schema(request.auth)


class UpdateMePayload(Schema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None


@users_router.patch("/me/", auth=JWTAuth(), response=MeSchema)
def update_me(request, payload: UpdateMePayload):
    user = request.auth
    changed = []
    if payload.first_name is not None:
        user.first_name = payload.first_name
        changed.append("first_name")
    if payload.last_name is not None:
        user.last_name = payload.last_name
        changed.append("last_name")
    if payload.username is not None:
        if len(payload.username) > 20:
            raise HttpError(400, "Username must be 20 characters or fewer.")
        if User.objects.exclude(pk=user.pk).filter(username=payload.username).exists():
            raise HttpError(400, "Username already taken.")
        user.username = payload.username
        changed.append("username")
    if changed:
        user.save(update_fields=changed)
    return _me_schema(user)


# ── /users/password-reset/ ────────────────────────────────────────────────────

class PasswordResetRequestSchema(Schema):
    email: str


class MessageSchema(Schema):
    detail: str


@users_router.post("/password-reset/", response=MessageSchema)
def request_password_reset(request, payload: PasswordResetRequestSchema):
    try:
        user = User.objects.get(email=payload.email)
    except User.DoesNotExist:
        return MessageSchema(detail="If this email is registered, a reset link has been sent.")

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

    send_mail(
        subject="[Under.OS] Reset your password",
        message=f"Click the link below to reset your password:\n\n{reset_link}\n\nThis link expires in 3 days.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

    return MessageSchema(detail="If this email is registered, a reset link has been sent.")


# ── /users/password-reset/confirm/ ────────────────────────────────────────────

class PasswordResetConfirmSchema(Schema):
    uid: str
    token: str
    new_password: str


@users_router.post("/password-reset/confirm/", response=MessageSchema)
def confirm_password_reset(request, payload: PasswordResetConfirmSchema):
    try:
        user_pk = force_str(urlsafe_base64_decode(payload.uid))
        user = User.objects.get(pk=user_pk)
    except (User.DoesNotExist, ValueError, TypeError):
        raise HttpError(400, "Invalid or expired reset link.")

    if not default_token_generator.check_token(user, payload.token):
        raise HttpError(400, "Invalid or expired reset link.")

    user.set_password(payload.new_password)
    user.save()
    return MessageSchema(detail="Password updated successfully.")


api.add_router("/users/", users_router)

from under_backend.apps.finance.api import finance_router  # noqa: E402

api.add_router("/finance/", finance_router)

from under_backend.apps.banksync.api import banksync_router  # noqa: E402

api.add_router("/banksync/", banksync_router)
