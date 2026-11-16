import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import get_database
from app.core.security import get_password_hash
from app.services.config_engine import BUSINESS_CATEGORIES

def seed_database():
    db = get_database()
    print("Starting database seeding...")

    # 1. Platform Super Admin
    super_admin_email = "admin@lax360.com"
    existing_super = db.users.find_one({"email": super_admin_email})
    if not existing_super:
        super_admin_id = str(uuid.uuid4())
        db.users.insert_one({
            "id": super_admin_id,
            "tenant_id": None,
            "email": super_admin_email,
            "full_name": "LAX360 Platform Super Admin",
            "phone": "+91 9876543210",
            "hashed_password": get_password_hash("Admin@12345"),
            "role": "saas_super_admin",
            "branch_ids": [],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print("Created SaaS Platform Super Admin (admin@lax360.com / Admin@12345)")

    # 2. Seed business vertical demo tenants
    demo_tenants_data = [
        {
            "category": "grocery",
            "name": "FreshMart Supermarket",
            "owner": "Ramesh Kumar",
            "email": "demo.grocery@lax360.com",
            "phone": "9811122334",
            "gstin": "07AAAAA0000A1Z5",
            "address": "Shop 12, Main Market, Sector 14",
            "city": "New Delhi",
            "state": "Delhi",
            "prefix": "GRO",
            "products": [
                {"name": "Aashirvaad Shudh Chakki Atta 5kg", "sku": "ATT-001", "barcode": "8901030382341", "category": "Staples", "unit": "Pack", "purchase_price": 210, "selling_price": 260, "tax_rate": 5, "stock": 45, "hsn_sac": "1101"},
                {"name": "Tata Salt Vacuum Evaporated 1kg", "sku": "SLT-002", "barcode": "8901030382342", "category": "Staples", "unit": "Pack", "purchase_price": 22, "selling_price": 28, "tax_rate": 0, "stock": 120, "hsn_sac": "2501"},
                {"name": "Amul Butter Pasteurised 500g", "sku": "BTR-003", "barcode": "8901030382343", "category": "Dairy", "unit": "Pack", "purchase_price": 240, "selling_price": 275, "tax_rate": 12, "stock": 35, "hsn_sac": "0405"},
                {"name": "Fortune Sunlite Refined Sunflower Oil 1L", "sku": "OIL-004", "barcode": "8901030382344", "category": "Oils", "unit": "Ltr", "purchase_price": 130, "selling_price": 165, "tax_rate": 5, "stock": 60, "hsn_sac": "1512"},
                {"name": "Basmati Rice Royal Premium 5kg", "sku": "RCE-005", "barcode": "8901030382345", "category": "Grains", "unit": "Kg", "purchase_price": 450, "selling_price": 580, "tax_rate": 5, "stock": 25, "hsn_sac": "1006"}
            ]
        },
        {
            "category": "restaurant",
            "name": "Spice Route Bistro & Cafe",
            "owner": "Chef Vikram Oberoi",
            "email": "demo.restaurant@lax360.com",
            "phone": "9822233445",
            "gstin": "27AAAAA0000A1Z5",
            "address": "45 Park Avenue, Connaught Place",
            "city": "Mumbai",
            "state": "Maharashtra",
            "prefix": "REST",
            "products": [
                {"name": "Dum Handi Chicken Biryani", "sku": "DIS-001", "barcode": "DSH-01", "category": "Main Course", "unit": "Plate", "purchase_price": 120, "selling_price": 380, "tax_rate": 5, "stock": 100, "hsn_sac": "9963", "custom_fields": {"food_type": "Non-Veg", "food_category": "Main Course", "preparation_time": 20}},
                {"name": "Paneer Butter Masala", "sku": "DIS-002", "barcode": "DSH-02", "category": "Main Course", "unit": "Portion", "purchase_price": 90, "selling_price": 320, "tax_rate": 5, "stock": 100, "hsn_sac": "9963", "custom_fields": {"food_type": "Veg", "food_category": "Main Course", "preparation_time": 15}},
                {"name": "Crispy Chilli Babycorn", "sku": "DIS-003", "barcode": "DSH-03", "category": "Starters", "unit": "Portion", "purchase_price": 60, "selling_price": 240, "tax_rate": 5, "stock": 100, "hsn_sac": "9963", "custom_fields": {"food_type": "Veg", "food_category": "Starters", "preparation_time": 12}},
                {"name": "Butter Garlic Naan", "sku": "DIS-004", "barcode": "DSH-04", "category": "Breads", "unit": "Pcs", "purchase_price": 15, "selling_price": 65, "tax_rate": 5, "stock": 200, "hsn_sac": "9963", "custom_fields": {"food_type": "Veg", "food_category": "Breads", "preparation_time": 5}},
                {"name": "Cold Brew Hazelnut Frappe", "sku": "DIS-005", "barcode": "DSH-05", "category": "Beverages", "unit": "Glass", "purchase_price": 40, "selling_price": 180, "tax_rate": 5, "stock": 150, "hsn_sac": "9963", "custom_fields": {"food_type": "Veg", "food_category": "Beverages", "preparation_time": 8}}
            ]
        },
        {
            "category": "pharmacy",
            "name": "MedLife Care Chemist & Druggist",
            "owner": "Dr. Sunil Gupta",
            "email": "demo.pharmacy@lax360.com",
            "phone": "9833344556",
            "gstin": "06AAAAA0000A1Z5",
            "address": "Near Civil Hospital, MG Road",
            "city": "Gurugram",
            "state": "Haryana",
            "prefix": "MED",
            "products": [
                {"name": "Augmentin 625 Duo Tablet", "sku": "MED-001", "barcode": "890203038201", "category": "Antibiotics", "unit": "Strip", "purchase_price": 160, "selling_price": 204, "tax_rate": 12, "stock": 50, "hsn_sac": "3004", "custom_fields": {"batch_number": "AG62-441", "expiry_date": "10/26", "manufacturer": "GSK", "composition": "Amoxycillin and Potassium Clavulanate", "is_schedule_h": True}},
                {"name": "Dolo 650mg Paracetamol", "sku": "MED-002", "barcode": "890203038202", "category": "Analgesics", "unit": "Strip", "purchase_price": 25, "selling_price": 34, "tax_rate": 12, "stock": 140, "hsn_sac": "3004", "custom_fields": {"batch_number": "DL65-982", "expiry_date": "08/27", "manufacturer": "Micro Labs", "composition": "Paracetamol 650mg", "is_schedule_h": False}},
                {"name": "Pantocid 40 Tablet", "sku": "MED-003", "barcode": "890203038203", "category": "Antacids", "unit": "Strip", "purchase_price": 95, "selling_price": 135, "tax_rate": 12, "stock": 80, "hsn_sac": "3004", "custom_fields": {"batch_number": "PC40-112", "expiry_date": "04/27", "manufacturer": "Sun Pharma", "composition": "Pantoprazole 40mg", "is_schedule_h": False}},
                {"name": "Montair LC Kid Syrup 60ml", "sku": "MED-004", "barcode": "890203038204", "category": "Respiratory", "unit": "Bottle", "purchase_price": 110, "selling_price": 158, "tax_rate": 12, "stock": 30, "hsn_sac": "3004", "custom_fields": {"batch_number": "MLC-893", "expiry_date": "12/26", "manufacturer": "Cipla", "composition": "Montelukast + Levocetirizine", "is_schedule_h": True}}
            ]
        },
        {
            "category": "textile",
            "name": "Zoya Couture & Garments",
            "owner": "Pooja Malhotra",
            "email": "demo.textile@lax360.com",
            "phone": "9844455667",
            "gstin": "08AAAAA0000A1Z5",
            "address": "Fashion Street, Raja Park",
            "city": "Jaipur",
            "state": "Rajasthan",
            "prefix": "GAR",
            "products": [
                {"name": "Men Slim Fit Cotton Linen Shirt", "sku": "SHR-001", "barcode": "890403038001", "category": "Men Apparel", "unit": "Pcs", "purchase_price": 650, "selling_price": 1499, "tax_rate": 5, "stock": 65, "hsn_sac": "6205", "custom_fields": {"brand": "Louis Phillipe", "sizes": "M, L, XL", "colors": "Sky Blue, White", "fabric": "Linen Blend", "gender": "Men"}},
                {"name": "Women Embroidered Anarkali Kurta Set", "sku": "KUR-002", "barcode": "890403038002", "category": "Ethnic Wear", "unit": "Set", "purchase_price": 1200, "selling_price": 2899, "tax_rate": 12, "stock": 40, "hsn_sac": "6204", "custom_fields": {"brand": "Biba", "sizes": "S, M, L, XL", "colors": "Maroon, Emerald", "fabric": "Chanderi Silk", "gender": "Women"}},
                {"name": "Straight Leg Stretch Denim Jeans", "sku": "JNS-003", "barcode": "890403038003", "category": "Denim", "unit": "Pcs", "purchase_price": 850, "selling_price": 1999, "tax_rate": 12, "stock": 55, "hsn_sac": "6203", "custom_fields": {"brand": "Levi's", "sizes": "30, 32, 34, 36", "colors": "Indigo, Charcoal", "fabric": "Denim", "gender": "Men"}}
            ]
        },
        {
            "category": "wholesale",
            "name": "Apex Wholesale & FMCG Distribution",
            "owner": "Harish Patel",
            "email": "demo.wholesale@lax360.com",
            "phone": "9855566778",
            "gstin": "24AAAAA0000A1Z5",
            "address": "Plot 89, GIDC Transport Nagar",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "prefix": "WHL",
            "products": [
                {"name": "Refined Soybean Oil (15kg Tin)", "sku": "WHL-OIL-01", "barcode": "890503038001", "category": "Edible Oils", "unit": "Tin", "purchase_price": 1750, "selling_price": 1980, "tax_rate": 5, "stock": 400, "hsn_sac": "1507", "custom_fields": {"moq": 10, "distributor_price": 1880, "dealer_price": 1920, "retailer_price": 1980, "warehouse_location": "Bay-4 Central"}},
                {"name": "Sugar M-30 Grade (50kg Bag)", "sku": "WHL-SGR-02", "barcode": "890503038002", "category": "Sugar & Sweeteners", "unit": "Bag", "purchase_price": 1850, "selling_price": 2100, "tax_rate": 5, "stock": 300, "hsn_sac": "1701", "custom_fields": {"moq": 20, "distributor_price": 1980, "dealer_price": 2020, "retailer_price": 2100, "warehouse_location": "Godown A"}}
            ]
        },
        {
            "category": "electronics",
            "name": "NextGen Mobiles & Gadgets",
            "owner": "Ankit Sharma",
            "email": "demo.electronics@lax360.com",
            "phone": "9866677889",
            "gstin": "29AAAAA0000A1Z5",
            "address": "Shop 102, SP Road Electronic Complex",
            "city": "Bengaluru",
            "state": "Karnataka",
            "prefix": "MOB",
            "products": [
                {"name": "Apple iPhone 15 Pro 128GB", "sku": "IPH-15P-128", "barcode": "890603038001", "category": "Smartphones", "unit": "Pcs", "purchase_price": 108000, "selling_price": 124900, "tax_rate": 18, "stock": 12, "hsn_sac": "8517", "custom_fields": {"brand": "Apple", "model_number": "A3102", "warranty_months": 12, "has_imei": True, "imei_numbers": "354921098412345, 354921098412346"}},
                {"name": "Samsung Galaxy S24 Ultra 256GB", "sku": "SAM-S24U-256", "barcode": "890603038002", "category": "Smartphones", "unit": "Pcs", "purchase_price": 102000, "selling_price": 119999, "tax_rate": 18, "stock": 8, "hsn_sac": "8517", "custom_fields": {"brand": "Samsung", "model_number": "SM-S928B", "warranty_months": 12, "has_imei": True, "imei_numbers": "358765432198765"}},
                {"name": "Sony WH-1000XM5 ANC Headphones", "sku": "SNY-XM5-BLK", "barcode": "890603038003", "category": "Audio & Accessories", "unit": "Pcs", "purchase_price": 22000, "selling_price": 29990, "tax_rate": 18, "stock": 18, "hsn_sac": "8518", "custom_fields": {"brand": "Sony", "model_number": "WH-1000XM5", "warranty_months": 12, "has_imei": False}}
            ]
        }
    ]

    for item in demo_tenants_data:
        email = item["email"]
        existing = db.users.find_one({"email": email})
        if existing:
            continue

        now = datetime.now(timezone.utc).isoformat()
        t_id = str(uuid.uuid4())
        u_id = str(uuid.uuid4())

        # Tenant
        db.tenants.insert_one({
            "id": t_id,
            "name": item["name"],
            "business_category": item["category"],
            "owner_id": u_id,
            "owner_name": item["owner"],
            "email": email,
            "phone": item["phone"],
            "gstin": item["gstin"],
            "address": item["address"],
            "city": item["city"],
            "state": item["state"],
            "pincode": "110001",
            "currency": "INR",
            "financial_year": "2025-2026",
            "invoice_prefix": item["prefix"],
            "default_tax_rate": 18.0,
            "is_tax_inclusive": False,
            "is_setup_completed": True,
            "subscription": {
                "plan": "professional",
                "status": "ACTIVE",
                "billing_cycle": "monthly",
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).strftime("%Y-%m-%d")
            },
            "created_at": now,
            "updated_at": now
        })

        # HQ Branch
        db.branches.insert_one({
            "id": "HQ",
            "tenant_id": t_id,
            "name": "Main Branch / Headquarter",
            "code": "HQ",
            "address": item["address"],
            "phone": item["phone"],
            "is_main": True,
            "created_at": now
        })

        # Owner User (Password: Demo@12345)
        db.users.insert_one({
            "id": u_id,
            "tenant_id": t_id,
            "email": email,
            "full_name": item["owner"],
            "phone": item["phone"],
            "hashed_password": get_password_hash("Demo@12345"),
            "role": "business_owner",
            "branch_ids": ["HQ"],
            "is_active": True,
            "created_at": now,
            "updated_at": now
        })

        # Products
        for prod in item["products"]:
            p_id = str(uuid.uuid4())
            db.products.insert_one({
                "id": p_id,
                "tenant_id": t_id,
                "name": prod["name"],
                "sku": prod["sku"],
                "barcode": prod.get("barcode", prod["sku"]),
                "category": prod["category"],
                "description": f"Quality {prod['name']} from {item['name']}",
                "unit": prod["unit"],
                "purchase_price": prod["purchase_price"],
                "selling_price": prod["selling_price"],
                "tax_rate": prod["tax_rate"],
                "is_tax_inclusive": False,
                "hsn_sac": prod.get("hsn_sac", "9983"),
                "stock": prod["stock"],
                "low_stock_threshold": 5,
                "custom_fields": prod.get("custom_fields", {}),
                "created_at": now,
                "updated_at": now
            })

        # Default Customer
        cust_id = str(uuid.uuid4())
        db.customers.insert_one({
            "id": cust_id,
            "tenant_id": t_id,
            "name": "Ananya Sharma",
            "phone": "9876501234",
            "email": "ananya.sharma@example.com",
            "gstin": "",
            "billing_address": "Flat 402, Royal Palms",
            "city": item["city"],
            "state": item["state"],
            "credit_limit": 50000,
            "customer_tier": "DEALER" if item["category"] == "wholesale" else "RETAIL",
            "outstanding_balance": 0.0,
            "total_spent": 0.0,
            "created_at": now
        })

        # Default Supplier
        sup_id = str(uuid.uuid4())
        db.suppliers.insert_one({
            "id": sup_id,
            "tenant_id": t_id,
            "name": "National Wholesale Distributors Ltd",
            "contact_person": "Vikas Anand",
            "phone": "9810099887",
            "email": "orders@nationaldist.com",
            "gstin": "07AAAAA9999A1Z1",
            "address": "Logistics Hub, Transport Nagar",
            "city": item["city"],
            "state": item["state"],
            "total_purchases": 0.0,
            "outstanding_payables": 0.0,
            "created_at": now
        })

        # Sample Expenses
        db.expenses.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": t_id,
            "category": "Rent",
            "amount": 25000.0,
            "payment_method": "BANK_TRANSFER",
            "date": now[:10],
            "description": "Monthly commercial shop rent",
            "reference": "TXN-RENT-01",
            "created_at": now
        })
        db.expenses.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": t_id,
            "category": "Utilities",
            "amount": 4200.0,
            "payment_method": "UPI",
            "date": now[:10],
            "description": "Electricity & Water Bill",
            "reference": "UPI-EB-889",
            "created_at": now
        })

        # Restaurant tables if restaurant
        if item["category"] == "restaurant":
            for i in range(1, 9):
                db.restaurant_tables.insert_one({
                    "id": str(uuid.uuid4()),
                    "tenant_id": t_id,
                    "table_number": f"T-{i}",
                    "floor": "Ground Floor",
                    "status": "OCCUPIED" if i == 2 else "FREE",
                    "active_order": "KOT-0001" if i == 2 else None,
                    "created_at": now
                })

        # Seed sample invoices for dashboard metrics and reports
        if len(item["products"]) >= 2 and db.invoices.count_documents({"tenant_id": t_id}) == 0:
            p1_info = item["products"][0]
            qty1 = 2
            rate1 = float(p1_info["selling_price"])
            trate1 = float(p1_info.get("tax_rate", 5))
            taxable1 = round(qty1 * rate1, 2)
            tax1 = round(taxable1 * (trate1 / 100.0), 2)
            cgst1 = round(tax1 / 2.0, 2)
            sgst1 = round(tax1 / 2.0, 2)
            total1 = round(taxable1 + tax1, 2)

            db.invoices.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": t_id,
                "invoice_number": f"{item.get('prefix', 'INV')}-{datetime.now(timezone.utc).year}-0001",
                "invoice_type": "REGULAR",
                "branch_id": "HQ",
                "business_category": item["category"],
                "customer_id": cust_id,
                "customer_name": "Ananya Sharma",
                "customer_phone": "9876501234",
                "customer_gstin": "",
                "customer_address": "Flat 402, Royal Palms",
                "seller_name": item["name"],
                "seller_gstin": item.get("gstin", ""),
                "seller_address": item.get("address", ""),
                "seller_city": item.get("city", ""),
                "seller_state": item.get("state", "Delhi"),
                "items": [{
                    "product_id": str(uuid.uuid4()),
                    "name": p1_info["name"],
                    "sku": p1_info.get("sku", ""),
                    "quantity": qty1,
                    "unit": p1_info.get("unit", "Pcs"),
                    "selling_price": rate1,
                    "tax_rate": trate1,
                    "taxable_amount": taxable1,
                    "cgst_amount": cgst1,
                    "sgst_amount": sgst1,
                    "igst_amount": 0.0,
                    "total_amount": total1
                }],
                "subtotal": taxable1,
                "discount_amount": 0.0,
                "cgst_total": cgst1,
                "sgst_total": sgst1,
                "igst_total": 0.0,
                "total_tax": tax1,
                "final_payable": total1,
                "paid_amount": total1,
                "balance_due": 0.0,
                "payment_status": "PAID",
                "payment_method": "UPI",
                "created_by": item["owner"],
                "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
            })

            p2_info = item["products"][1]
            qty2 = 1
            rate2 = float(p2_info["selling_price"])
            trate2 = float(p2_info.get("tax_rate", 5))
            taxable2 = round(qty2 * rate2, 2)
            tax2 = round(taxable2 * (trate2 / 100.0), 2)
            cgst2 = round(tax2 / 2.0, 2)
            sgst2 = round(tax2 / 2.0, 2)
            total2 = round(taxable2 + tax2, 2)

            db.invoices.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": t_id,
                "invoice_number": f"{item.get('prefix', 'INV')}-{datetime.now(timezone.utc).year}-0002",
                "invoice_type": "REGULAR",
                "branch_id": "HQ",
                "business_category": item["category"],
                "customer_id": None,
                "customer_name": "Walk-in Retail Buyer",
                "customer_phone": "9811223344",
                "customer_gstin": "",
                "customer_address": "Local Counter Sale",
                "seller_name": item["name"],
                "seller_gstin": item.get("gstin", ""),
                "seller_address": item.get("address", ""),
                "seller_city": item.get("city", ""),
                "seller_state": item.get("state", "Delhi"),
                "items": [{
                    "product_id": str(uuid.uuid4()),
                    "name": p2_info["name"],
                    "sku": p2_info.get("sku", ""),
                    "quantity": qty2,
                    "unit": p2_info.get("unit", "Pcs"),
                    "selling_price": rate2,
                    "tax_rate": trate2,
                    "taxable_amount": taxable2,
                    "cgst_amount": cgst2,
                    "sgst_amount": sgst2,
                    "igst_amount": 0.0,
                    "total_amount": total2
                }],
                "subtotal": taxable2,
                "discount_amount": 0.0,
                "cgst_total": cgst2,
                "sgst_total": sgst2,
                "igst_total": 0.0,
                "total_tax": tax2,
                "final_payable": total2,
                "paid_amount": total2,
                "balance_due": 0.0,
                "payment_status": "PAID",
                "payment_method": "CASH",
                "created_by": item["owner"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        print(f"Seeded vertical: {item['name']} ({email} / Demo@12345)")

    # 3. Seed Platform Global Settings
    if not db.platform_settings.find_one({"id": "global_config"}):
        db.platform_settings.insert_one({
            "id": "global_config",
            "platform_name": "LAX360 Universal Billing SaaS",
            "company_name": "LAX360 Cloud Technologies Pvt Ltd",
            "support_email": "support@lax360.com",
            "support_phone": "+91 (011) 4560-3600",
            "website_url": "https://lax360.com",
            "default_trial_days": 14,
            "maintenance_mode": False,
            "default_currency": "INR",
            "payment_gateway_mode": "sandbox",
            "allow_self_registration": True,
            "default_tax_rate": 18.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        print("Seeded default platform settings")

    # 4. Seed Platform Announcements
    if db.announcements.count_documents({}) == 0:
        db.announcements.insert_one({
            "id": str(uuid.uuid4()),
            "title": "Welcome to LAX360 Cloud v2.4 SaaS Platform",
            "message": "Complete multi-tenant business billing, automated GST invoicing, fast barcode POS, and real-time vertical specialized modules are live across all business categories.",
            "type": "success",
            "target_category": "all",
            "is_active": True,
            "created_by": "Platform Super Administrator",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
        })
        db.announcements.insert_one({
            "id": str(uuid.uuid4()),
            "title": "Scheduled Cloud Infrastructure Maintenance",
            "message": "Routine database maintenance and security upgrades are scheduled for Sunday at 02:00 AM IST. Estimated downtime: 10 minutes.",
            "type": "info",
            "target_category": "all",
            "is_active": True,
            "created_by": "Platform Super Administrator",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
        })
        print("Seeded platform announcements")

    # 5. Seed Initial Audit Logs
    if db.audit_logs.count_documents({}) == 0:
        now_iso = datetime.now(timezone.utc).isoformat()
        db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": now_iso,
            "actor_id": "system",
            "actor_name": "LAX360 Super Administrator",
            "actor_email": "admin@lax360.com",
            "action": "PLATFORM_INITIALIZED",
            "target_type": "SYSTEM",
            "target_id": "lax360_core",
            "details": {"status": "active", "environment": "Production-Cloud", "version": "v2.4"}
        })
        db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": now_iso,
            "actor_id": "system",
            "actor_name": "LAX360 Super Administrator",
            "actor_email": "admin@lax360.com",
            "action": "DEMO_VERTICAL_TENANTS_PROVISIONED",
            "target_type": "TENANT",
            "target_id": "all_6_verticals",
            "details": {"count": len(demo_tenants_data)}
        })

    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
