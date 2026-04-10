# Manufacturing ERP System - Project Structure

## 📁 Project Layout

```
manufacturing-erp/
├── app/                              # Next.js App Router directory
│   ├── layout.tsx                    # Root layout with metadata
│   ├── page.tsx                      # Home page (landing)
│   ├── auth/                         # Authentication pages
│   │   ├── login/page.tsx           # User login
│   │   ├── sign-up/page.tsx         # User registration
│   │   ├── sign-up-success/page.tsx # Sign-up confirmation
│   │   ├── error/page.tsx           # Auth errors
│   │   └── callback/route.ts        # Supabase auth callback
│   ├── dashboard/                    # Protected routes
│   │   ├── layout.tsx               # Dashboard layout with sidebar
│   │   ├── page.tsx                 # Main dashboard with KPIs
│   │   ├── inventory/
│   │   │   └── page.tsx             # Inventory management
│   │   ├── sales/
│   │   │   ├── page.tsx             # Sales orders list
│   │   │   └── create/page.tsx      # Create sales order
│   │   ├── purchase/
│   │   │   ├── page.tsx             # Purchase orders list
│   │   │   └── create/page.tsx      # Create purchase order
│   │   ├── manufacturing/
│   │   │   ├── page.tsx             # Work orders list
│   │   │   └── create/page.tsx      # Create work order
│   │   ├── finance/
│   │   │   └── page.tsx             # Finance & accounting
│   │   ├── hr/
│   │   │   └── page.tsx             # HR & employees
│   │   └── admin/
│   │       └── page.tsx             # Admin settings
│   └── api/                          # API routes
│       ├── products/route.ts         # Product CRUD
│       ├── inventory/route.ts        # Inventory CRUD
│       ├── customers/route.ts        # Customer CRUD
│       ├── suppliers/route.ts        # Supplier CRUD
│       ├── sales-orders/route.ts     # Sales order CRUD
│       ├── purchase-orders/route.ts  # Purchase order CRUD
│       ├── work-orders/route.ts      # Work order CRUD
│       ├── invoices/route.ts         # Invoice CRUD
│       └── payments/route.ts         # Payment CRUD
├── components/
│   └── ui/                           # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── table.tsx
│       └── ... (other UI components)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   └── proxy.ts                  # Session proxy
│   └── utils.ts                      # Utility functions
├── hooks/
│   ├── use-mobile.ts                 # Mobile detection hook
│   ├── use-toast.ts                  # Toast notifications
│   └── ... (custom hooks)
├── types/
│   └── index.ts                      # TypeScript type definitions
├── middleware.ts                     # Next.js middleware for auth
├── app.globals.css                   # Global styles with Tailwind
├── tsconfig.json                     # TypeScript config
├── next.config.mjs                   # Next.js configuration
├── package.json                      # Dependencies
├── setup-database.sql                # Database migration script ⭐
├── DEPLOYMENT_GUIDE.md              # Full deployment instructions ⭐
├── QUICK_START.md                   # Quick start checklist ⭐
└── PROJECT_STRUCTURE.md             # This file
```

## 🔑 Key Files

### Critical Files (Must Execute/Configure)

1. **`setup-database.sql`** ⭐
   - SQL script to create all database tables
   - Execute in Supabase SQL Editor
   - Creates 16 tables with RLS policies
   - Takes ~1-2 minutes to run

2. **`.env.local`** (Create locally)
   - Environment variables for database connection
   - Copy from Vercel project settings
   - Required for local development

3. **`middleware.ts`**
   - Handles authentication redirects
   - Protects dashboard routes
   - Manages session/token refresh

### Configuration Files

- **`next.config.mjs`** - Next.js configuration
- **`tsconfig.json`** - TypeScript settings
- **`package.json`** - Dependencies and scripts
- **`app/globals.css`** - Tailwind CSS configuration

## 📦 Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19.2
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui with Radix UI
- **Charts:** Recharts
- **Icons:** Lucide React
- **Language:** TypeScript

### Backend
- **Runtime:** Node.js
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth (JWT)
- **ORM:** Direct SQL queries
- **Session Management:** HTTP-only cookies

### Deployment
- **Platform:** Vercel (recommended)
- **Alternative:** Self-hosted Node.js server
- **Database:** Supabase (PostgreSQL)

