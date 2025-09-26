FROM python:3.11-slim
WORKDIR /app

# Copy dependency manifest first for better caching
COPY pyproject.toml ./pyproject.toml
RUN pip install --no-cache-dir poetry==1.8.3 \
    && poetry config virtualenvs.create false \
    && poetry install --no-root --no-interaction --no-ansi

# Copy the application source
COPY ./app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


