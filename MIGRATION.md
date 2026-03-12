# AWS Migration & Deployment Guide

This document provides a complete, step-by-step roadmap for migrating the CubeHQ Dashboard from MongoDB Atlas/Vercel to a professional AWS production environment using **EC2**, **DocumentDB**, and **Nginx**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Data Export (from MongoDB Atlas)](#2-data-export-from-mongodb-atlas)
3. [Infrastructure Setup (AWS Console)](#3-infrastructure-setup-aws-console)
4. [Server Preparation (EC2)](#4-server-preparation-ec2)
5. [Data Import (to DocumentDB)](#5-data-import-to-documentdb)
6. [App Deployment (Docker)](#6-app-deployment-docker)
7. [Production Hardening (Nginx & SSL)](#7-production-hardening-nginx--ssl)

---

## 1. Prerequisites
- **AWS Account** with permissions for EC2 and DocumentDB.
- **MongoDB Database Tools** installed locally (`brew install mongodb-database-tools`).
- **SSH Key** (.pem) for accessing your EC2 instance.

---

## 2. Database Backup (Pre-included in Repo)
> [!IMPORTANT]
> **A complete snapshot of the data is already included in this repository at `atlas_backup/agency_dashboard/`.**
> You do NOT need to run Step 2 unless you want a newer snapshot from the Atlas database.

### Optional: Manual Export (if fresh data is needed)
```bash
# Export fresh data into a local folder
mongodump --uri="mongodb+srv://<USER>:<PASS>@<ATLAS_HOST>/<DB_NAME>" --out=./atlas_backup
```

---

## 3. Infrastructure Setup (AWS Console)

### A. DocumentDB Cluster
- **Engine**: 5.0
- **Instance**: `db.t3.medium` (minimum for production clusters).
- **Network**: Ensure the Security Group allows inbound traffic on port **27017** from your EC2 instance's IP.
- **TLS**: Enable TLS (standard).

### B. EC2 Instance
- **OS**: Amazon Linux 2023.
- **Size**: `t3.small` (Next.js builds may fail on `t3.micro` due to memory constraints).
- **Security Group**: Open port **22** (SSH), **80** (HTTP), **443** (HTTPS), and **3000** (App testing).

---

## 4. Server Preparation (EC2)

Connect to your EC2 and install the required tools:

```bash
sudo yum update -y
sudo yum install docker git -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# Logout and log back in to apply group changes
```

---

## 5. Data Import (to DocumentDB)

1. **Get the CA Bundle**: DocumentDB requires a certificate to trust the connection.
   ```bash
   curl -s https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem > rds-combined-ca-bundle.pem
   ```
2. **Transfer Backup**: Upload your `atlas_backup` folder to the EC2 instance using `scp`.
3. **Import**:
   Run this command from the folder containing the backup:
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
   Ensure `MONGO_URL` and `MONGO_CA_PATH` are set correctly. Your `.env` should look like the new `.env.example`.
3. **Build & Run**:
   ```bash
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

### A. Nginx Setup
Route traffic from port 80/443 to the Docker container on port 3000.

```bash
sudo yum install nginx -y
sudo systemctl start nginx
```

Create `/etc/nginx/conf.d/dashboard.conf`:
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

### B. SSL via Certbot (HTTPS)
```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx -d dashboard.cubehq.ai
```

---

## 💡 Pro Tips for Developers
- **$facet Support**: AWS DocumentDB does not support the `$facet` operator. Ensure all aggregation queries are broken into sequential queries if needed.
- **SCRAM-SHA-1**: DocumentDB uses `SCRAM-SHA-1` for authentication; ensure this is set in the connection string to avoid handshake errors.
- **Health Checks**: Access `http://<IP>:3000` to verify the container is alive before enabling Nginx.