## 🗄️ Database Schema

### Core Tables (16 Total)

**Organizational**
- `users` - Application users linked to auth.users
- `employees` - Employee records with payroll
- `customers` - Customer information
- `suppliers` - Supplier information

**Products & Inventory**
- `products` - Product master data
- `inventory` - Stock levels by product

**Sales Management**
- `sales_orders` - Customer sales orders
- `sales_order_items` - Line items for sales

**Purchase Management**
- `purchase_orders` - Supplier purchase orders
- `purchase_order_items` - Line items for purchases

**Manufacturing**
- `work_orders` - Production work orders
- `material_entries` - Material requests/entries
- `stock_entries` - Inventory debit/credit ledger

**Finance**
- `invoices` - Customer invoices
- `payments` - Payment records
- `finance_transactions` - General ledger

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Stateless auth tokens
- **Protected Routes** - Middleware-based route protection
- **Environment Variables** - Secrets management
- **HTTPS Only** - Secure communication
- **Session Management** - HTTP-only cookies

## 🚀 Running Locally

```bash
# Install dependencies
pnpm install

# Set up .env.local with Supabase credentials
# (Copy from Vercel project settings)

# Run development server
pnpm dev

# Open http://localhost:3000
```

## 📡 API Routes

All API routes return JSON and handle both GET/POST/PUT/DELETE:

- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/inventory` - List inventory
- `POST /api/sales-orders` - Create sales order
- `GET /api/sales-orders` - List sales orders
- `POST /api/purchase-orders` - Create purchase order
- `GET /api/work-orders` - List work orders
- `POST /api/invoices` - Create invoice
- `POST /api/payments` - Record payment

## 📊 Module Features

### Inventory Module
- Product listing and search
- Stock level tracking
- Reorder level alerts
- Warehouse location management
- Low stock warnings

### Sales Module
- Sales order creation with line items
- Customer management
- Order status tracking
- Delivery tracking
- Proforma invoice support

### Purchase Module
- Purchase order creation
- Supplier management
- Order approval workflow
- Receipt tracking
- Price history

### Manufacturing Module
- Work order creation from sales orders
- Production progress tracking
- Material requirement management
- Quality tracking
- Production reports

### Finance Module
- Invoice generation from sales orders
- Payment tracking
- Accounts payable/receivable
- Financial reporting
- Transaction ledger

### HR Module
- Employee management
- Payroll processing
- Attendance tracking
- Performance management
- Document management

### Admin Module
- User management
- Company settings
- Role assignment
- Data backup
- System reports

## 🔄 Data Flow

```
Customer Order
    ↓
Sales Order (Draft → Pending → Approved)
    ├→ Inventory Check
    ├→ Work Order Creation
    │   ├→ Material Entry
    │   ├→ Production
    │   └→ Stock Update
    ├→ Invoice Generation
    └→ Payment Receipt
        ↓
    Accounts Receivable Update
```

## 📈 Performance Optimizations

- Static site generation where possible
- Image optimization
- Code splitting
- Database query optimization
- Caching strategies
- API response compression

## 🧪 Testing the System

### Test Account
- Email: `test@example.com`
- Password: `Test@12345`

### Test Data
See QUICK_START.md for sample data insertion scripts

### Verification Checklist
- [ ] Can sign up and confirm email
- [ ] Can log in
- [ ] Can create sales order
- [ ] Can create purchase order
- [ ] Can create work order
- [ ] Can view inventory
- [ ] Can create invoice

## 📖 Documentation Files

1. **QUICK_START.md** - 5-step quick setup guide
2. **DEPLOYMENT_GUIDE.md** - Comprehensive deployment instructions
3. **PROJECT_STRUCTURE.md** - This file
4. **setup-database.sql** - Database schema

## 🐛 Common Issues & Solutions

See DEPLOYMENT_GUIDE.md's Troubleshooting section for:
- Database table creation issues
- Authentication problems
- API errors
- Data display issues

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Recharts:** https://recharts.org/docs

## 🎯 Next Steps

1. ✅ Execute `setup-database.sql` in Supabase
2. ✅ Run `pnpm install`
3. ✅ Run `pnpm dev`
4. ✅ Test with sample account
5. ✅ Deploy to Vercel or your server

---

**Your Manufacturing ERP System is ready to go!** 🚀
