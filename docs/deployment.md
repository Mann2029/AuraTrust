# AuraTrust Sentinel — Production Deployment & Operations Guide

## 1. Environment Variables Configuration

Create a `.env` file in the project root:

```ini
# Application Environment
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://sentinel.university.edu

# Cryptographic Keys (Do not check into source control)
JWT_SECRET_KEY=generate-secure-64-byte-key-via-secrets-token-urlsafe
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database Credentials
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=auratrust_app
DB_PASSWORD=SecurePassword2026!
DB_NAME=zero_trust_attendance
DATABASE_URL=mysql+pymysql://auratrust_app:SecurePassword2026!@127.0.0.1:3306/zero_trust_attendance

# Hardware & Engine Acceleration
INSIGHTFACE_PROVIDER=CUDAExecutionProvider
MAX_UPLOAD_SIZE_MB=5
```

---

## 2. Docker Compose Deployment

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: auratrust_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: RootPassword2026!
      MYSQL_DATABASE: zero_trust_attendance
      MYSQL_USER: auratrust_app
      MYSQL_PASSWORD: SecurePassword2026!
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  sentinel-monolith:
    build: .
    container_name: auratrust_monolith
    restart: always
    depends_on:
      - db
    environment:
      - DATABASE_URL=mysql+pymysql://auratrust_app:SecurePassword2026!@db:3306/zero_trust_attendance
    volumes:
      - ./storage:/app/storage
    ports:
      - "8000:8000"

volumes:
  mysql_data:
```

---

## 3. Reverse Proxy Configuration (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name sentinel.university.edu;

    ssl_certificate /etc/letsencrypt/live/sentinel.university.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sentinel.university.edu/privkey.pem;

    # Modern Frontend Single Page App
    location /app/ {
        proxy_pass http://127.0.0.1:8000/app/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # REST API Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 5M;
    }

    # WebSocket Real-Time Channel
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 4. Backup & Disaster Recovery

### 4.1 Automated Database Dump (Daily Cron)
```bash
mysqldump -u auratrust_app -p'SecurePassword2026!' --single-transaction --quick zero_trust_attendance | gzip > /var/backups/auratrust_$(date +%F).sql.gz
```

### 4.2 Restoring from Backup
```bash
gunzip < /var/backups/auratrust_2026-09-13.sql.gz | mysql -u root -p zero_trust_attendance
```
