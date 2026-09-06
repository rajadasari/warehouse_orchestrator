# Linux (Ubuntu / RHEL) Bare-Metal Deployment Runbook

**DOCUMENT ID**: RUNBOOK-LNX-001  
**TARGET OS**: Ubuntu Server 22.04 / 24.04 LTS, RHEL 9 / Rocky Linux 9 (64-bit)  
**SCOPE**: From receiving compiled JARs to all 7 services running live under `systemd`  
**ZERO DOCKER**: Native multi-JVM systemd daemons  

---

## 1. Release Package Structure & Prerequisites

### 1.1 What You Receive in the Deployment Package
When deploying on bare-metal, the engineering release package (e.g. from USB drive, internal artifact repository, or directory `/tmp/release/` or `/media/usb/release/`) contains:

```text
/media/usb/release/
├── bin/
│   ├── auth-service-*.jar
│   ├── gateway-service-*.jar
│   ├── wes-service-*.jar
│   ├── wms-service-*.jar
│   ├── wcs-service-*.jar
│   ├── asrs-wcs-service-*.jar
│   └── fleet-service-*.jar
├── dist/                       <-- Production React UI static web assets
│   ├── index.html
│   ├── assets/
│   └── favicon.svg
└── config/
    └── platform.env.template   <-- Template environment variables
```

### 1.2 Prerequisites Checklist
Before executing this runbook, verify on the target Linux host:
1. **Java 21 LTS installed**: Run `java -version`. Ensure it outputs OpenJDK 21 64-bit (`JAVA_HOME` configured).
2. **PostgreSQL 16 running**: `sudo systemctl status postgresql` is `active (running)` on port `5432`.
   - Database `warehouse_db` created.
   - User `warehouse_app` created with full schema permissions.
3. **Eclipse Mosquitto running**: `sudo systemctl status mosquitto` is `active (running)` on port `1883/8883`.
4. **Sudo Privileges**: You must have root or sudo access.

---

## 2. Step-by-Step Deployment Procedure

### Step 1: Create Dedicated Service User & Production Directories

```bash
# 1. Create system user with no interactive login shell
sudo useradd -r -s /bin/false -d /opt/warehouse-platform -m warehouse

# 2. Create standardized deployment directory tree
sudo mkdir -p /opt/warehouse-platform/bin
sudo mkdir -p /opt/warehouse-platform/config
sudo mkdir -p /opt/warehouse-platform/logs
sudo mkdir -p /opt/warehouse-platform/static-ui
sudo mkdir -p /opt/warehouse-platform/backups
sudo mkdir -p /opt/warehouse-platform/certs

# 3. Set base ownership
sudo chown -R warehouse:warehouse /opt/warehouse-platform
sudo chmod 750 /opt/warehouse-platform
```

---

### Step 2: Copy JAR Files & UI Bundle into Place

Copy all JAR files from the release package, normalizing versioned filenames to canonical service names:

```bash
# Define source location
RELEASE_DIR="/media/usb/release"

# Copy and standardize JAR filenames to canonical names
sudo cp ${RELEASE_DIR}/bin/auth-service*.jar     /opt/warehouse-platform/bin/auth-service.jar
sudo cp ${RELEASE_DIR}/bin/wcs-service*.jar      /opt/warehouse-platform/bin/wcs-service.jar
sudo cp ${RELEASE_DIR}/bin/asrs-wcs-service*.jar /opt/warehouse-platform/bin/asrs-wcs-service.jar
sudo cp ${RELEASE_DIR}/bin/fleet-service*.jar    /opt/warehouse-platform/bin/fleet-service.jar
sudo cp ${RELEASE_DIR}/bin/wms-service*.jar      /opt/warehouse-platform/bin/wms-service.jar
sudo cp ${RELEASE_DIR}/bin/wes-service*.jar      /opt/warehouse-platform/bin/wes-service.jar
sudo cp ${RELEASE_DIR}/bin/gateway-service*.jar  /opt/warehouse-platform/bin/gateway-service.jar

# Verify that all 7 canonical JARs exist in bin
ls -lh /opt/warehouse-platform/bin/*.jar

# Copy React UI static bundle
sudo cp -r ${RELEASE_DIR}/dist/*                 /opt/warehouse-platform/static-ui/

# Set strict execution and read permissions
sudo chown -R warehouse:warehouse /opt/warehouse-platform/bin /opt/warehouse-platform/static-ui
sudo chmod 500 /opt/warehouse-platform/bin/*.jar
```

