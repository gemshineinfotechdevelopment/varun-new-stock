

# Varun Traders Stock Maintenance - Complete VPS Deployment Guide

This guide provides complete step-by-step instructions to deploy the **Varun Traders Stock Maintenance & Inventory** system (React Vite Frontend + Node.js Express Backend on **Port 5013** + Nginx + PM2 + SSL) on your VPS for subdomain **`varun-traders-stock.gemshine.tech`**, sharing the existing local MongoDB database (`varun_trade_db`) with your Billing project.

---

## 🏗️ VPS Architecture Overview

```
                               Internet / Client Browser
                                          │
                                          ▼
                      [ Nginx Reverse Proxy (Port 80 / 443 HTTPS SSL) ]
                        Host: varun-traders-stock.gemshine.tech
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
         Frontend (/ & /assets/*)                     Backend API (/api/*)
                    │                                           │
                    ▼                                           ▼
         Static React SPA Files                   Node.js Express Backend
       (/var/www/varun-stock/dist)               (Port 5013 via PM2: varun-stock-api)
                                                                │
                                                                ▼
                                                    Shared MongoDB Server
                                             (mongodb://127.0.0.1:27017/varun_trade_db)
```

---

## 🌐 Step 0: Configure DNS A-Record
In your Domain Registrar / DNS Management (Cloudflare / Hostinger / GoDaddy):
- **Type**: `A`
- **Name / Host**: `varun-traders-stock` (or `varun-traders-stock.gemshine.tech`)
- **Points to (IPv4)**: `YOUR_VPS_IP_ADDRESS`
- **TTL**: Auto / 300 seconds

---

## 💻 Step 1: Connect to VPS
```bash
ssh root@YOUR_VPS_IP
```

---

## 📁 Step 2: Clone or Pull Repository to `/var/www/varun-stock`

If cloning for the first time:
```bash
cd /var/www
git clone https://github.com/gemshineinfotechdevelopment/varun-new-stock.git varun-stock
cd /var/www/varun-stock
```

If already cloned:
```bash
cd /var/www/varun-stock
git pull origin main
```

---

## ⚙️ Step 3: Configure Environment Variables (`.env`)

### 1. Root `.env` (Frontend)
Create `/var/www/varun-stock/.env`:
```bash
cat << 'EOF' > /var/www/varun-stock/.env
VITE_API_URL=/api
EOF
```

### 2. Server `.env` (Backend API on Port 5013 & Shared MongoDB)
Create `/var/www/varun-stock/server/.env`:
```bash
cat << 'EOF' > /var/www/varun-stock/server/.env
PORT=5013
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/varun_trade_db
CORS_ORIGIN=https://varun-traders-stock.gemshine.tech,http://varun-traders-stock.gemshine.tech,https://varun-traders-billing.gemshine.tech,http://varun-traders-billing.gemshine.tech
JWT_SECRET=varun_stock_super_secure_jwt_secret_key_2026
BILLING_INTEGRATION_SECRET=varun_stock_integration_secret_key_xyz890
BILLING_API_URL=http://localhost:5011
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
EOF
```

---

## 📦 Step 4: Install Dependencies & Build Frontend & Backend

```bash
cd /var/www/varun-stock

# Install root & frontend dependencies
npm install

# Install server dependencies
npm --prefix server install

# Build both Frontend (Vite -> /dist) and Backend (tsc -> /server/dist)
npm run build:all
```

---

## 🚀 Step 5: Start & Manage with PM2

```bash
cd /var/www/varun-stock

# Start or reload the stock backend process
pm2 start ecosystem.config.cjs

# Save PM2 process list so it automatically restarts on server reboot
pm2 save

# Verify running processes
pm2 status
```

*(You will see both `varun-stock-api` on port 5013 and your billing backend running side by side).*

---

## 🌐 Step 6: Configure Nginx Reverse Proxy

### 1. Copy the Nginx configuration file:
```bash
sudo cp /var/www/varun-stock/nginx/varun-traders-stock.gemshine.tech.conf /etc/nginx/sites-available/varun-traders-stock.gemshine.tech.conf
```

### 2. Enable the site link in Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/varun-traders-stock.gemshine.tech.conf /etc/nginx/sites-enabled/
```

### 3. Test & Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 7: Install Free SSL Certificate (Certbot Let's Encrypt)

```bash
sudo certbot --nginx -d varun-traders-stock.gemshine.tech
```
*Select option to automatically redirect HTTP traffic to HTTPS.*

---

## 🔄 Updating the Application in the Future

Whenever you push new code to GitHub, simply run this single command on your VPS:
```bash
cd /var/www/varun-stock
bash deploy.sh
```

---

## 🔍 Useful Diagnostic & Monitoring Commands

- **Check Stock Backend Logs**: `pm2 logs varun-stock-api`
- **Restart Stock Backend**: `pm2 restart varun-stock-api`
- **Check MongoDB Status**: `sudo systemctl status mongod`
- **Test Backend API Health directly on VPS**: `curl http://127.0.0.1:5013/api/health`
- **Check Nginx Access/Error Logs**:
  - `sudo tail -f /var/log/nginx/error.log`
  - `sudo tail -f /var/log/nginx/access.log`
