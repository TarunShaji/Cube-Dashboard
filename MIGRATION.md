# AWS Migration & Deployment Guide

This document provides a professional, step-by-step roadmap for migrating the CubeHQ Dashboard to an AWS production environment using **EC2**, **DocumentDB**, and **Nginx**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Infrastructure Setup (AWS Console)](#2-infrastructure-setup-aws-console)
3. [Server Preparation (EC2)](#3-server-preparation-ec2)
4. [App Setup & Configuration (EC2)](#4-app-setup--configuration-ec2)
5. [Data Import (to DocumentDB)](#5-data-import-to-documentdb)
6. [Nginx & Production Hardening](#6-nginx--production-hardening)

---

## 1. Prerequisites

Before starting, ensure you have the following ready:

### A. AWS Infrastructure
- **AWS Account** with full permissions for EC2 and DocumentDB.
- **SSH Key Pair (.pem)** for EC2 access.

### B. Local Development Tools (for testing)
- **MongoDB Database Tools**: Required if you plan to restore from your local machine.
  - *macOS*: `brew install mongodb-database-tools`

---

## 2. Infrastructure Setup (AWS Console)

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

## 3. Server Preparation (EC2)

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

## 4. App Setup & Configuration (EC2)

1. **Clone the Project**:
   ```bash
   git clone https://github.com/cubehq-ai/CubeHQ-Dashboard.git
   cd CubeHQ-Dashboard
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` (using `vi` or `nano`) and update:
   - `MONGO_URL`: Your new DocumentDB connection string.
   - `MONGO_CA_PATH`: Set to `./rds-combined-ca-bundle.pem` (pre-included).

---

## 5. Data Import (to DocumentDB)

Because you cloned the repository in the previous step, the required data backup and the security certificates are **already present** on your server.

### A. Certify the Connection
DocumentDB requires a CA Bundle to trust the connection.
- **Pre-included**: The file `rds-combined-ca-bundle.pem` is already in the project root.
- **Regenerate (Optional)**: `curl -s https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem > rds-combined-ca-bundle.pem`

### B. Restore the Snapshot
Run this command from the `CubeHQ-Dashboard` directory:
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

## 6. Nginx & Production Hardening

### A. Build and Run the App
```bash
docker build -t cubehq-app --build-arg NEXT_PUBLIC_BASE_URL=https://dashboard.cubehq.ai .

docker run -d \
  --name cubehq_dashboard \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  cubehq-app
```

### B. Nginx Reverse Proxy
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

### C. HTTPS via Certbot
```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx -d dashboard.cubehq.ai
```

---

## 🛡️ Critical AWS Compatibility Notes

- **SCRAM-SHA-1**: Ensure your `MONGO_URL` includes `&authMechanism=SCRAM-SHA-1`.
- **Pre-included Data**: The backup is located at `./atlas_backup/`. No `scp` or external transfers are required!
- **Testing**: Verify access at `http://<EC2-IP>:3000` before finalizing Nginx configurations.
