# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and combine
FROM python:3.11-slim

# Install necessary system packages including curl for Ollama
RUN apt-get update && apt-get install -y curl

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set up backend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && python -m spacy download en_core_web_sm

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend into backend/static
COPY --from=frontend-builder /app/frontend/dist ./backend/static

# Copy start script
COPY start.sh .
RUN chmod +x start.sh

# Environment variables for Option A (Small models)
ENV OLLAMA_MODEL="qwen2.5:1.5b"
ENV OLLAMA_EMBED_MODEL="nomic-embed-text"
ENV PORT=7860
EXPOSE 7860

CMD ["./start.sh"]
