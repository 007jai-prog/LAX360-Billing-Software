from typing import Dict, Any, List

BUSINESS_CATEGORIES = [
    {
        "id": "grocery",
        "name": "Grocery & Supermarket",
        "tagline": "Rapid barcode checkout, unit conversions, shelf-life and expiry batch tracking",
        "icon": "ShoppingCart",
        "color": "emerald",
        "description": "High-speed retail POS designed for groceries, provision stores, and supermarkets with weight scale integration and fast barcode scanning."
    },
    {
        "id": "restaurant",
        "name": "Restaurant & Cafe",
        "tagline": "Dine-in table layout, Kitchen Order Tickets (KOT), KDS screen, split bills & recipes",
        "icon": "UtensilsCrossed",
        "color": "amber",
        "description": "Comprehensive dining operations covering table visual grids, KOT printer dispatch, real-time Kitchen Display, and takeaway order workflows."
    },
    {
        "id": "pharmacy",
        "name": "Pharmacy & Medical Store",
        "tagline": "Batch number, expiry warnings, generic composition, doctor prescriptions & Schedule H",
        "icon": "Pill",
        "color": "blue",
        "description": "Regulatory-compliant medical billing tracking batch numbers, manufacturing dates, expiry dates, salt compositions, and prescription logs."
    },
    {
        "id": "textile",
        "name": "Textile & Garments",
        "tagline": "Size & color variant matrix, exchanges & seasonal lines",
        "icon": "Shirt",
        "color": "rose",
        "description": "Fashion retail solution managing size/color grids (S, M, L, XL), exchange management, and vendor returns."
    },
    {
        "id": "wholesale",
        "name": "Wholesale & Distribution",
        "tagline": "Bulk tiered pricing, dealer credit limits, multi-warehouse stock, and dispatch tracking",
        "icon": "Truck",
        "color": "indigo",
        "description": "B2B distribution system supporting customer tiers (Distributor, Dealer, Retailer), Minimum Order Quantities (MOQ), and credit ledger control."
    },
    {
        "id": "electronics",
        "name": "Electronics & Mobile Shop",
        "tagline": "Dual IMEI/Serial number lookup, warranty certificates, EMI tracking & repair tickets",
        "icon": "Smartphone",
        "color": "purple",
        "description": "Specialized consumer electronics management with IMEI/Serial tracking, brand warranty records, repair service tracking, and accessories billing."
    }
]

