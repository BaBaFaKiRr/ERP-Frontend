# Manufacturing ERP System

A comprehensive Enterprise Resource Planning (ERP) system built for manufacturing businesses using Next.js, Supabase, and React.

## 🎯 Overview

This is a complete manufacturing ERP system implementing the Hedgeone ERP flow with support for:
- **Inventory Management** - Product and stock tracking
- **Sales Orders** - Customer order management
- **Purchase Orders** - Supplier order management
- **Manufacturing** - Work order and production management
- **Finance & Accounting** - Invoicing and payment tracking
- **HR & Employees** - Employee and payroll management
- **Admin** - System settings and user management

## ⚡ Quick Start (5 minutes)

### Step 1: Create Database Tables
```
1. Open: https://supabase.com/dashboard
2. Go to: SQL Editor → New Query
3. Copy content from: setup-database.sql
4. Paste and click "Run"
5. Wait for success ✓
```

### Step 2: Install Dependencies
```bash
pnpm install
```

### Step 3: Set Up Environment Variables
Create `.env.local` in `ERP-Frontend` with:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ERP_API_URL=http://localhost:4000
```

Configure **ERP-Backend** separately (`.env` with `SUPABASE_SERVICE_ROLE_KEY`, etc.). Company/bank details for proforma and PDFs are managed under **Finance → Settings**, not in frontend env.

### Step 4: Run Development Server
```bash
pnpm dev
```

### Step 5: Access Application
- Open: http://localhost:3000
- Sign up with test account
- Access dashboard and modules

## 📖 Documentation

- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - Complete step-by-step local setup
- **[QUICK_START.md](./QUICK_START.md)** - Quick checklist (5 steps)
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Production deployment
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Code organization

## 🏗️ Project Structure

```
manufacturing-erp/
├── app/
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Protected dashboard routes
│   ├── api/           # REST API routes
│   └── page.tsx       # Home page
├── lib/supabase/      # Supabase clients
├── components/        # UI components
├── types/            # TypeScript definitions
├── setup-database.sql # Database schema ⭐
└── middleware.ts     # Auth middleware
```

## 🗄️ Database Schema

16 tables covering:
- Users, Customers, Suppliers
- Products, Inventory
- Sales Orders, Purchase Orders
- Work Orders, Material Entries
- Invoices, Payments
- Employees, Finance Transactions

All with Row Level Security (RLS) policies.

## 🚀 Features

✅ Role-based access control (Admin, Manager, Supervisor, Employee)
✅ Complete order management (Sales, Purchase, Work Orders)
✅ Real-time inventory tracking
✅ Invoice and payment management
✅ Production workflow tracking
✅ Dashboard with KPI metrics and charts
✅ Responsive mobile-friendly design
✅ Secure JWT authentication
✅ Database-level access control

## 💻 Technology Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19.2
- TypeScript
- Tailwind CSS v4
- shadcn/ui Components
- Recharts

**Backend:**
- Node.js
- PostgreSQL (Supabase)
- Supabase Auth
- REST APIs

## 🔐 Security

- JWT Token Authentication
- Row Level Security (RLS)
- Protected Routes
- HTTP-only Cookies
- Encrypted Passwords
- Environment Variables

## 📱 Modules

### Inventory
- Product management
- Stock level tracking
- Reorder alerts
- Warehouse locations

### Sales
- Sales order creation
- Customer management
- Order tracking
- Proforma invoices

### Purchase
- Purchase order creation
- Supplier management
- PO approval workflow
- Receipt tracking

### Manufacturing
- Work order creation
- Production tracking
- Material management
- Progress monitoring

### Finance
- Invoice generation
- Payment tracking
- Account management
- Financial reports

### HR
- Employee records
- Payroll management
- Attendance tracking
- Performance review

### Admin
- User management
- Company settings
- Role assignment
- System configuration

## 🔄 Data Flow

```
Customer Order
  ↓
Sales Order (Draft → Approved)
  ├→ Work Order
  │  ├→ Material Issue
  │  └→ Production
  ├→ Invoice
  └→ Payment
```

## 📊 API Endpoints

```
GET    /api/products              - List products
POST   /api/products              - Create product
GET    /api/inventory             - List inventory
POST   /api/sales-orders          - Create sales order
GET    /api/sales-orders          - List sales orders
POST   /api/purchase-orders       - Create purchase order
GET    /api/purchase-orders       - List purchase orders
POST   /api/work-orders           - Create work order
GET    /api/work-orders           - List work orders
POST   /api/invoices              - Create invoice
POST   /api/payments              - Record payment
```

## 🧪 Test Data

Sample data SQL scripts included in LOCAL_SETUP.md

```sql
-- Add customers, suppliers, products, and inventory
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
git push origin main
# Vercel auto-deploys
# Add environment variables in Vercel dashboard
```

### Self-Hosted
```bash
pnpm build
pnpm start
```

See DEPLOYMENT_GUIDE.md for detailed instructions.

## 📋 Requirements

- Node.js 18+
- pnpm (or npm)
- Supabase account
- PostgreSQL database (via Supabase)

## 🐛 Troubleshooting

### Tables not created?
- Execute setup-database.sql in Supabase SQL Editor
- Check for SQL errors

### Can't log in?
- Verify email confirmation
- Check Supabase Auth settings
- Clear browser cookies

### Dashboard blank?
- Check browser console (F12) for errors
- Verify tables exist in Supabase
- Check environment variables

See DEPLOYMENT_GUIDE.md for more troubleshooting.

## 📞 Support

- **Supabase:** https://supabase.com/docs
- **Next.js:** https://nextjs.org/docs
- **Tailwind:** https://tailwindcss.com/docs
- **React:** https://react.dev

## 📝 License

This project is provided as-is for educational and business use.

## 🎯 Next Steps

1. ✅ Follow LOCAL_SETUP.md to get running
2. ✅ Test with sample data
3. ✅ Customize for your business
4. ✅ Deploy to production

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| LOCAL_SETUP.md | Step-by-step local setup guide |
| QUICK_START.md | 5-minute quick start checklist |
| DEPLOYMENT_GUIDE.md | Production deployment instructions |
| PROJECT_STRUCTURE.md | Code organization and architecture |
| README.md | This file |

## 🚀 Version

**Manufacturing ERP v1.0.0**
- Built with Next.js 16
- Supabase PostgreSQL backend
- Complete with all core modules
- Production-ready code

---

**Ready to get started? See [LOCAL_SETUP.md](./LOCAL_SETUP.md)** 👈

For questions or issues, check the documentation files or the troubleshooting section.

Happy manufacturing! 🏭
