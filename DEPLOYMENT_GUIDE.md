# Manufacturing ERP System - Complete Deployment Guide

Follow these steps to fully deploy the Manufacturing ERP system on your machine.

## Step 1: Set Up Supabase Database Tables

The database tables need to be created in your Supabase project before running the application.

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your "BabaFakiir's Org / ERP" project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute the Migration Script**
   - Open the file: `setup-database.sql` in your project root
   - Copy ALL the contents
   - Paste into the Supabase SQL Editor
   - Click "Run" button (▶️)
   - Wait for the success message showing all tables are created

4. **Verify Tables Were Created**
   - Click "Table Editor" in the left sidebar
   - You should see these tables:
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

### Option B: Using Supabase CLI (Alternative)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Execute the migration
cat setup-database.sql | supabase db execute --file -
```

## Step 2: Environment Variables Setup

The environment variables should already be set in your Vercel project, but verify them:

1. **Check Current Environment Variables**
   - In v0 UI, click the settings icon (⚙️) in top right
   - Go to "Vars" section
   - You should see these variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `POSTGRES_URL_NON_POOLING` (if using direct database access)

2. **If Running Locally**
   - Create a `.env.local` file in your project root
   - Add the same environment variables from Vercel
   - You can get these from:
     - Supabase Dashboard → Settings → API
     - Vercel Project Settings → Environment Variables

```
# .env.local example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
POSTGRES_URL_NON_POOLING=postgresql://...
```

## Step 3: Install Dependencies

```bash
# Install all required packages
pnpm install

# or
npm install

# or
yarn install
```

## Step 4: Run the Development Server

```bash
# Start the Next.js development server
pnpm dev

# or
npm run dev
```

The application will be available at: **http://localhost:3000**

## Step 5: Test the Application

### Create a Test Account

1. **Go to Sign Up Page**
   - Navigate to: http://localhost:3000/auth/sign-up
   - Enter:
     - Email: `admin@test.com`
     - Password: `Test@123456`
   - Click "Sign Up"

2. **Verify Email Confirmation**
   - Check your email inbox (or spam folder)
   - Click the confirmation link
   - You'll be redirected to the success page

3. **Log In**
   - Go to: http://localhost:3000/auth/login
   - Enter your email and password
   - Click "Login"

4. **Access Dashboard**
   - You'll be redirected to: http://localhost:3000/dashboard
   - You should see the main dashboard with KPI cards and charts

### Navigate Through Modules

From the dashboard sidebar, you can access:

- **Inventory** - Product and stock management
- **Sales Orders** - Create and manage sales orders
- **Purchase Orders** - Create and manage purchase orders
- **Manufacturing** - Work order management
- **Finance** - Invoices and payments
- **HR** - Employee management
- **Admin** - System settings and user management

## Step 6: Add Sample Data (Optional)

To test the application with data, you can add sample records:

1. **Add Sample Customers** (in Supabase SQL Editor)
```sql
INSERT INTO customers (name, email, phone, contact_person) VALUES
('ABC Manufacturing Ltd', 'contact@abc.com', '1234567890', 'John Doe'),
('XYZ Industries', 'info@xyz.com', '0987654321', 'Jane Smith'),
('Global Trade Inc', 'sales@global.com', '5555555555', 'Mike Brown');
```

2. **Add Sample Suppliers**
```sql
INSERT INTO suppliers (name, email, phone, contact_person) VALUES
('Steel Supplies Inc', 'sales@steel.com', '1112223333', 'Mike Johnson'),
('Plastic Components Ltd', 'support@plastic.com', '4445556666', 'Sarah Williams'),
('Electronics Supplier', 'info@electronics.com', '7778889999', 'Robert Garcia');
```

3. **Add Sample Products**
```sql
INSERT INTO products (code, name, category, unit_price, reorder_level) VALUES
('PROD-001', 'Steel Sheet A1', 'Raw Materials', 150.00, 20),
('PROD-002', 'Plastic Pellets', 'Raw Materials', 50.00, 50),
('PROD-003', 'Assembly Part X', 'Components', 75.00, 15),
('PROD-004', 'Finished Assembly', 'Finished Goods', 250.00, 10);
```

4. **Add Sample Inventory**
```sql
INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 100, 20, 'Warehouse A' FROM products WHERE code = 'PROD-001';

INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 250, 50, 'Warehouse B' FROM products WHERE code = 'PROD-002';

INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, warehouse_location)
SELECT id, 45, 15, 'Warehouse A' FROM products WHERE code = 'PROD-003';
```

## Step 7: Deploy to Production

### Option A: Deploy to Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Manufacturing ERP System"
git push origin main
```

2. **Connect to Vercel**
   - Go to: https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js
   - Add environment variables (same as in Step 2)
   - Click "Deploy"

### Option B: Deploy to Your Own Server

```bash
# Build the project
pnpm build

# Start the production server
pnpm start

# The app will be available at http://your-domain:3000
```

## Step 8: Verify Production Deployment

1. **Test authentication flow**
   - Create a new account
   - Verify email confirmation works
   - Log in and access dashboard

2. **Test core modules**
   - Create a sales order
   - Create a purchase order
   - Create a work order
   - Check inventory levels

3. **Monitor logs**
   - Check Vercel deployment logs for errors
   - Check browser console (F12) for client-side errors
   - Check Supabase logs for database issues

## Troubleshooting

### Issue: Tables Not Created
**Solution:**
- Verify you're in the correct Supabase project
- Check for SQL errors in the editor output
- Ensure the SQL script ran completely without stopping
- Check Supabase status page for outages

### Issue: Authentication Not Working
**Solution:**
- Verify environment variables are set correctly
- Check Supabase Auth settings (confirm email required)
- Check email delivery in Supabase → Auth → Email Templates
- Clear browser cookies and try again

### Issue: Data Not Showing in Dashboard
**Solution:**
- Verify tables exist in Supabase Table Editor
- Check RLS policies are correctly applied
- Use Supabase SQL Editor to query data directly
- Verify user has correct role in users table

### Issue: API Errors
**Solution:**
- Check browser network tab (F12) for failed requests
- Check server logs (pnpm dev output)
- Verify API routes exist in `/app/api` folder
- Check Supabase connection string in environment variables

## Next Steps

After successful deployment:

1. **Customize the System**
   - Update company branding/logo
   - Configure module-specific settings
   - Add custom workflows if needed

2. **Complete Module Implementation**
   - Connect all modules to actual database operations
   - Add advanced features like reporting and analytics
   - Implement workflow approvals

3. **Security Hardening**
   - Configure RLS policies per role
   - Set up audit logging
   - Enable 2FA for users
   - Configure backup strategies

4. **Performance Optimization**
   - Set up caching strategies
   - Optimize database queries
   - Configure CDN for static assets
   - Set up monitoring and alerts

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Check Next.js documentation: https://nextjs.org/docs
- Review the ERP flow diagram for process understanding

Good luck with your Manufacturing ERP System deployment! 🚀
