# Manufacturing ERP - Quick Start Checklist

Complete these 5 steps to get your ERP system running:

## ✅ Step 1: Create Database Tables (5 minutes)

- [ ] Open Supabase Dashboard: https://supabase.com/dashboard
- [ ] Select your "BabaFakiir's Org / ERP" project
- [ ] Click "SQL Editor" → "New Query"
- [ ] Copy all content from `setup-database.sql` file
- [ ] Paste into SQL Editor and click "Run"
- [ ] Wait for success message ✓

**Verify:** Go to "Table Editor" and confirm you see 16 tables

---

## ✅ Step 2: Install Dependencies (2 minutes)

```bash
# In your project directory
pnpm install
```

**Verify:** No errors in console

---

## ✅ Step 3: Run Development Server (1 minute)

```bash
pnpm dev
```

**Verify:** Console shows "✓ Ready in X.XXs" and "Local: http://localhost:3000"

---

## ✅ Step 4: Test Authentication (3 minutes)

- [ ] Open http://localhost:3000
- [ ] Click "Get Started" or navigate to `/auth/sign-up`
- [ ] Create test account:
  - Email: `test@example.com`
  - Password: `Test@12345`
- [ ] Confirm email (check inbox)
- [ ] Log in with your credentials

**Verify:** You see the main dashboard with KPI cards

---

## ✅ Step 5: Explore Modules (2 minutes)

From the sidebar, visit each module:
- [ ] **Dashboard** - KPI overview
- [ ] **Inventory** - Product & stock management
- [ ] **Sales Orders** - Create test sales order
- [ ] **Purchase Orders** - Create test purchase order
- [ ] **Manufacturing** - Create test work order
- [ ] **Finance** - Invoice management
- [ ] **HR** - Employee management
- [ ] **Admin** - Settings

---

## 🎉 Done! Your ERP System is Ready!

### What's Next?

### Option A: Add Sample Data
Run these SQL commands in Supabase SQL Editor:

```sql
-- Add test customer
INSERT INTO customers (name, email, phone, contact_person) VALUES
('Test Customer Ltd', 'test@customer.com', '555-1234', 'John Doe');

-- Add test supplier
INSERT INTO suppliers (name, email, phone, contact_person) VALUES
('Test Supplier Inc', 'supplier@test.com', '555-5678', 'Jane Smith');

-- Add test product
INSERT INTO products (code, name, category, unit_price, reorder_level) VALUES
('TEST-001', 'Test Product', 'Test Category', 100.00, 10);
```

### Option B: Deploy to Production
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy with one click

### Option C: Customize the System
- Update branding/logo
- Configure module-specific settings
- Add custom workflows
- Customize dashboard

---

## 📞 Quick Troubleshooting

**Problem:** Tables not created
- Check SQL error message in Supabase editor
- Verify you're in correct project
- Try running SQL query by query instead of all at once

**Problem:** Can't log in
- Check email confirmation
- Verify Supabase Auth is enabled
- Check environment variables are set

**Problem:** Dashboard blank
- Check browser console (F12) for errors
- Verify tables exist in Supabase
- Try logging out and back in

**Problem:** Can't create orders
- Verify at least one customer/supplier/product exists
- Check RLS policies in Supabase Auth Settings
- Check browser network tab for API errors

---

## 📚 Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Full Deployment Guide:** See `DEPLOYMENT_GUIDE.md`
- **Project Plan:** See `v0_plans/grand-method.md`

---

## 🚀 Performance Tips

- Modern browser (Chrome, Firefox, Safari, Edge)
- 4GB+ RAM recommended
- Stable internet connection
- Fast SSD for development

---

That's it! You now have a fully functional Manufacturing ERP System! 🎊

Questions? Check the DEPLOYMENT_GUIDE.md for detailed help.
