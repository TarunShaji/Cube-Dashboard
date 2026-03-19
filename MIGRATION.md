# AWS Migration & Deployment Guide

This document provides a professional, step-by-step roadmap for migrating the CubeHQ Dashboard to an AWS production environment using **EC2**, **DocumentDB**, and **Nginx**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Data Backup & Assets](#2-database-backup--assets)
3. [Infrastructure Setup (AWS Console)](#3-infrastructure-setup-aws-console)
4. [Server Preparation (EC2)](#4-server-preparation-ec2)
5. [Data Import (to DocumentDB)](#5-data-import-to-documentdb)
6. [App Deployment (Docker)](#6-app-deployment-docker)
7. [Production Hardening (Nginx & SSL)](#7-production-hardening-nginx--ssl)

---

## 1. Prerequisites

Before starting, ensure you have the following ready:

### A. AWS Infrastructure
- **AWS Account** with full permissions for EC2 and DocumentDB.
- **SSH Key Pair (.pem)** downloaded from the AWS console (used for EC2 access).

### B. Local Development Tools
- **MongoDB Database Tools**: Required for data restoration.
  - *macOS*: `brew install mongodb-database-tools`
  - *Ubuntu*: `sudo apt install mongodb-database-tools`

---

## 2. Database Backup & Assets
> [!IMPORTANT]
> **Data pre-included**: A complete production-ready snapshot is already included in this repository at `atlas_backup/agency_dashboard/`. You do **not** need to perform an export unless you specifically want fresh data from a live Atlas instance.

### Optional: Manual Export (if fresh data is needed)
If you need to pull a new snapshot from a live MongoDB Atlas cluster:
```bash
# Export data into the local folder
mongodump --uri="mongodb+srv://<USER>:<PASS>@<ATLAS_HOST>/<DB_NAME>" --out=./atlas_backup
```

---

## 3. Infrastructure Setup (AWS Console)

### A. DocumentDB Cluster
- **Engine**: 5.0
- **Instance**: `db.t3.medium` (minimum recommended for production).
- **Network**: Ensure the Security Group allows inbound traffic on port **27017** from the EC2 instance's IP.
- **TLS**: Enable TLS (standard security).

### B. EC2 Instance
- **OS**: Amazon Linux 2023.
- **Size**: `t3.small` (Next.js builds require ~2GB RAM; `t3.micro` may hang during builds).
- **Security Group**: Open port **22** (SSH), **80** (HTTP), **443** (HTTPS), and **3000** (Testing).

---

## 4. Server Preparation (EC2)

Connect to your EC2 and install the required container environment:

```bash
sudo yum update -y
sudo yum install docker git -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# Logout (exit) and log back in to apply group changes
```

---

## 5. Data Import (to DocumentDB)

### A. The CA Bundle
DocumentDB requires a certificate to trust the connection.
- **Pre-included**: This file is already located in the project root as `rds-combined-ca-bundle.pem`.
- **Optional (Fresh Download)**:
  `curl -s https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem > rds-combined-ca-bundle.pem`

### B. Restore the Data
1. **Transfer**: Upload the `atlas_backup` folder to your EC2 instance using `scp`.
2. **Import**: Run this command from the folder containing the backup:
   ```bash
   mongorestore --host="<docdb-endpoint>:27017" \
     --ssl \
     --sslCAFile=rds-combined-ca-bundle.pem \
     --username=<USER> \
     --password=<PASS> \
     --authenticationDatabase=admin \
     --nsFrom "agency_dashboard.*" \
     --nsTo "dashboard.*" \
     ./atlas_backup/agency_dashboard
   ```

---

## 6. App Deployment (Docker)

1. **Clone & Configure**:
   ```bash
   git clone https://github.com/cubehq-ai/CubeHQ-Dashboard.git
   cd CubeHQ-Dashboard
   cp .env.example .env
   ```
2. **Configure `.env`**:
   Ensure `MONGO_URL` and `MONGO_CA_PATH` are set correctly to point to your new DocumentDB endpoint.
3. **Build & Run**:
   ```bash
   # Replace the URL with your production domain
   docker build -t cubehq-app --build-arg NEXT_PUBLIC_BASE_URL=https://dashboard.cubehq.ai .
   
   docker run -d \
     --name cubehq_dashboard \
     -p 3000:3000 \
     --env-file .env \
     --restart unless-stopped \
     cubehq-app
   ```

---

## 7. Production Hardening (Nginx & SSL)

### A. Nginx Reverse Proxy
Nginx acts as the "front door," directing public traffic (80/443) to your Docker container (3000).

```bash
sudo yum install nginx -y
sudo systemctl start nginx
```

Create a site configuration at `/etc/nginx/conf.d/dashboard.conf`:
```nginx
server {
    listen 80;
    server_name dashboard.cubehq.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### B. HTTPS via Certbot
Secure your site with a free SSL certificate:
```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx -d dashboard.cubehq.ai
# Follow the prompts to enable automatic redirection to HTTPS.
```

---

## 🛡️ Critical AWS Compatibility Notes

- **SCRAM-SHA-1**: DocumentDB uses `SCRAM-SHA-1` for authentication. Ensure your `MONGO_URL` includes `&authMechanism=SCRAM-SHA-1` to avoid connection handshake errors.
- **Port 3000 Testing**: Before enabling Nginx, verify the app is running by visiting `http://<EC2-IP>:3000`.
- **Health Verification**: Use `docker logs -f cubehq_dashboard` to monitor the server start-up for any database connection issues.
