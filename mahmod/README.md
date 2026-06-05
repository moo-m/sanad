# 🏗️ Engineering Daily Reports & Site Cost Management System

A comprehensive web-based enterprise application designed specifically for construction companies, consulting engineers, project managers, and site supervisors.

The system automates daily site reporting, equipment tracking, workforce management, procurement documentation, financial inventory calculations, and analytical reporting while providing secure cloud-based access using Firebase services.

---

## 📋 Overview

The platform enables engineering teams to:

* Create and manage daily construction reports.
* Track equipment operation and fuel consumption.
* Monitor workforce productivity and attendance.
* Record procurement transactions and supplier deliveries.
* Generate financial inventory summaries and Excel reports.
* Share reports securely with consultants and stakeholders.
* Analyze project performance through dynamic dashboards and charts.

---

# 📂 Project Structure

```text
├── login.html              # Engineer/Owner authentication page
├── index.html              # Main dashboard and reports management
├── report.html             # Daily report creation and editing
├── inventory.html          # Financial inventory and Excel export module
├── viewer_login.html       # Consultant/Viewer login page
├── shared_dashboard.html   # Shared reports dashboard
├── viewer_report.html      # Read-only report viewer
└── analytics.html          # Analytics and visualization dashboard
```

---

# ⚙️ System Architecture & Subsystems

## 1. Equipment & Fleet Management

### ⏱ Automatic Operating Hours Calculation

The system calculates machine operating hours automatically by computing the time difference between start and end times entered by the engineer.

### ⛽ Fuel Consumption Tracking

* Diesel quantity monitoring
* Fuel cost calculation
* Invoice attachment support
* Cloud storage integration

### 🔧 Preventive & Corrective Maintenance

Record:

* Equipment breakdowns
* Filter replacement
* Oil changes
* Spare parts usage
* Maintenance costs
* Supporting invoices

### 🛢 Consumables Management

Track:

* Oil consumption
* Grease usage
* Operational consumables

for cost control and efficiency monitoring.

---

## 2. Workforce & Labor Management

The system records:

* Employee names
* Job titles
* Attendance hours
* Departure hours
* Total working hours

### 📍 Work Area Tracking

Each worker can be assigned to a specific project zone or work area.

### 📐 Productivity Monitoring

The system supports recording:

* Completed Area
* Daily production quantities

allowing direct comparison between productivity and labor costs.

---

## 3. Procurement Management Module

Track all site purchases and deliveries including:

* Cement
* Reinforcement steel
* Electrical cables
* Site fuel
* Other construction materials

For each procurement entry:

* Material type
* Supplier
* Quantity
* Total price
* Invoice number
* Digital attachment

are securely stored for auditing and financial verification.

---

## 4. Financial Inventory & Excel Reporting Module

### 📅 Advanced Filtering

Users can generate reports using:

#### Date Range Mode

Select a start date and end date.

#### Manual Selection Mode

Select multiple non-consecutive days manually.

---

### ⚡ In-Memory Processing

The inventory engine processes and sorts data directly in the browser without requiring Firestore composite indexes.

Benefits include:

* Faster response time
* Reduced database complexity
* Lower Firebase costs
* Improved reliability

---

### 📊 Excel Export (SheetJS)

Generated workbooks contain:

#### Financial Summary

Includes:

* Number of days
* Diesel expenses
* Maintenance expenses
* Oil expenses
* Grease expenses
* Procurement expenses
* Grand total

#### Financial Details

Detailed transaction ledger including:

* Date
* Category
* Description
* Amount

---

# 🔄 Data Flow

## A. Engineer / Owner Workflow

### Authentication

Users authenticate through:

```text
login.html
```

using Firebase Authentication.

### Dashboard Access

After authentication:

```text
index.html
```

loads all daily reports associated with the authenticated user's UID.

### Report Creation

New reports are stored under:

```text
users/{userId}/daily_reports/{date}
```

### Smart Auto Save

A debounced auto-save mechanism waits one second after user input stops before updating Firestore.

Benefits:

* Reduced write operations
* Improved performance
* Continuous data protection

---

## B. Consultant / Viewer Workflow

### Authentication

Consultants log in through:

```text
viewer_login.html
```

### Shared Reports Dashboard

The system queries:

```text
shared_reports
```

and displays only reports where the viewer's email exists within the authorized viewers list.

### Report Viewing

Selected reports are loaded through:

```text
viewer_report.html
```

with read-only permissions.

### Analytics Dashboard

```text
analytics.html
```

retrieves the same data source and generates:

* Charts
* Statistics
* Trend analysis

using Chart.js.

---

# 🔐 Firestore Security Model

The platform implements strict ownership-based security.

### Owners

Can:

* Read reports
* Create reports
* Update reports
* Delete reports
* Manage sharing permissions

### Viewers

Can:

* Read only shared reports
* Access reports only when their email is explicitly listed in the sharing document

Authentication is validated using:

```javascript
request.auth.token.email
```

ensuring that unauthorized users cannot access project data belonging to other organizations.

---

# 🛡 Security Features

## XSS Protection

The application sanitizes and escapes user-generated content to prevent:

* Cross-Site Scripting (XSS)
* Script injection
* Malicious HTML execution

---

## Data Isolation

Every engineer has complete ownership of their project data.

Consultants can only access reports that have been explicitly shared with them.

---

## Smart Cloud Synchronization

The system continuously synchronizes data with Firebase Firestore, minimizing the risk of:

* Data loss
* Accidental overwrites
* Synchronization conflicts

---

# 🚀 Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript (ES Modules)

### Cloud Services

* Firebase Authentication
* Cloud Firestore
* Firebase Hosting

### Reporting & Analytics

* Chart.js
* SheetJS (XLSX)

### Architecture

* Single Page Style Interfaces
* Cloud-Native Storage
* Real-Time Synchronization

---

# 📈 Key Benefits

✅ Daily engineering reporting

✅ Equipment and fuel tracking

✅ Workforce productivity monitoring

✅ Procurement management

✅ Excel financial reporting

✅ Secure report sharing

✅ Advanced analytics dashboard

✅ Firebase cloud synchronization

✅ Role-based access control

✅ Enterprise-grade security

---

**Designed for construction companies, consulting engineers, project managers, and infrastructure projects requiring accurate daily reporting and financial transparency.**