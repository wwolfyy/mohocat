# Hybrid Scaling Deployment Guide

## Physical Server + Cloud Run Auto-Scaling

This guide explains how to set up a hybrid scaling solution that uses your physical server as the primary backend with Cloud Run as overflow/backup capacity.

## Executive Summary

### **Core Concept**

- **Primary**: Physical server handles 80% of normal traffic (cost-effective)
- **Overflow**: Cloud Run handles 20% + peak traffic (auto-scaling)
- **Load Balancer**: Google Cloud Load Balancer distributes traffic based on server health

### **Monitoring Architecture**

- **Shell Commands**: Use `top`, `free`, `netstat`, `curl` for system metrics
- **Enhanced Health Endpoint**: `/api/health` provides structured JSON metrics
- **Traffic Manager**: Bash script polls health endpoint every 30 seconds
- **Direct Control**: Uses `gcloud` CLI to update load balancer weights

### **Key Insight: No Prometheus Needed (Initially)**

- **Single Server**: Shell-based monitoring is perfect
- **2-3 Servers**: Extended shell scripts still manageable
- **4+ Servers**: Consider Prometheus for better visualization

### **Scaling Triggers**

- **CPU > 80%** → Reduce physical server traffic, increase Cloud Run
- **Memory > 85%** → Same response
- **Server unhealthy** → Route 80% traffic to Cloud Run
- **Server recovering** → Gradually shift back to physical server

### **Traffic Distribution Examples**

- **Normal**: Physical 80%, Cloud Run 20%
- **Stressed**: Physical 50%, Cloud Run 50%
- **Emergency**: Physical 20%, Cloud Run 80%

### **Evolution Path**

1. **Start**: Single physical server + Cloud Run (shell monitoring)
2. **Scale**: Multiple physical servers (extended shell scripts)
3. **Enterprise**: 5+ servers (Prometheus + Grafana)

### **Cost Benefits**

- **Physical server**: Your existing hardware costs
- **Cloud Run**: Pay-per-use for overflow only (~$10-50/month)
- **Load Balancer**: ~$18/month
- **Total additional cost**: ~$28-68/month

### **Why This Works**

- **Container consistency**: Same Docker image runs everywhere
- **Firebase independence**: External services work from any server
- **Gradual scaling**: Can add servers incrementally
- **Fallback ready**: Always can route 100% to Cloud Run if needed

The beauty is you get **enterprise-grade reliability** with **startup-friendly costs** by using your physical server as the primary workhorse and Cloud Run as the elastic safety net.

## Architecture Overview

```
Internet → Google Cloud Load Balancer → Physical Server (80% traffic)
                                    → Cloud Run (20% traffic + overflow)
```

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Physical server** with Docker and public IP
3. **Domain name** pointing to your load balancer
4. **gcloud CLI** installed and authenticated

## Step 1: Deploy to Cloud Run First

```bash
# Deploy your application to Cloud Run
cd /path/to/mcathcat
gcloud run deploy mcathcat \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10
```

## Step 2: Set Up Physical Server

### Install Dependencies

```bash
# Install Docker and required tools
sudo apt update
sudo apt install -y docker.io docker-compose jq bc curl

# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Install monitoring tools
sudo apt install -y htop iotop nethogs
```

### Deploy Application

```bash
# Clone repository
git clone https://github.com/your-username/mcathcat.git /opt/mcathcat
cd /opt/mcathcat

# Create production environment file
cp .env.example .env.production
# Edit .env.production with your actual values

# Build and run container
docker build -t mcathcat .
docker run -d --name mcathcat \
  -p 8080:8080 \
  --env-file .env.production \
  --restart unless-stopped \
  mcathcat

# Set up reverse proxy with SSL
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure nginx (see nginx.conf example below)
sudo nano /etc/nginx/sites-available/mcathcat
sudo ln -s /etc/nginx/sites-available/mcathcat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/health {
        proxy_pass http://localhost:8080/api/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

## Step 3: Set Up Google Cloud Load Balancer

```bash
# Run the setup script
chmod +x scripts/deployment/hybrid-scaling/setup-gcp-load-balancer.sh
./scripts/deployment/hybrid-scaling/setup-gcp-load-balancer.sh

# Update the script with your actual values:
# - PHYSICAL_SERVER_IP: Your server's public IP
# - PHYSICAL_SERVER_DOMAIN: Your domain name
```

## Step 4: Install Monitoring Agent

```bash
# Copy monitoring script to physical server
scp scripts/deployment/hybrid-scaling/physical-server-monitor.sh user@your-server:/opt/
scp scripts/deployment/hybrid-scaling/traffic-manager.sh user@your-server:/opt/

# On physical server
chmod +x /opt/physical-server-monitor.sh
chmod +x /opt/traffic-manager.sh