CATEGORY_CONFIGURATIONS: Dict[str, Dict[str, Any]] = {
    "grocery": {
        "category_id": "grocery",
        "category_name": "Grocery & Supermarket",
        "theme_accent": "emerald",
        "features": {
            "barcode_scanning": True,
            "weight_measurement": True,
            "expiry_tracking": True,
            "batch_management": True,
            "wholesale_retail_toggle": True,
            "sales_returns": True,
            "table_management": False,
            "kot_system": False,
            "imei_tracking": False,
            "size_color_variants": False,
            "tiered_pricing": False,
            "repair_services": False
        },
        "pos_layout": "rapid_scan", # barcode focused, quick numpad, fast weight units
        "product_fields": [
            {"key": "barcode", "label": "Barcode / EAN", "type": "text", "required": True},
            {"key": "unit", "label": "Unit (Kg, Gm, Pcs, Ltr, Pack)", "type": "select", "options": ["Kg", "Gm", "Pcs", "Ltr", "Pack", "Dozen"], "default": "Kg"},
            {"key": "batch_number", "label": "Batch No", "type": "text", "required": False},
            {"key": "expiry_date", "label": "Expiry Date", "type": "date", "required": False},
            {"key": "wholesale_price", "label": "Wholesale Price (₹)", "type": "number", "required": False}
        ],
        "sidebar_navigation": [
            {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"},
            {"name": "Grocery POS", "path": "/pos", "icon": "ScanBarcode", "badge": "Fast"},
            {"name": "Products & Items", "path": "/products", "icon": "Package"},
            {"name": "Expiry & Batches", "path": "/specialized/grocery-batches", "icon": "CalendarClock"},
            {"name": "Invoices", "path": "/invoices", "icon": "FileText"},
            {"name": "Inventory & Stock", "path": "/inventory", "icon": "Boxes"},
            {"name": "Purchases", "path": "/purchases", "icon": "Truck"},
            {"name": "Suppliers", "path": "/suppliers", "icon": "Building2"},
            {"name": "Expenses", "path": "/expenses", "icon": "Receipt"},
            {"name": "GST Reports", "path": "/reports", "icon": "BarChart3"},
            {"name": "Employees", "path": "/employees", "icon": "UserCog"},
            {"name": "Settings", "path": "/settings", "icon": "Settings"}
        ],
        "dashboard_widgets": [
            "kpi_sales", "kpi_invoices", "kpi_low_stock", "kpi_expiring_soon",
            "revenue_chart", "fast_moving_items", "recent_invoices"
        ]
    },
    "restaurant": {
        "category_id": "restaurant",
        "category_name": "Restaurant & Cafe",
        "theme_accent": "amber",
        "features": {
            "barcode_scanning": False,
            "weight_measurement": False,
            "expiry_tracking": False,
            "batch_management": False,
            "wholesale_retail_toggle": False,
            "sales_returns": False,
            "table_management": True,
            "kot_system": True,
            "kitchen_display": True,
            "order_status_tracking": True,
            "split_billing": True,
            "food_variants_addons": True,
            "table_transfer": True,
            "imei_tracking": False,
            "size_color_variants": False,
            "tiered_pricing": False,
            "repair_services": False
        },
        "pos_layout": "table_restaurant", # table grid, dine-in/takeaway/delivery, KOT buttons
        "product_fields": [
            {"key": "food_category", "label": "Food Category", "type": "select", "options": ["Starters", "Main Course", "Beverages", "Desserts", "Breads", "Combos"], "default": "Main Course"},
            {"key": "food_type", "label": "Diet Type", "type": "select", "options": ["Veg", "Non-Veg", "Vegan", "Egg"], "default": "Veg"},
            {"key": "preparation_time", "label": "Prep Time (mins)", "type": "number", "default": 15},
            {"key": "is_available", "label": "Kitchen Available", "type": "boolean", "default": True}
        ],
        "sidebar_navigation": [
            {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"},
            {"name": "Restaurant POS", "path": "/pos", "icon": "Utensils", "badge": "Tables"},
            {"name": "Table Management", "path": "/specialized/tables", "icon": "LayoutGrid"},
            {"name": "Kitchen Display", "path": "/specialized/kitchen", "icon": "ChefHat", "badge": "Live", "search": "?view=active", "state": {"view": "active"}},
            {"name": "KOT History", "path": "/specialized/kitchen", "icon": "ClipboardList", "search": "?view=history", "state": {"view": "history"}},
            {"name": "Menu & Add-ons", "path": "/products", "icon": "BookOpen"},
            {"name": "Invoices & Bills", "path": "/invoices", "icon": "FileText"},
            {"name": "Ingredient Stock", "path": "/inventory", "icon": "Boxes"},
            {"name": "Purchases", "path": "/purchases", "icon": "Truck"},
            {"name": "Expenses", "path": "/expenses", "icon": "Receipt"},
            {"name": "Restaurant Reports", "path": "/reports", "icon": "BarChart3"},
            {"name": "Staff", "path": "/employees", "icon": "UserCog"},
            {"name": "Settings", "path": "/settings", "icon": "Settings"}
        ],
        "dashboard_widgets": [
            "kpi_sales", "kpi_occupied_tables", "kpi_active_kots", "kpi_avg_ticket",
            "revenue_chart", "top_selling_dishes", "table_live_status"
        ]
    },
    "pharmacy": {
        "category_id": "pharmacy",
        "category_name": "Pharmacy & Medical Store",
        "theme_accent": "blue",
        "features": {
            "barcode_scanning": True,
            "weight_measurement": False,
            "expiry_tracking": True,
            "batch_management": True,
            "wholesale_retail_toggle": False,
            "sales_returns": True,
            "table_management": False,
            "kot_system": False,
            "prescription_records": True,
            "generic_composition": True,
            "schedule_h_warning": True,
            "imei_tracking": False,
            "size_color_variants": False,
            "tiered_pricing": False,
            "repair_services": False
        },
        "pos_layout": "pharmacy_rx", # batch selection, doctor name, patient name, expiry warning
        "product_fields": [
            {"key": "batch_number", "label": "Batch Number", "type": "text", "required": True},
            {"key": "expiry_date", "label": "Expiry Date (MM/YY)", "type": "text", "required": True},
            {"key": "manufacturer", "label": "Manufacturer / Pharma Co.", "type": "text", "required": True},
            {"key": "composition", "label": "Salt / Generic Composition", "type": "text", "required": True},
            {"key": "packaging", "label": "Packaging (e.g. 10 Tabs/Strip)", "type": "text", "default": "10 Tabs"},
            {"key": "is_schedule_h", "label": "Schedule H / Rx Required", "type": "boolean", "default": False}
        ],
        "sidebar_navigation": [
            {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"},
            {"name": "Pharmacy POS", "path": "/pos", "icon": "Stethoscope", "badge": "Rx"},
            {"name": "Medicines Catalog", "path": "/products", "icon": "Pill"},
            {"name": "Prescriptions Log", "path": "/specialized/prescriptions", "icon": "FileCheck2"},
            {"name": "Batch & Expiry Mgmt", "path": "/specialized/pharmacy-expiry", "icon": "AlertTriangle", "badge": "Alerts"},
            {"name": "Invoices", "path": "/invoices", "icon": "FileText"},
            {"name": "Medicine Inventory", "path": "/inventory", "icon": "Boxes"},
            {"name": "Purchases", "path": "/purchases", "icon": "Truck"},
            {"name": "Pharma Suppliers", "path": "/suppliers", "icon": "Building2"},
            {"name": "Expenses", "path": "/expenses", "icon": "Receipt"},
            {"name": "GST Reports", "path": "/reports", "icon": "BarChart3"},
            {"name": "Staff", "path": "/employees", "icon": "UserCog"},
            {"name": "Settings", "path": "/settings", "icon": "Settings"}
        ],
        "dashboard_widgets": [
            "kpi_sales", "kpi_invoices", "kpi_expired_drugs", "kpi_rx_dispensed",
            "revenue_chart", "near_expiry_warning_list", "recent_invoices"
        ]
    },
    "textile": {
        "category_id": "textile",
        "category_name": "Textile & Garments",
        "theme_accent": "rose",
        "features": {
            "barcode_scanning": True,
            "weight_measurement": False,
            "expiry_tracking": False,
            "batch_management": False,
            "wholesale_retail_toggle": False,
            "sales_returns": True,
            "size_color_variants": True,
            "garment_exchange": True,
            "table_management": False,
            "kot_system": False,
            "imei_tracking": False,
            "tiered_pricing": False,
            "repair_services": False
        },
        "pos_layout": "apparel_matrix", # variant selector: Size (S, M, L, XL), Color
        "product_fields": [
            {"key": "brand", "label": "Brand Name", "type": "text", "required": True},
            {"key": "sizes", "label": "Available Sizes (S, M, L, XL, XXL)", "type": "text", "default": "S, M, L, XL"},
            {"key": "colors", "label": "Available Colors", "type": "text", "default": "Blue, Black, White"},
            {"key": "fabric", "label": "Fabric Material (Cotton, Denim, Silk)", "type": "text", "default": "Cotton"},
            {"key": "gender", "label": "Gender Category", "type": "select", "options": ["Men", "Women", "Kids", "Unisex"], "default": "Men"}
        ],
        "sidebar_navigation": [
            {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"},
            {"name": "Garments POS", "path": "/pos", "icon": "Shirt", "badge": "Variants"},
            {"name": "Apparel Catalog", "path": "/products", "icon": "Tag"},
            {"name": "Exchanges & Returns", "path": "/specialized/exchanges", "icon": "RefreshCw"},
            {"name": "Invoices", "path": "/invoices", "icon": "FileText"},
            {"name": "Variant Inventory", "path": "/inventory", "icon": "Boxes"},
            {"name": "Purchases", "path": "/purchases", "icon": "Truck"},
            {"name": "Suppliers", "path": "/suppliers", "icon": "Building2"},
            {"name": "Expenses", "path": "/expenses", "icon": "Receipt"},
            {"name": "Sales & Tax Reports", "path": "/reports", "icon": "BarChart3"},
            {"name": "Staff", "path": "/employees", "icon": "UserCog"},
            {"name": "Settings", "path": "/settings", "icon": "Settings"}
        ],
        "dashboard_widgets": [
            "kpi_sales", "kpi_invoices", "kpi_items_sold", "kpi_exchanges",
            "revenue_chart", "size_wise_breakdown", "top_selling_styles"
        ]
    },
    "wholesale": {
        "category_id": "wholesale",
        "category_name": "Wholesale & Distribution",
        "theme_accent": "indigo",
        "features": {
            "barcode_scanning": True,
            "weight_measurement": True,
            "expiry_tracking": False,
            "batch_management": True,
            "wholesale_retail_toggle": True,
            "sales_returns": True,
            "tiered_pricing": True,
            "moq_enforcement": True,
            "credit_limits": True,
            "warehouse_management": True,
            "delivery_tracking": True,
            "salesperson_management": True,
            "table_management": False,
            "kot_system": False,
            "imei_tracking": False,
            "repair_services": False
        },
        "pos_layout": "wholesale_bulk", # MOQ, pricing tier selector, credit balance check, warehouse selector
        "product_fields": [
            {"key": "moq", "label": "Minimum Order Quantity (MOQ)", "type": "number", "default": 10},
            {"key": "distributor_price", "label": "Distributor Price (₹)", "type": "number", "required": True},
            {"key": "dealer_price", "label": "Dealer Price (₹)", "type": "number", "required": True},
            {"key": "retailer_price", "label": "Retailer Price (₹)", "type": "number", "required": True},
            {"key": "warehouse_location", "label": "Primary Warehouse", "type": "text", "default": "Main Warehouse"}
        ],
        "sidebar_navigation": [
            {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"},
            {"name": "B2B Bulk Billing", "path": "/pos", "icon": "Coins", "badge": "B2B"},
            {"name": "Wholesale Catalog", "path": "/products", "icon": "Package2"},
            {"name": "Warehouses & Transfers", "path": "/specialized/warehouses", "icon": "Warehouse"},
            {"name": "Invoices", "path": "/invoices", "icon": "FileText"},
            {"name": "Bulk Inventory", "path": "/inventory", "icon": "Boxes"},
            {"name": "Purchase Orders", "path": "/purchases", "icon": "Truck"},
            {"name": "Suppliers", "path": "/suppliers", "icon": "Building2"},
            {"name": "Expenses", "path": "/expenses", "icon": "Receipt"},
            {"name": "Credit & Tax Reports", "path": "/reports", "icon": "BarChart3"},
            {"name": "Sales Reps", "path": "/employees", "icon": "Briefcase"},
            {"name": "Settings", "path": "/settings", "icon": "Settings"}
        ],
        "dashboard_widgets": [
            "kpi_sales", "kpi_outstanding_receivables", "kpi_dealers_active", "kpi_pending_dispatch",
            "revenue_chart", "dealer_outstanding_table", "warehouse_stock_summary"
        ]
    },
    "electronics": {
        "category_id": "electronics",
        "category_name": "Electronics & Mobile Shop",
        "theme_accent": "purple",
        "features": {
            "barcode_scanning": True,
            "weight_measurement": False,
            "expiry_tracking": False,
            "batch_management": False,
            "wholesale_retail_toggle": False,
            "sales_returns": True,
            "imei_tracking": True,
            "serial_number_tracking": True,
            "warranty_management": True,
            "repair_services": True,
            "emi_records": True,
            "table_management": False,
            "kot_system": False,
            "size_color_variants": False,
            "tiered_pricing": False
        },
        "pos_layout": "serialized_electronics", # Serial/IMEI input per quantity, warranty slip, brand model
        "product_fields": [
            {"key": "brand", "label": "Brand (Apple, Samsung, etc.)", "type": "text", "required": True},
            {"key": "model_number", "label": "Model / Specification", "type": "text", "required": True},
            {"key": "warranty_months", "label": "Warranty Period (Months)", "type": "number", "default": 12},
            {"key": "has_imei", "label": "Requires IMEI Tracking", "type": "boolean", "default": True},
            {"key": "imei_numbers", "label": "IMEI / Serial Numbers (comma-separated)", "type": "text", "required": False}
        ],
        "sidebar_navigation": [
            {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"},
            {"name": "Electronics POS", "path": "/pos", "icon": "Cpu", "badge": "IMEI"},
            {"name": "Devices & Models", "path": "/products", "icon": "Smartphone"},
            {"name": "IMEI & Warranty Lookup", "path": "/specialized/imei-lookup", "icon": "ShieldCheck"},
            {"name": "Repair & Service Jobs", "path": "/specialized/repairs", "icon": "Wrench", "badge": "Service"},
            {"name": "Invoices", "path": "/invoices", "icon": "FileText"},
            {"name": "Serialized Inventory", "path": "/inventory", "icon": "Boxes"},
            {"name": "Purchases", "path": "/purchases", "icon": "Truck"},
            {"name": "Suppliers", "path": "/suppliers", "icon": "Building2"},
            {"name": "Expenses", "path": "/expenses", "icon": "Receipt"},
            {"name": "GST & Warranty Reports", "path": "/reports", "icon": "BarChart3"},
            {"name": "Technicians & Staff", "path": "/employees", "icon": "UserCog"},
            {"name": "Settings", "path": "/settings", "icon": "Settings"}
        ],
        "dashboard_widgets": [
            "kpi_sales", "kpi_devices_sold", "kpi_active_repairs", "kpi_warranties_active",
            "revenue_chart", "recent_imei_activations", "recent_invoices"
        ]
    }
}

def get_all_categories() -> List[Dict[str, Any]]:
    return BUSINESS_CATEGORIES

def get_category_config(category_id: str) -> Dict[str, Any]:
    norm_id = category_id.lower().strip() if category_id else "grocery"
    return CATEGORY_CONFIGURATIONS.get(norm_id, CATEGORY_CONFIGURATIONS["grocery"])
