"""Gunicorn config for the UnderFinance API.

Threaded workers because some requests block on the local Ollama model; the
generous timeout covers slow AI categorization. Logs go to stdout → journald.
"""

bind = "127.0.0.1:8000"
workers = 3
worker_class = "gthread"
threads = 4
timeout = 120
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = "info"
