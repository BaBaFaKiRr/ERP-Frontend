# Manufacturing ERP - Complete Local Setup Instructions

This guide will walk you through setting up the Manufacturing ERP system on your machine from scratch.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed ([download](https://nodejs.org/))
- pnpm installed (`npm install -g pnpm`)
- Git installed ([download](https://git-scm.com/))
- Access to Supabase project (BabaFakiir's Org / ERP)
- A code editor (VS Code recommended)

## Complete Setup Steps

### Step 1: Clone/Download the Project

#### Option A: If you have Git
```bash
# Clone from your repository
git clone <your-repo-url>
cd manufacturing-erp
```

#### Option B: Download the files
1. Download the entire project from v0
2. Extract to a folder on your machine
3. Open terminal in that folder

### Step 2: Create Environment Variables File

1. **Open the project folder in your code editor**

2. **Create a new file named `.env.local`** in the root directory (same level as package.json)

3. **Copy these variable names** (frontend only — no company/proforma vars here):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ERP_API_URL=http://localhost:4000
```

Optional (local auth redirects): `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`

**ERP-Backend** uses its own `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, etc.). Seller/company details for invoices live in **Finance → Settings** (`invoice_settings_profiles` in the database), not in frontend env.

Legacy optional (backend only, migration fallback): `PI_COMPANY_NAME`, `PI_COMPANY_ADDRESS`, etc.

4. **Get the values from Supabase:**
   - Go to: https://supabase.com/dashboard
   - Select: BabaFakiir's Org → ERP project
   - Click: Settings (gear icon) in bottom left
   - Click: "API" tab
   - Copy these values:
     - **NEXT_PUBLIC_SUPABASE_URL** → Project URL
     - **NEXT_PUBLIC_SUPABASE_ANON_KEY** → `anon` public key
     - **SUPABASE_SERVICE_ROLE_KEY** → `service_role` secret key

5. **For POSTGRES_URL_NON_POOLING:**
   - Go to: Settings → Database
   - Look for "Connection string"
   - Copy the non-pooling connection string
   - OR leave it empty for now (not required if using HTTP)

6. **Your `.env.local` should look like:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_ERP_API_URL=http://localhost:4000
```

The frontend talks to Supabase **for authentication only** (login/session). Business data and document seller details come from **ERP-Backend**.

### Step 3: Create Database Tables

This is the CRITICAL step. Without tables, the app won't work.

#### Method 1: Using Supabase Web Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New Query" button (top right)

3. **Copy the SQL Migration**
   - In your project folder, find: `setup-database.sql`
   - Open it and select ALL content (Ctrl+A)
   - Copy (Ctrl+C)

4. **Execute the SQL**
   - In Supabase SQL Editor, paste the SQL (Ctrl+V)
   - Click "Run" button (▶️) in top right
   - Wait 30-60 seconds for completion
   - You should see: "Success" message

5. **Verify Tables Created**
   - Go to "Table Editor" in left sidebar
   - You should see all these tables:
     ```
     - users
     - customers
     - suppliers
     - products
     - inventory
     - sales_orders
     - sales_order_items
     - purchase_orders
     - purchase_order_items
     - work_orders
     - material_entries
     - stock_entries
     - invoices
     - payments
     - employees
     - finance_transactions
     ```

#### Method 2: Using psql Command Line (Alternative)

```bash
# If you have psql installed
psql -h your-project.supabase.co \
     -U postgres \
     -d postgres \
     -f setup-database.sql
```

When prompted for password, use your Supabase database password.

### Step 4: Install Dependencies

Open terminal in your project folder and run:

```bash
pnpm install
```

If you don't have pnpm installed:
```bash
npm install -g pnpm
pnpm install
```

Or use npm directly:
```bash
npm install
```

This will download all required packages (~2-3 minutes).

### Step 5: Start the Development Server

```bash
pnpm dev
```

Or if using npm:
```bash
npm run dev
```

You should see:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

### Step 6: Access the Application

1. **Open your browser**
   - Go to: http://localhost:3000

2. **You should see:**
   - Landing page with "Get Started" button
   - OR login page if already authenticated

3. **Create a Test Account:**
   - Click "Sign Up" or go to: http://localhost:3000/auth/sign-up
   - Enter:
     - Email: `admin@test.com`
     - Password: `Password@123`
   - Click "Sign Up"
   - Check your email inbox for confirmation link
   - Click the link to confirm
   - You'll be redirected to success page

4. **Log In:**
   - Go to: http://localhost:3000/auth/login
   - Enter your email and password
   - Click "Login"

5. **Access Dashboard:**
   - You should see the main dashboard
   - KPI cards showing metrics
   - Charts and graphs
   - Sidebar with module links

### Step 7: Explore the Modules

From the dashboard, click on these in the sidebar:

**Inventory**
- http://localhost:3000/dashboard/inventory
- Create → Add Products → Add Stock

**Sales**
- http://localhost:3000/dashboard/sales
- Create → Add Sales Order

**Purchase**
- http://localhost:3000/dashboard/purchase
- Create → Add Purchase Order

**Manufacturing**
- http://localhost:3000/dashboard/manufacturing
- Create → Add Work Order

**Finance**
- http://localhost:3000/dashboard/finance
- View invoices and payments

**HR**
- http://localhost:3000/dashboard/hr
- Employee management

**Admin**
- http://localhost:3000/dashboard/admin
- Settings and user management

### Step 8: Add Sample Data (Optional)

Go back to Supabase SQL Editor and run:

```sql
-- Add sample customers
INSERT INTO customers (name, email, phone, contact_person) VALUES
('ABC Manufacturing', 'contact@abc.com', '555-1111', 'John Doe'),
('XYZ Industries', 'info@xyz.com', '555-2222', 'Jane Smith'),
('Global Trade', 'sales@global.com', '555-3333', 'Mike Johnson');

-- Add sample suppliers
INSERT INTO suppliers (name, email, phone, contact_person) VALUES
('Steel Supplier', 'sales@steel.com', '555-4444', 'Bob Wilson'),
('Plastic Inc', 'support@plastic.com', '555-5555', 'Sarah Davis'),
('Electronics Co', 'info@electronics.com', '555-6666', 'Tom Brown');

-- Add sample products
INSERT INTO products (code, name, category, unit_price, reorder_level) VALUES
('PROD-001', 'Steel Sheet', 'Raw Material', 150.00, 20),
('PROD-002', 'Plastic Pellets', 'Raw Material', 50.00, 50),
('PROD-003', 'Assembly Part', 'Component', 75.00, 15),
('PROD-004', 'Finished Item', 'Finished Goods', 250.00, 10);

-- Add sample inventory
INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 100, 20, 'Warehouse A' FROM products WHERE code = 'PROD-001';

INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 250, 50, 'Warehouse B' FROM products WHERE code = 'PROD-002';

INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 45, 15, 'Warehouse A' FROM products WHERE code = 'PROD-003';

INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 30, 10, 'Warehouse C' FROM products WHERE code = 'PROD-004';
```

Then refresh your browser to see the data!

## Common Issues & Solutions

### Issue 1: "Module not found" error after pnpm install
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install
```

### Issue 2: "Cannot find .env.local"
**Solution:**
- Make sure you created the `.env.local` file in the ROOT folder
- NOT inside app/ or lib/ folders
- File should be at same level as package.json

### Issue 3: "Supabase connection error"
**Solution:**
- Double-check environment variable values (copy exactly)
- No extra spaces before/after values
- Verify you're using the correct project
- Check Supabase status: https://status.supabase.com/

### Issue 4: "Database tables don't exist"
**Solution:**
- Run the `setup-database.sql` again in Supabase
- Check for errors in SQL editor
- Verify all SQL ran successfully (check table count)

### Issue 5: "Can't sign up / email not working"
**Solution:**
- Check Supabase Auth Settings
- Verify email provider is configured
- Try signing up with different email
- Check spam/junk folder

### Issue 6: "Port 3000 already in use"
**Solution:**
```bash
# Use a different port
pnpm dev -- -p 3001

# Then access at http://localhost:3001
```

### Issue 7: "Blank dashboard after login"
**Solution:**
- Open browser dev tools (F12)
- Check Console tab for errors
- Check Network tab for failed requests
- Verify database tables exist

## Stopping the Server

To stop the development server:
- Press `Ctrl+C` in the terminal

To start again:
```bash
pnpm dev
```

## What's Next?

Now that you have the system running:

1. **Explore the UI**
   - Navigate through all modules
   - Test creating orders
   - Check dashboard KPIs

2. **Add More Data**
   - Create more customers/suppliers
   - Add more products
   - Create test orders

3. **Deploy to Production** (Optional)
   - See DEPLOYMENT_GUIDE.md for Vercel deployment
   - Or use `pnpm build && pnpm start` to run production build locally

4. **Customize**
   - Change branding/logo
   - Configure module settings
   - Add custom workflows

## File Organization on Your Machine

After setup, your folder should look like:
```
your-folder/
├── .env.local                    ← Create this file with env vars
├── setup-database.sql            ← Used for creating tables
├── DEPLOYMENT_GUIDE.md           ← Full deployment guide
├── QUICK_START.md               ← Quick checklist
├── PROJECT_STRUCTURE.md         ← Project overview
├── LOCAL_SETUP.md              ← This file
├── package.json
├── next.config.mjs
├── tsconfig.json
├── app/                         ← All application code
├── lib/                         ← Utilities and helpers
├── components/                  ← UI components
├── types/                       ← TypeScript types
├── middleware.ts
├── public/                      ← Static files
└── ... (other config files)
```

## Useful Commands

```bash
# Development
pnpm dev              # Start development server

# Production
pnpm build            # Create production build
pnpm start            # Run production build
pnpm preview          # Preview production build locally

# Debugging
pnpm dev --turbo      # Enable turbopack (faster)

# Database
# No direct command - use Supabase dashboard for SQL

# Cleanup
rm -rf node_modules   # Delete packages
rm -rf .next          # Delete build cache
```

## Security Notes

⚠️ **Important:**
- NEVER commit `.env.local` to Git
- NEVER share your SUPABASE_SERVICE_ROLE_KEY
- Always use HTTPS in production
- Enable 2FA for Supabase account
- Regular backups of Supabase database

## Getting Help

If you get stuck:

1. **Check the docs:**
   - DEPLOYMENT_GUIDE.md - Comprehensive guide
   - QUICK_START.md - Fast checklist
   - PROJECT_STRUCTURE.md - Project overview

2. **Check Supabase:**
   - https://supabase.com/docs
   - https://supabase.com/docs/guides/auth

3. **Check Next.js:**
   - https://nextjs.org/docs
   - https://nextjs.org/docs/getting-started

4. **Check status pages:**
   - Supabase: https://status.supabase.com/
   - Vercel: https://www.vercel-status.com/

## Success! 🎉

Once you see the dashboard with data, you have successfully set up the Manufacturing ERP system locally!

Next steps:
- Explore each module
- Add sample data
- Customize for your needs
- Deploy when ready

Good luck! If you need help, refer to the DEPLOYMENT_GUIDE.md
