# CleanPulse - Smart Civic Waste Management System

A full-stack, enterprise-grade civic cleanliness platform built with **Flask (Python)** and **Modern Semantic HTML5 / Tailwind CSS / Vanilla JavaScript**.

CleanPulse connects **Citizens (Users)**, municipal **Waste Collectors**, and the **Municipal Administrator** in a cohesive real-time loop with 48-hour SLA resolution tracking, proof-of-work photo verification, citizen reward badges, collector digital coins convertible to cash, and 4-tier colorized waste area alerts.

---

## 🌟 Key Roles & Features

### 1. Citizens / Users
- **Authentication**: Sign in via Email or Phone Number + Password. Self-registration generates a unique citizen ID (e.g. `USR-29481`).
- **Profile & Personal Details**: View and update Name, Age, Area, Email ID, Phone Number, and Gender with an inline modal.
- **Report Box**:
  - File waste complaints with description, area selection, and photo submission (file upload or quick-pick samples).
  - Automatically initializes a **48-hour SLA deadline**.
- **Score & Badges**:
  - Automatically rewards badges based on the total number of complaints filed:
    - 🥉 **Bronze Badge**: 25 complaints
    - 🥈 **Silver Badge**: 50 complaints
    - 🥇 **Gold Badge**: 100 complaints
  - Visual progress bar towards the next rank.
- **Tracking / Completed**:
  - Live **48-Hour countdown timers** (`HH:MM:SS`) tracking the time remaining until municipal SLA expiry.
  - 4-Stage visual workflow: `Reported` &rarr; `Assigned` &rarr; `In Progress` &rarr; `Completed`.
  - Notification banner notifying the citizen when the collector clears the complaint (`"Task Completed"`) with the collector's verification proof photo.
- **Area Details**:
  - Displays designated dumping and collection spots for the user's ward.
  - Pickup schedules and waste capacity metrics.
  - Direct contact information for assigned waste collectors.

---

### 2. Municipal Waste Collectors
- **Authentication**: Sign in via Email or Phone Number + Password. Unique employee ID (e.g. `COL-41092`).
- **Dashboard**:
  - Real-time KPIs for Pending vs Completed/Resolved complaints.
- **Personal Progress**:
  - View all complaints reported in the collector's assigned area.
  - **Mandatory Photo Verification**: When resolving a task, the collector **must upload a picture of the cleared place** before marking it as resolved.
  - **Progress Bar**: Automatically rises as complaints are resolved.
- **Incentives & Digital Coins**:
  - Achieving **&ge; 70% daily progress** awards **+1 Digital Coin** per calendar day.
  - Digital coins accumulate in the collector's vault.
  - End-of-month cash conversion: 1 Coin = **$10.00 USD** (or ₹500) with instant payout simulation.

---

### 3. Central Administrator (Single-User Portal)
- **Single-User Sign In**: Administrator access via `admin@cleanwaste.com` / `admin123` or phone `9999999999`.
- **Executive Dashboard**:
  - Live counters for:
    - **Total Users**
    - **Total Complains**
    - **Waste Collectors**
    - **Resolve Complains**
- **Waste Area Alert System**:
  - Dynamically categorizes municipal wards into 4 color alert levels based on user complaint volume:
    - 🔴 **High Alert (Red)**: &ge; 5 active complaints
    - 🟠 **Medium Alert (Orange)**: 2 &ndash; 4 active complaints
    - 🟡 **Low Alert (Yellow)**: 1 active complaint
    - 🟢 **Clear / Pristine (Green)**: 0 active complaints
  - **Interactive Color Buttons**: Clicking any color button immediately filters and displays only the areas matching that specific alert category.
- **User Loggers**:
  - Filterable, searchable table displaying User Unique IDs, names, contact info, area, total complaints filed, and badge ranks.
- **Sanitation Employees (Collectors)**:
  - Table of all municipal collectors showing ID, assigned ward, contact info, tasks assigned, tasks resolved, digital coins earned, and performance rate.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Flask)

### 1. Running the Platform
Navigate to the project directory and run:
```powershell
python app.py
```
Open your web browser and visit:
```
http://localhost:5000
```

### 2. Pre-Configured Demo Credentials

Use the **One-Click Quick Switcher** buttons in the navigation bar to test all views instantly, or use these credentials:

| Role | Name / Title | Email / Phone | Password | Unique ID |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen (User)** | Aarav Mehta | `aarav.mehta@example.com` or `9123456780` | `user123` | `USR-29481` |
| **Collector (Downtown)** | Rajesh Sharma | `rajesh.collector@cleanwaste.com` or `9876543210` | `col123` | `COL-41092` |
| **Collector (Market Sq)** | Manoj Kumar | `manoj.collector@cleanwaste.com` or `9876543214` | `col123` | `COL-65239` |
| **Admin** | Sanitation Director | `admin@cleanwaste.com` or `9999999999` | `admin123` | `ADM-001` |

---

## 🛠️ Directory Structure

```
cleanpulse_waste_management/
├── app.py                  # Flask REST API backend server
├── database.py             # SQLite schema, tables & seed data
├── cleanpulse.db           # SQLite database
├── requirements.txt        # Dependencies (Flask)
├── test_endpoints.py       # Automated testing suite
├── README.md               # Documentation
└── static/
    ├── index.html          # Responsive Single Page Application
    ├── css/
    │   └── styles.css      # Custom styling, badges & animations
    └── js/
        └── app.js          # Client-side routing, timers & handlers
```
