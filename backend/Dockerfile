FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
ENV BETALAB_EXPERIMENTS_DB_PATH=/data/experiments.sqlite3

WORKDIR /app

# The app runs from /app/.venv; drop the base image's setuptools/wheel, whose
# vendored copies (wheel, jaraco.context) are flagged by the scanner and unused.
RUN pip install --no-cache-dir "uv>=0.13.4" \
    && pip uninstall -y setuptools wheel

COPY pyproject.toml uv.lock ./
COPY app ./app
RUN uv sync --frozen --no-dev --no-cache

RUN mkdir -p /data

EXPOSE 8000

ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