---

### Step 3: Create Server Environment File (`platform.env`)

Create `/opt/warehouse-platform/config/platform.env`:

```bash
sudo bash -c 'cat << "EOF" > /opt/warehouse-platform/config/platform.env
# Database Connection
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=warehouse_db
DB_USERNAME=warehouse_app
DB_PASSWORD=CustomerSecureDBPass2026!

# MQTT Broker (Eclipse Mosquitto)
MOSQUITTO_HOST=127.0.0.1
MOSQUITTO_PORT=1883
MOSQUITTO_TLS_PORT=8883

# Security & Identity
AUTH_MODE=LOCAL
JWT_EXPIRATION_HOURS=24
EOF'

# Enforce POSIX 600 permissions (Readable only by warehouse user - Zero Leak)
sudo chown warehouse:warehouse /opt/warehouse-platform/config/platform.env
sudo chmod 600 /opt/warehouse-platform/config/platform.env
```

---

### Step 4: Create `systemd` Service Units

Create the systemd unit files in `/etc/systemd/system/`:

#### 1. Auth Service (`warehouse-auth.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-auth.service
[Unit]
Description=Warehouse 01: Auth Service (Identity & IEC 62443 RBAC)
After=network.target postgresql.service mosquitto.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar /opt/warehouse-platform/bin/auth-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

#### 2. WCS Service (`warehouse-wcs.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-wcs.service
[Unit]
Description=Warehouse 02: WCS Service (Conveyor Line Sorters & PLCs)
After=network.target postgresql.service warehouse-auth.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar /opt/warehouse-platform/bin/wcs-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

#### 3. AS/RS WCS Service (`warehouse-asrs.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-asrs.service
[Unit]
Description=Warehouse 03: AS/RS WCS Service (High-Bay Stacker Cranes)
After=network.target postgresql.service warehouse-auth.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar /opt/warehouse-platform/bin/asrs-wcs-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

#### 4. Fleet Service (`warehouse-fleet.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-fleet.service
[Unit]
Description=Warehouse 04: Fleet Manager Service (AGVs/AMRs VDA 5050)
After=network.target postgresql.service mosquitto.service warehouse-auth.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar /opt/warehouse-platform/bin/fleet-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

#### 5. WMS Service (`warehouse-wms.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-wms.service
[Unit]
Description=Warehouse 05: WMS Service (Local Inventory & Bins)
After=network.target postgresql.service warehouse-auth.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx1024m -jar /opt/warehouse-platform/bin/wms-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

#### 6. WES Service (`warehouse-wes.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-wes.service
[Unit]
Description=Warehouse 06: WES Service (Master Data Authority & Wave Engine)
After=network.target postgresql.service warehouse-wms.service warehouse-wcs.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms1024m -Xmx2048m -jar /opt/warehouse-platform/bin/wes-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

#### 7. Gateway Service (`warehouse-gateway.service`)
```bash
sudo bash -c 'cat << "EOF" > /etc/systemd/system/warehouse-gateway.service
[Unit]
Description=Warehouse 07: Gateway Service (Reverse Proxy & UI Host)
After=network.target warehouse-wes.service warehouse-auth.service

[Service]
Type=simple
User=warehouse
Group=warehouse
WorkingDirectory=/opt/warehouse-platform
EnvironmentFile=/opt/warehouse-platform/config/platform.env
ExecStart=/usr/bin/java -XX:+UseZGC -XX:+ZGenerational -Xms256m -Xmx512m -jar /opt/warehouse-platform/bin/gateway-service.jar --spring.config.additional-location=file:/opt/warehouse-platform/config/
Restart=always
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF'
```

---

### Step 5: Reload systemd & Enable Services on Boot

```bash
sudo systemctl daemon-reload

# Enable all 7 services to launch automatically on server power-on
sudo systemctl enable warehouse-auth
sudo systemctl enable warehouse-wcs
sudo systemctl enable warehouse-asrs
sudo systemctl enable warehouse-fleet
sudo systemctl enable warehouse-wms
sudo systemctl enable warehouse-wes
sudo systemctl enable warehouse-gateway
```

