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


# ── /logs — live backend log tail (admin only) ─────────────────────────────────

logs_router = Router(auth=JWTAuth())

# Show at most this many bytes on the first (offset-less) request.
_LOG_TAIL_BYTES = 64 * 1024


class LogChunk(Schema):
    lines: list[str]
    offset: int  # byte offset to pass back on the next poll
    size: int    # current file size


@logs_router.get("/", response=LogChunk)
def tail_logs(request, offset: int = -1, max_bytes: int = 200_000):
    if not getattr(request.auth, "is_superuser", False):
        raise HttpError(403, "Admin only.")

    path = getattr(settings, "LOG_FILE", None)
    if not path or not path.exists():
        return LogChunk(lines=[], offset=0, size=0)

    size = path.stat().st_size
    # First call (offset < 0) or rotation/truncation → start from a tail window.
    if offset < 0 or offset > size:
        start = max(0, size - _LOG_TAIL_BYTES)
    else:
        start = offset
    # Cap how much we return per poll.
    end = min(size, start + max(1024, min(max_bytes, 1_000_000)))

    with open(path, "rb") as fh:
        fh.seek(start)
        data = fh.read(end - start)

    # Only emit complete lines; advance the offset to the last newline.
    nl = data.rfind(b"\n")
    if nl == -1:
        return LogChunk(lines=[], offset=start, size=size)
    text = data[: nl + 1].decode("utf-8", errors="replace")
    lines = [ln for ln in text.splitlines() if ln]
    return LogChunk(lines=lines, offset=start + nl + 1, size=size)


api.add_router("/logs", logs_router)

from under_backend.apps.finance.api import finance_router  # noqa: E402

api.add_router("/finance/", finance_router)

from under_backend.apps.banksync.api import banksync_router  # noqa: E402

api.add_router("/banksync/", banksync_router)
