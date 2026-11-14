# LAX360 UNIVERSAL BILLING & BUSINESS MANAGEMENT SAAS

Production-ready, multi-tenant, multi-business-category universal billing and business management SaaS platform designed to power six distinct industry verticals under a unified core billing engine.

---

## 1. System Overview & Architecture

Instead of maintaining six disparate applications, **LAX360 BILLING** uses a single core engine coupled with a **Dynamic Business Configuration Engine**. When a tenant registers and selects their business category, the platform automatically tailors:

- **Sidebar Navigation**: Category-specific views (e.g., Table & KDS for restaurants, Serial/IMEI for mobile shops).
- **Dashboard Metrics & KPIs**: Vertical-tailored widgets (e.g., Occupied tables, expiring drug batches, dealer credit utilization).
- **POS Billing Interface**: Rapid barcode scanner, weight conversions, variant matrices, or table-ordering modes.
- **Data Models & Custom Fields**: Dynamic schemas stored per product and invoice without altering database tables.
- **Statutory GST Engine**: Precision Decimal128 calculations for Indian CGST, SGST, IGST, HSN classification, and GSTR returns.

```
+-------------------------------------------------------------------------+
|                  LAX360 Dynamic Configuration Engine                    |
+-------------------------------------------------------------------------+
|  Grocery  | Restaurant | Pharmacy |  Textile  | Wholesale | Electronics |
+-----------+------------+----------+-----------+-----------+-------------+
|               Universal Indian GST Billing & POS Engine                 |
|               (Decimal Precision • Atomic Numbering • RBAC)             |
+-------------------------------------------------------------------------+
|                    FastAPI Modular REST API Layer                       |
+-------------------------------------------------------------------------+
|              MongoDB Atlas Multi-Tenant Isolated Storage                |
+-------------------------------------------------------------------------+
```

---

## 2. Six Supported Business Categories

1. **Grocery & Supermarket**
   - Rapid barcode checkout terminal
   - Fractional unit measurements (Kg, Gm, Ltr, Pack)
   - Product shelf-life and expiry batch monitoring
   - Wholesale vs. retail pricing toggle

2. **Restaurant & Cafe**
   - Visual floor table layout & occupancy tracker
   - Kitchen Order Ticket (KOT) automated generator
   - Real-time Kitchen Display System (KDS) live queue
   - Dine-in, Takeaway, and Delivery order workflows
   - Split billing & table transfers

3. **Pharmacy & Medical Store**
   - Medicine batch number and manufacturing/expiry date tracking
   - Generic salt composition & manufacturer search
   - Schedule H warning flags & mandatory prescription record logging
   - Expired medicine stock auditing

4. **Textile & Garments**
   - Size (S, M, L, XL, XXL) and Color matrix variant tracking
   - Retail apparel barcode hang-tag generator with MRP
   - Garment fit exchanges and return registers

5. **Wholesale & Distribution**
   - Tiered B2B pricing (Distributor, Dealer, Retailer)
   - Minimum Order Quantity (MOQ) enforcement
   - Customer credit limits & outstanding receivables ledger
   - Multi-warehouse depot management & stock transfers

6. **Electronics & Mobile Shop**
   - Dual IMEI and serial number tracking
   - Brand warranty period verification
   - Device service & repair job ticketing (Diagnostics -> Repaired -> Delivered)
   - Model specifications and accessories billing

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 (Vite, Plain JavaScript - No TypeScript)
- **Styling**: Tailwind CSS v4 (Pearl-white `#f8fafc` background, Indigo & Purple accents)
- **Routing**: React Router DOM v7
- **State Management**: React Context API (`AuthContext`, `BusinessConfigContext`)
- **API Client**: Axios (with Bearer JWT injection & 401 token refresh interceptor)
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React
- **Analytics Charts**: Recharts

### Backend
- **Framework**: Python 3.13 / FastAPI
- **Data Validation**: Pydantic v2
- **Database Driver**: PyMongo 4.x / Motor 3.x (with zero-setup in-memory mock fallback)
- **Security**: Direct `bcrypt` password hashing & `PyJWT` access/refresh token rotation
- **Calculation Engine**: `decimal.Decimal` with `ROUND_HALF_UP` precision
- **PDF Generation**: ReportLab vector PDF generator

### Database
- **MongoDB Atlas** with tenant isolation indexes on `(tenant_id, ...)`

---

## 4. One-Click Demo Accounts