# Create systemd service for monitoring
sudo tee /etc/systemd/system/mtcat-monitor.service << EOF
[Unit]
Description=Mountain Cat Hybrid Scaling Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt
ExecStart=/opt/physical-server-monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start monitoring service
sudo systemctl daemon-reload
sudo systemctl enable mtcat-monitor
sudo systemctl start mtcat-monitor
```

## Step 5: Configure Traffic Manager

```bash
# Install traffic manager (runs on physical server or separate machine)
sudo tee /etc/systemd/system/mtcat-traffic-manager.service << EOF
[Unit]
Description=Mountain Cat Traffic Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt
ExecStart=/opt/traffic-manager.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Start traffic manager
sudo systemctl daemon-reload
sudo systemctl enable mtcat-traffic-manager
sudo systemctl start mtcat-traffic-manager
```

## Step 6: Test the Setup

### Health Check Tests

```bash
# Test physical server health
curl -s https://your-domain.com/api/health | jq

# Test detailed metrics
curl -s https://your-domain.com/api/health | jq '.scaling'

# Test Cloud Run health
curl -s https://mcathcat-[hash]-uc.a.run.app/api/health | jq
```

### Load Testing

```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Test with moderate load
ab -n 1000 -c 10 https://your-domain.com/

# Test with high load to trigger scaling
ab -n 5000 -c 50 https://your-domain.com/
```

### Monitor Traffic Distribution

```bash
# Check load balancer metrics
gcloud compute backend-services describe physical-server-backend --global
gcloud compute backend-services describe cloud-run-backend --global

# Check Cloud Run metrics
gcloud run services describe mcathcat --region=asia-northeast3
```

## Step 7: Monitoring and Alerting

### Log Monitoring

```bash
# Physical server monitoring logs
sudo journalctl -u mtcat-monitor -f

# Traffic manager logs
sudo journalctl -u mtcat-traffic-manager -f

# Application logs
docker logs -f mcathcat
```

### Set Up Alerting (Optional)

```bash
# Install alerting tools
sudo apt install -y mailutils

# Configure email alerts in monitoring scripts
# Edit scripts/deployment/hybrid-scaling/physical-server-monitor.sh
# Uncomment and configure the webhook/email alert sections
```

## Configuration Reference

### Environment Variables

```env
# Physical server .env.production
NODE_ENV=production
PORT=8080
MOUNTAIN_ID=geyang

# Firebase configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mountaincats-61543
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
# ... (other Firebase configs)

# Scaling configuration
SCALING_ENABLED=true
SCALING_CPU_THRESHOLD=80
SCALING_MEMORY_THRESHOLD=85
SCALING_CONNECTIONS_THRESHOLD=1000
```

### Scaling Thresholds

- **CPU > 80%**: Scale up Cloud Run, reduce physical server traffic
- **Memory > 85%**: Scale up Cloud Run, reduce physical server traffic
- **Connections > 1000**: Scale up Cloud Run
- **Response time > 2s**: Scale up Cloud Run
- **Error rate > 5%**: Scale up Cloud Run

### Traffic Distribution Logic

- **Normal operation**: Physical 80%, Cloud Run 20%
- **Physical degraded**: Physical 60%, Cloud Run 40%
- **Physical under high load**: Physical 50%, Cloud Run 50%
- **Physical unhealthy**: Physical 20%, Cloud Run 80%
- **Physical recovering**: Physical 90%, Cloud Run 10%

## Troubleshooting

### Common Issues

1. **Physical server not receiving traffic**

   ```bash
   # Check health check status
   gcloud compute backend-services get-health physical-server-backend --global

   # Check firewall rules
   gcloud compute firewall-rules list --filter="name~'.*443.*'"
   ```

2. **Cloud Run not scaling**

   ```bash
   # Check Cloud Run logs
   gcloud run services logs read mcathcat --region=asia-northeast3

   # Check scaling configuration
   gcloud run services describe mcathcat --region=asia-northeast3
   ```

3. **Health checks failing**

   ```bash
   # Test health endpoint directly
   curl -v https://your-domain.com/api/health

   # Check application logs
   docker logs mcathcat
   ```

### Rollback Plan

If issues occur, you can quickly rollback:

```bash
# Route all traffic to Cloud Run
gcloud compute backend-services update physical-server-backend \
  --global \
  --backend="network-endpoint-group=physical-server-neg,balancing-mode=UTILIZATION,max-utilization=0.01"

gcloud compute backend-services update cloud-run-backend \
  --global \
  --backend="network-endpoint-group=cloud-run-neg,balancing-mode=RATE,max-rate=1000"

# Or completely disable physical server backend
gcloud compute backend-services remove-backend physical-server-backend \
  --network-endpoint-group=physical-server-neg \
  --global
```

## Cost Optimization

- **Cloud Run**: Pay only for actual requests and compute time
- **Load Balancer**: ~$18/month for global load balancer
- **Physical Server**: Your existing hardware costs
- **Bandwidth**: Pay for egress traffic from Google Cloud

Expected costs with moderate traffic:

- Load Balancer: ~$18/month
- Cloud Run (overflow): ~$10-50/month depending on usage
- Total additional cost: ~$28-68/month

## Security Considerations

1. **Firewall Rules**: Restrict access to your physical server
2. **SSL/TLS**: Terminate SSL at load balancer
3. **Authentication**: Use Google IAM for Cloud Run management
4. **Secrets**: Store sensitive data in Google Secret Manager
5. **Network Security**: Use VPC if possible

This hybrid approach gives you the best of both worlds: cost-effective physical server for normal load with cloud elasticity for peak traffic!
