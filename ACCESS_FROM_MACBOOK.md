# 🍎 Access Fish Mouth from Your MacBook

## ✅ YOUR APP IS RUNNING!

**Status:** The application is live and accessible  
**Frontend:** Running on port 3000  
**Backend:** Running on port 8000  
**Admin UI (Vite dev server):** Running on port 5173  
**Admin API:** Running on port 8031  
**Telemetry Gateway:** Running on port 8030  
**Billing Gateway:** Running on port 8032  
**Tileserver / Imagery:** Running on ports 8080 (tiles) and 8081 (titiler)  
**Grafana (Observability):** Running on port 3001  

---

## 🌐 HOW TO ACCESS FROM YOUR MACBOOK

### **Method 1: Using localhost (If running on MacBook)**
If Docker is running on your MacBook:
```
http://localhost:3000
```

### **Method 2: Using Server IP (If running on remote server)**
If the Docker containers are running on a remote Linux server:
```
http://[SERVER_IP]:3000        # marketing app
http://[SERVER_IP]:5173        # admin UI dev server
http://[SERVER_IP]:8031        # admin API
http://[SERVER_IP]:8030        # telemetry gateway
http://[SERVER_IP]:8032        # billing gateway
http://[SERVER_IP]:8080        # tileserver-gl
http://[SERVER_IP]:8081        # titiler imagery
http://[SERVER_IP]:3001        # grafana dashboards
```
Replace `[SERVER_IP]` with your actual server IP address.

### **Method 3: Using 127.0.0.1**
```
http://127.0.0.1:3000
```

To reach the admin stack through SSH tunnelling (recommended):

```
ssh -L 3000:localhost:3000 \
    -L 5173:localhost:5173 \
    -L 8031:localhost:8031 \
    -L 8030:localhost:8030 \
    -L 8032:localhost:8032 \
    -L 8080:localhost:8080 \
    -L 8081:localhost:8081 \
    -L 3001:localhost:3001 \
    yogi@[SERVER_IP]
```

After connecting, visit `http://localhost:5173` (admin UI), `http://localhost:8031` (admin API), etc., directly from your MacBook.

### **SSH Config Shortcut**

Add the following block to `~/.ssh/config` on your MacBook to make the forwards automatic:

```
Host fishmouth
    HostName [SERVER_IP]
    User yogi
    LocalForward 3000 localhost:3000
    LocalForward 5173 localhost:5173
    LocalForward 8031 localhost:8031
    LocalForward 8030 localhost:8030
    LocalForward 8032 localhost:8032
    LocalForward 8080 localhost:8080
    LocalForward 8081 localhost:8081
    LocalForward 3001 localhost:3001
```

Then connect with `ssh fishmouth` and all ports will map through automatically.

---

## 🔍 TROUBLESHOOTING

### **Problem: "Can't reach the site"**

**Solution 1: Check if containers are running**
```bash
cd /home/yogi/fishmouth
docker-compose ps
```
Look for:
- `fishmouth_frontend` - Should show "Up"
- `fishmouth_backend` - Should show "Up"

**Solution 2: Restart frontend**
```bash
cd /home/yogi/fishmouth
docker-compose restart frontend
sleep 10
```

**Solution 3: Check frontend logs**
```bash
docker-compose logs frontend --tail 50
```
Look for: "webpack compiled" or "Compiled successfully"

**Solution 4: Rebuild frontend**
```bash
cd /home/yogi/fishmouth
docker-compose up -d --build frontend
```

---

## 🖥️ IF RUNNING ON REMOTE SERVER

If Docker is running on a Linux server and you're accessing from your MacBook:

### **Step 1: Find Your Server IP**
On the server, run:
```bash
hostname -I | awk '{print $1}'
```
Or:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### **Step 2: Access via IP**
On your MacBook, open browser and go to:
```
http://[YOUR_SERVER_IP]:3000
```

### **Step 3: Check Firewall**
If you can't connect, you may need to open port 3000 on the server:
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

---

## 🧪 QUICK TESTS

### **Test 1: Check if port 3000 is listening**
On the server:
```bash
ss -tuln | grep 3000
# Should show: *:3000
```

### **Test 2: Test from server itself**
On the server:
```bash
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK
```

### **Test 3: Test backend**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","database":"connected"}
```

---

## 🚀 EXPECTED RESULT

When you successfully access http://localhost:3000 (or http://[SERVER_IP]:3000), you should see:

✅ **Beautiful landing page with:**
- Blue gradient hero section
- "Generate Quality Roofing Leads While You Sleep" headline
- Stats banner showing 10,000+ leads
- 6 feature cards
- Client testimonials
- Pricing section (Free, $299, Enterprise)
- Footer

✅ **After 5 seconds:**
- Bouncing fish icon appears (bottom-right) 🐟
- Click it to open AI chatbot

---

## 📱 MOBILE ACCESS

You can also access from your iPhone/iPad on the same network:
```
http://[SERVER_IP]:3000
```

---

## 💡 QUICK FIX COMMANDS

If the app isn't loading, try these in order:

```bash
# 1. Check status
cd /home/yogi/fishmouth
docker-compose ps

# 2. Restart everything
docker-compose restart

# 3. If frontend shows "Exit", rebuild it
docker-compose up -d --build frontend

# 4. Watch logs to see what's happening
docker-compose logs frontend -f

# 5. Full reset (if needed)
docker-compose down
docker-compose up -d
```

---

## 🎯 VERIFY IT'S WORKING

### **From Your MacBook Terminal:**
```bash
# Test if server is reachable (replace with your server IP)
ping [SERVER_IP]

# Test if port 3000 is open
nc -zv [SERVER_IP] 3000

# Or use telnet
telnet [SERVER_IP] 3000
```

### **Expected Output:**
- Ping: Should get replies
- nc: Should show "Connection to [IP] 3000 port [tcp/*] succeeded!"

---

## 🔥 IF STILL NOT WORKING

1. **Check Docker is running:**
```bash
docker ps
```

2. **Check container logs:**
```bash
docker logs fishmouth_frontend
```

3. **Access container directly:**
```bash
docker exec -it fishmouth_frontend sh
# Inside container:
wget -O- http://localhost:3000
```

4. **Check port mapping:**
```bash
docker port fishmouth_frontend
# Should show: 3000/tcp -> 0.0.0.0:3000
```

---

## 📞 CURRENT STATUS

Run this to see current status:
```bash
echo "=== SERVICE STATUS ==="
docker-compose ps

echo ""
echo "=== PORT LISTENERS ==="
ss -tuln | grep -E ":(3000|8000)"

echo ""
echo "=== FRONTEND TEST ==="
curl -I http://localhost:3000

echo ""
echo "=== BACKEND TEST ==="
curl http://localhost:8000/health
```

---

**Once you can access the app, you're ready to:**
1. 🎨 See the beautiful landing page
2. 🤖 Test the AI chatbot
3. 📝 Sign up and create an account
4. 🚀 Start generating leads!

**Your Fish Mouth app is running and waiting for you!** 🐟