The backend seed script automatically provisions pre-populated demo environments for all business categories and platform administration:

| Role / Vertical | Email | Password | Key Data Seeded |
| :--- | :--- | :--- | :--- |
| **SaaS Super Admin** | `admin@lax360.com` | `Admin@12345` | Global platform GMV, tenant list, MRR metrics |
| **Grocery Store** | `demo.grocery@lax360.com` | `Demo@12345` | Staples, dairy, FMCG items, barcodes, Kg units |
| **Restaurant & Cafe** | `demo.restaurant@lax360.com` | `Demo@12345` | Tables T-1 to T-8, KOT tickets, Food variants |
| **Pharmacy Store** | `demo.pharmacy@lax360.com` | `Demo@12345` | Batch numbers, expiry warnings, Schedule H drugs |
| **Textile Studio** | `demo.textile@lax360.com` | `Demo@12345` | Size/Color matrix, hang-tags, exchanges |
| **Wholesale Depot** | `demo.wholesale@lax360.com` | `Demo@12345` | Tiered pricing, dealer credit limits, warehouses |
| **Electronics Shop** | `demo.electronics@lax360.com` | `Demo@12345` | Smartphones, IMEI numbers, warranty lookup, repairs |

---

## 5. Local Setup & Quick Start Guide

### Prerequisites
- Node.js v18+ and npm
- Python 3.10+

### Step 1: Clone and Prepare Virtual Environment
```bash
cd "Billing Software"

# Create python virtual environment
python -m venv venv

# Activate on Windows:
.\venv\Scripts\activate
# Activate on Linux/Mac:
# source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### Step 2: Configure Environment Variables
Copy `backend/.env.example` to `backend/.env`:
```env
PROJECT_NAME="LAX360 Universal Billing SaaS"
SECRET_KEY="lax360-super-secret-jwt-key-2026-production-ready-universal-billing"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# MongoDB Atlas URI (or leave blank to use automatic in-memory DB)
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
DATABASE_NAME="lax360_billing"
USE_IN_MEMORY_FALLBACK=True
```

### Step 3: Launch FastAPI Backend
```bash
cd backend
python run.py
# Server starts on http://127.0.0.1:8000
# Interactive Swagger Documentation: http://127.0.0.1:8000/docs
```

### Step 4: Launch React Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 6. Indian GST Calculation Specification

The platform implements an exact, auditable Indian GST calculation engine:

1. **Intra-State vs. Inter-State Determination**:
   - If `seller_state == buyer_state`: Splits GST into equal parts:
     $$\text{CGST} = \text{Tax Rate} / 2, \quad \text{SGST} = \text{Tax Rate} / 2$$
   - If `seller_state != buyer_state`:
     $$\text{IGST} = \text{Tax Rate}$$

2. **Tax Inclusive vs. Tax Exclusive Handling**:
   - Exclusive:
     $$\text{Taxable} = \text{Gross} - \text{Discount}, \quad \text{Tax} = \text{Taxable} \times (\text{Rate} / 100)$$
   - Inclusive:
     $$\text{Taxable} = (\text{Gross} - \text{Discount}) / (1 + \text{Rate} / 100), \quad \text{Tax} = (\text{Gross} - \text{Discount}) - \text{Taxable}$$

3. **Accounting Round-Off**:
   - Commercial invoice totals round to the nearest whole rupee with round-off pennies tracked separately in the ledger.
   - Converts final payable to formal Indian currency words (Crores, Lakhs, Thousands, Hundreds, Rupees & Paise).

---

## 7. Automated Testing

The backend includes a comprehensive pytest suite covering all authentication workflows, category configurations, decimal GST calculations, concurrency numbering, and PDF generation:

```bash
cd backend
pytest test_api.py -v
```

All 7 integration test suites pass with 100% verification.

---

## 8. Deployment to Production

### Deploy Backend (Render / Railway / AWS ECS)
1. Set Build Command: `pip install -r backend/requirements.txt`
2. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `SECRET_KEY`: High-entropy 64-character secret
   - `USE_IN_MEMORY_FALLBACK`: `False` (for persistent Atlas database)

### Deploy Frontend (Vercel / Netlify / Cloudflare Pages)
1. Build Command: `npm run build`
2. Output Directory: `dist`
3. Configure API proxy or set environment variable `VITE_API_URL` to your live Render backend URL.

---

## 9. License & Attribution
Designed and built for **LAX360 Universal Billing SaaS**. All rights reserved.
