# CubeHQ Dashboard

A high-performance, agency-grade dashboard for managing client tasks, content calendars, and reporting. Built with **Next.js 14 (App Router)** and **MongoDB**, this project provides a unified interface for agency staffers and a secure, white-labeled portal for clients.

---

## 🚀 Technical Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Node.js Runtime)
- **Database**: [AWS DocumentDB](https://aws.amazon.com/documentdb/) (MongoDB Compatible)
- **Authentication**: JWT-based with `httpOnly` secure cookies (Production: Secure flag handled via protocol check)
---

## 🏗️ Core Architecture & Modules

### 1. The Lifecycle Engine (`lib/engine/lifecycle.js`)
The "brain" of the application. It prevents invalid state transitions (e.g., you cannot mark a task as "Client Visible" if it hasn't been "Internally Approved"). It enforces **Business Invariants** across both Tasks and Content items.

### 2. Intelligent Import Pipeline (`lib/import/`)
Supports high-volume data ingestion from Google Sheets or CSV exports.
- **Normalization**: Automatically cleans headers, extracts URLs from strings, and standardizes date formats (via `normalize.js`).
- **Mapping**: Dynamic keyword-to-field matching for Content and Tasks.
- **ClickUp Integration**: Specialized one-time import mode for ClickUp CSV exports with custom priority mapping (URGENT → P0).
- **Idempotency**: Uses SHA-256 signatures to prevent duplicate imports during bulk operations.

### 3. API Design & Security
All API routes are standardized for reliability and observability:
- **DocumentDB Compatibility**: Pure aggregation pipelines (avoiding `$facet`, `$lookup` where possible) to ensure performance on Managed AWS DocumentDB.
- **Wrappers**: `withAuth` and `withErrorLogging` ensure every request is authenticated and crashes are captured with full stack traces.
- **Centralized Logging**: Structured server-side logging for request tracing (`[BACKEND] [API_REQ]`).

### 4. Client Portals (`app/portal/[slug]`)
Secure, slug-based portals where clients can view live progress, approve deliverables, or request changes.

---
## ☁️ AWS Production Deployment (EC2 + DocumentDB)

Follow these steps to deploy to a fresh AWS environment.

### 1. Database Setup (DocumentDB)
- **Engine**: 5.0 (recommended)
- **Instance**: `db.t3.medium` (minimum for production clusters)
- **Connectivity**: Ensure the EC2 instance's Security Group has access to DocumentDB (Port 27017).
- **TLS**: Required. Download the `rds-combined-ca-bundle.pem` into the project root.

### 2. Server Setup (EC2)
- **OS**: Amazon Linux 2023
- **Instance**: `t3.small` (t3.micro may fail during Next.js build)
- **Security Group**:
    - Port 22 (SSH)
    - Port 3000 (Application)

### 3. Software Installation
Run these on the EC2 instance:
```bash
sudo yum update -y
sudo yum install docker git -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# Logout and login for permissions to take effect
```

### 4. Configuration
Clone and create the production environment:
```bash
git clone https://github.com/TarunShaji/Test.git
cd Test
nano .env
```

**CRITICAL: Connection String Requirements**
DocumentDB requires specific parameters in the `MONGO_URL`. Your `.env` should look like this:
```env
# Change placeholders to your actual DocumentDB endpoint/credentials
MONGO_URL=mongodb://<USER>:<PASS>@<ENDPOINT>:27017/<DB>?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&authMechanism=SCRAM-SHA-1&authSource=admin
DB_NAME=dashboard
MONGO_CA_PATH=./rds-combined-ca-bundle.pem
JWT_SECRET=your_long_random_string
NEXT_PUBLIC_BASE_URL=http://<EC2_PUBLIC_IP>:3000
```

### 5. Deployment (Docker)
Build the image (passing the public URL for frontend links) and launch:
```bash
# Build
docker build -t cubehq-app --build-arg NEXT_PUBLIC_BASE_URL=http://<IP>:3000 .

# Launch
docker run -d \
  --name cubehq_dashboard \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  cubehq-app
```

### 📋 Troubleshooting & Maintenance
- **Logs**: `docker logs -f cubehq_dashboard`
- **SSL Issues**: Ensure `rds-combined-ca-bundle.pem` is in the root directory during build.
- **Auth Errors**: Verify `authMechanism=SCRAM-SHA-1` is in your connection string.
- **Aggregation Errors**: Avoid `$facet`; DocumentDB does not support it.

---

## 📄 Documentation Links

- **[Technical Deep-Dive (DEV.md)](./DEV.md)**: In-depth analysis of API flows, DB architecture, lifecycle engine, and frontend patterns.
