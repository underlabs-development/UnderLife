from lexroom_backend.simple_gcp_connector.cloud_sql import IpType
from lexroom_backend.simple_gcp_connector.psycopg import GoogleCloudConnInfoProvider

from .base import *  # noqa: F403
from .base import INSTALLED_APPS, env

# GENERAL
# ------------------------------------------------------------------------------
DEBUG = False
ALLOWED_HOSTS = ["localhost", "0.0.0.0", "127.0.0.1"]  # noqa: S104

# DATABASES
# -----------------------------------------------------------------------------
# Don't enable CONN_MAX_AGE with async, prefer pooling. See
# https://docs.djangoproject.com/en/5.2/topics/async/#queries-the-orm.
# DATABASE_URL format: postgres://{DATABASE_USERNAME}:{DATABASE_PASSWORD}@//cloudsql/{PROJECT_ID}:{REGION}:{INSTANCE_NAME}/{DATABASE_NAME}
_DEFAULT_DB_CONF = env.db_url()  # Read DATABASE_URL from env

# Add support for Google Cloud SQL IAM automatic authentication in
# psycopg connection pool through psycopg.ConnectionPool.conninfo
get_conninfo = GoogleCloudConnInfoProvider(
    env.str(env.DEFAULT_DATABASE_ENV),
    instance_connection_name=_DEFAULT_DB_CONF["HOST"].rsplit("/", 1)[-1]
    if env.CLOUDSQL in _DEFAULT_DB_CONF["HOST"]
    else None,
    enable_iam_auth=env.bool("USE_GOOGLE_CLOUD_SQL_IAM_AUTH", default=True),
    ip_type=IpType(  # used only if instance_connection_name is provided
        env.str("GOOGLE_CLOUD_SQL_IP_TYPE", default="PRIMARY")
    ),
)

_DEFAULT_DB_CONF["CONN_MAX_AGE"] = 0
_DEFAULT_DB_CONF["CONN_HEALTH_CHECKS"] = True
_DEFAULT_DB_CONF.setdefault("OPTIONS", {}).update(
    {
        "pool": {
            "min_size": 1,
            "max_size": 1,
            "timeout": 10,
            "max_idle": 300,
            "reconnect_timeout": 5,
            "conninfo": get_conninfo,
        },
    },
)
DATABASES = {
    "default": _DEFAULT_DB_CONF,
}

# APPS
# ------------------------------------------------------------------------------
INSTALLED_APPS = ["servestatic.runserver_nostatic", *INSTALLED_APPS]

# DAPHNE
# ------------------------------------------------------------------------------
ASGI_APPLICATION = "lexroom_backend.asgi.application"

# CACHES
# ------------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "",
    },
}

# Lexroom vars
# ------------------------------------------------------------------------------
BREVO_API_KEY = env("BREVO_API_KEY", default="")
