# Smart Car IoT Platform - Startup Guide

## Quick Start

### First Time Setup (One Time Only)

```bash
# 1. Setup PostgreSQL Database
cd backend/relationalDB
./initPsql_mac.sh  # macOS
# OR
./initPsql.sh      # Linux

# 2. Setup MongoDB
cd ../
./initMongoDB.sh

# 3. Setup MQTT Broker
./initMosquitto.sh

# 4. Install Dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Start the Application

**Option 1: Automatic (Recommended)**
```bash
./start-all.sh
```

**Option 2: Manual (3 Terminals)**

**Terminal 1: Start MQTT Broker**
```bash
cd backend
./startMosquitto.sh
```

**Terminal 2: Start Backend Server**
```bash
cd backend
node server.js
```

**Terminal 3: Start Frontend**
```bash
cd frontend
npm start
```

### Access the Application

Open browser: **http://localhost:3000**

Login and navigate to:
- **Device Management** - Register and manage IoT devices
- **Device Monitoring** - Real-time device monitoring dashboard

### Test Real-time Features (Optional)

```bash
# In a new terminal
cd backend
node test-mqtt-device-simulator.js IOT-001 normal
```

Watch the Device Monitoring page update in real-time!

### Stop the Application

```bash
./stop-all.sh
```

Or press `Ctrl+C` in each terminal.

---

## Default Credentials

**PostgreSQL:**
- User: `smartcar_user`
- Password: `securepassword`
- Database: `smartcar_db`

**MongoDB:**
- User: `tester`
- Password: `tester`
- Database: `smartcar`

---

## Ports

- Frontend: **3000**
- Backend: **3001**
- MQTT: **1883**
- PostgreSQL: **5432**
- MongoDB: **27017**

---

## Troubleshooting

**Frontend won't compile:**
```bash
cd frontend
npm install axios --save
```

**Backend won't start:**
```bash
# Check .env file exists
cat backend/.env
```

**MQTT broker not running:**
```bash
cd backend
./startMosquitto.sh
```

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```
