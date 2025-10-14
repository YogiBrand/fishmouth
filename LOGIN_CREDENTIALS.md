# 🔐 Fish Mouth AI - Login Credentials

## ✅ Authentication System Status
- ✅ **Backend API**: Running on http://localhost:8000
- ✅ **Frontend App**: Running on http://localhost:3000
- ✅ **Database**: Initialized with test users
- ✅ **Login Functionality**: Fully working

---

## 📋 Test Accounts

### 👤 REGULAR USER (Business Owner/Roofer)
```
Email:    user@test.com
Password: password123
Role:     user
Access:   User Dashboard
```

**What you can do:**
- ✅ View leads and property scans
- ✅ See AI-generated insights
- ✅ Access dashboard with metrics
- ✅ View calendar and AI activity
- ✅ Manage your roofing business operations

**To Login:**
1. Go to http://localhost:3000
2. Click "Login" in the navigation
3. Enter the credentials above
4. You'll be redirected to the user dashboard

---

### 👨‍💼 ADMIN
```
Email:    admin@fishmouth.io
Password: admin123
Role:     admin
Access:   Admin Dashboard
```

**What you can do:**
- ✅ View all users in the system
- ✅ Monitor system-wide statistics
- ✅ Access admin-only features
- ✅ View recent scans and leads
- ✅ Manage platform operations

**To Login:**
1. Go to http://localhost:3000/admin/login
2. Enter the credentials above
3. You'll be redirected to the admin dashboard

---

### 🔐 SUPERADMIN (Full Access)
```
Email:    superadmin@fishmouth.io
Password: super123
Role:     superadmin
Access:   Full Admin Access
```

**What you can do:**
- ✅ Everything an admin can do
- ✅ Full system access
- ✅ User management
- ✅ System configuration
- ✅ Advanced analytics

**To Login:**
1. Go to http://localhost:3000/admin/login
2. Enter the credentials above
3. You'll have full system access

---

## 🧪 How to Test

### Test Regular User Login
```bash
# Using curl
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```

### Test Admin Login
```bash
# Using curl
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fishmouth.io","password":"admin123"}'
```

### Test in Browser
1. **User Dashboard**: 
   - Visit: http://localhost:3000
   - Click "Login"
   - Use user@test.com / password123

2. **Admin Dashboard**:
   - Visit: http://localhost:3000/admin/login
   - Use admin@fishmouth.io / admin123

---

## 🎯 Demo Dashboard Features to Test

Once logged in as a **user**, you can explore:

### 1. **Interactive Dashboard Demo** (Home Page)
- ✅ View key metrics (23 new leads, 8 hot leads, 5 appointments, $47K revenue)
- ✅ Interactive to-do list (click checkboxes to mark complete)
- ✅ Quick action buttons (Call Hot Lead, Book Inspection, etc.)
- ✅ 7-day lead generation chart with hot leads overlay
- ✅ AI call performance metrics with progress bars
- ✅ Lead quality distribution

### 2. **Leads Tab**
- ✅ Filter leads by status (All, Hot, Warm, Cold)
- ✅ View detailed lead cards with scores
- ✅ Click any lead to see full property analysis
- ✅ Expandable AI call notes
- ✅ Contact information and roof analysis
- ✅ Assign to sequences or call strategies

### 3. **Analytics Tab**
- ✅ Performance metrics and graphs
- ✅ Conversion statistics
- ✅ AI performance tracking

### 4. **Settings Tab**
- ✅ Profile editing
- ✅ Interactive notification preferences (checkboxes work!)
- ✅ AI agent configuration:
  - Voice tone selector (Professional/Friendly/Casual/Urgent)
  - Lead score threshold slider (50-100)
  - Call attempt limit dropdown
- ✅ "Save AI Settings" button with success message

### 5. **AI Activity Tab** 🤖
- ✅ Priority action items (High/Medium/Low)
  - Call Sarah Johnson (hot lead ready to book)
  - Follow up on 3 quotes (Martinez, Wong, Thompson)
  - View SMS auto-responses
- ✅ Live call conversation (expandable)
  - Real-time AI agent ↔ Homeowner dialogue
  - "Book Appointment" button
- ✅ Completed call summaries
- ✅ SMS campaign results
- ✅ Today's AI summary (147 calls, 43 SMS, 127 emails, 18 booked)

### 6. **Calendar Tab** 📅
- ✅ **One-week view** (Oct 10-16, 2025)
- ✅ **Packed with detailed AI activities**:
  - **Sunday**: Newsletter (200), Weekend callbacks (8)
  - **Monday**: 5 tasks including priority leads and SMS campaigns
  - **Tuesday**: 6 tasks with inspections and hot leads
  - **Wednesday**: 6 tasks including nurture emails and follow-ups
  - **Thursday**: 7 tasks with early calls, inspections, and closing calls
  - **Friday**: 6 tasks with weekly wrap and weekend prep
  - **Saturday**: 3 weekend tasks
- ✅ Color-coded tasks:
  - 🟢 Green = AI Calls
  - 🔵 Blue = Inspections  
  - 🟣 Purple = SMS Campaigns
  - 🟠 Orange = Email Sequences
  - 🔴 Red = Hot Leads
- ✅ Click any task to see details modal
- ✅ "Add Task" button to schedule new AI activities
- ✅ Interactive calendar filters

---

## 🔄 Reset Database (if needed)

If you ever need to reset the database and recreate test users:

```bash
docker exec fishmouth_backend python init_db.py
```

This will:
- Drop all existing tables
- Recreate fresh schema
- Create the 3 test accounts above

---

## 🐛 Troubleshooting

### Login fails with "Incorrect email or password"
```bash
# Reinitialize the database
docker exec fishmouth_backend python init_db.py
```

### Backend not responding
```bash
# Restart backend container
docker restart fishmouth_backend

# Check if it's running
docker ps | grep fishmouth_backend

# View logs
docker logs fishmouth_backend
```

### Frontend not loading
```bash
# Check if frontend is running
docker ps | grep fishmouth_frontend

# Restart if needed
docker restart fishmouth_frontend

# Check if accessible
curl http://localhost:3000
```

---

## 📊 API Documentation

Once the backend is running, you can view the interactive API docs:

**Swagger UI**: http://localhost:8000/docs
**ReDoc**: http://localhost:8000/redoc

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

✅ **Frontend**: http://localhost:3000 loads the beautiful Fish Mouth AI homepage
✅ **Backend**: http://localhost:8000 returns `{"message": "Fish Mouth AI API", "status": "online"}`
✅ **Login**: You can log in with any of the three test accounts
✅ **Dashboard**: After login, you see the interactive dashboard with live data
✅ **Navigation**: All tabs work (Dashboard, Leads, Analytics, Settings, AI Activity, Calendar)
✅ **Interactions**: Checkboxes, buttons, modals, and filters all respond correctly

---

## 🚀 Next Steps

1. **Test the Login Flow**:
   - Try logging in as regular user
   - Try logging in as admin
   - Check that the dashboards load correctly

2. **Explore Interactive Features**:
   - Check to-do items
   - Adjust AI settings
   - Click calendar events
   - Expand lead details
   - View AI activity conversations

3. **Test Mobile Responsiveness**:
   - Resize browser window
   - Check on mobile device
   - Verify all features work on small screens

---

**Last Updated**: October 10, 2025
**Status**: ✅ Fully Operational