---

### Step 6: Sequential Phased Startup

```bash
# Phase 1: Identity & Access Layer
sudo systemctl start warehouse-auth
sleep 5

# Phase 2: Hardware Adapters
sudo systemctl start warehouse-wcs
sudo systemctl start warehouse-asrs
sudo systemctl start warehouse-fleet
sleep 5

# Phase 3: Inventory & WES Core
sudo systemctl start warehouse-wms
sudo systemctl start warehouse-wes
sleep 8

# Phase 4: API Gateway & UI
sudo systemctl start warehouse-gateway
```

---

### Step 7: Verification & Health Check

```bash
echo "=== Checking Service Actuator Health Endpoints ==="
for port in 8081 8084 8085 8086 8083 8082 8080; do
  curl -s -f "http://localhost:${port}/actuator/health" | grep -q "UP" \
    && echo "Port ${port}: [ONLINE]" \
    || echo "Port ${port}: [FAILED]"
done
```

```

---

### Step 8: Configure Linux Firewall Rules

If operators or client terminals access the platform across the local plant LAN/VLAN:

#### Option A: Ubuntu (UFW)
```bash
# Allow Gateway / Web UI
sudo ufw allow 8080/tcp comment "Warehouse Platform Gateway"

# (Optional) Allow Mosquitto MQTT if external AGVs connect directly to this host
sudo ufw allow 1883/tcp comment "Mosquitto MQTT Plain"
sudo ufw allow 8883/tcp comment "Mosquitto MQTT TLS"
sudo ufw reload
```

#### Option B: RHEL / Rocky Linux (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --permanent --add-port=8883/tcp
sudo firewall-cmd --reload
```

Open a browser to: `http://<server-ip>:8080` to access the login page.  
Initial credentials: `admin` / `TempIDP@2026!`.

---

## 3. Day-2 Maintenance & JAR Upgrade Procedures

### 3.1 Upgrading an Individual Microservice JAR
When a new patch or version of a specific service is released (e.g. `wes-service-1.0.1.jar`):

```bash
# 1. Stop the target systemd service
sudo systemctl stop warehouse-wes

# 2. Backup current running JAR
sudo cp /opt/warehouse-platform/bin/wes-service.jar \
  /opt/warehouse-platform/backups/wes-service.jar.bak_$(date +%Y%m%d%H%M)

# 3. Copy the new JAR over the existing canonical file
sudo cp /media/usb/patches/wes-service-1.0.1.jar /opt/warehouse-platform/bin/wes-service.jar

# 4. Enforce ownership and permissions
sudo chown warehouse:warehouse /opt/warehouse-platform/bin/wes-service.jar
sudo chmod 500 /opt/warehouse-platform/bin/wes-service.jar

# 5. Start the systemd service
sudo systemctl start warehouse-wes

# 6. Verify health check
curl -s -f http://localhost:8082/actuator/health
```

### 3.2 Stopping and Restarting All Platform Services
To perform a complete graceful shutdown or restart:

```bash
# Graceful Shutdown (Reverse dependency order)
sudo systemctl stop warehouse-gateway
sudo systemctl stop warehouse-wes
sudo systemctl stop warehouse-wms
sudo systemctl stop warehouse-fleet
sudo systemctl stop warehouse-asrs
sudo systemctl stop warehouse-wcs
sudo systemctl stop warehouse-auth

# Complete Startup (Forward dependency order)
sudo systemctl start warehouse-auth
sleep 5
sudo systemctl start warehouse-wcs warehouse-asrs warehouse-fleet
sleep 5
sudo systemctl start warehouse-wms warehouse-wes
sleep 8
sudo systemctl start warehouse-gateway
```

### 3.3 Log Inspection and Troubleshooting
Each service outputs stdout/stderr to `systemd` journal and writes files to `/opt/warehouse-platform/logs/`:
- Live log tailing via `journalctl`:
  ```bash
  sudo journalctl -u warehouse-wes.service -f -n 100
  sudo journalctl -u warehouse-auth.service -f -n 100
  ```
- Check failure status / exit codes:
  ```bash
  sudo systemctl status warehouse-wes.service
  ```

