import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed.seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def init_db():
    seed_database()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_business_categories(client):
    res = client.get("/api/business-categories")
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) == 6
    ids = [c["id"] for c in categories]
    assert "grocery" in ids
    assert "restaurant" in ids
    assert "pharmacy" in ids
    assert "textile" in ids
    assert "wholesale" in ids
    assert "electronics" in ids

def test_category_configurations(client):
    for cat in ["grocery", "restaurant", "pharmacy", "textile", "wholesale", "electronics"]:
        res = client.get(f"/api/business-categories/{cat}/config")
        assert res.status_code == 200
        cfg = res.json()
        assert cfg["category_id"] == cat
        assert len(cfg["sidebar_navigation"]) > 0
        assert len(cfg["product_fields"]) > 0

def test_customers_module_removed(client):
    for category in ["grocery", "restaurant", "pharmacy", "textile", "wholesale", "electronics"]:
        response = client.get(f"/api/business-categories/{category}/config")
        assert response.status_code == 200
        assert all(
            item["path"] != "/customers"
            for item in response.json()["sidebar_navigation"]
        )

    assert client.get("/api/customers").status_code == 404

def test_textile_barcode_tag_generator_removed(client):
    config_res = client.get("/api/business-categories/textile/config")
    assert config_res.status_code == 200
    config = config_res.json()
    assert "barcode_tag_generation" not in config["features"]
    assert all(
        item["name"] != "Barcode Tag Generator"
        for item in config["sidebar_navigation"]
    )

    tags_res = client.get("/api/specialized/textile/tags/removed")
    assert tags_res.status_code == 404

def test_login_demo_user(client):
    res = client.post("/api/auth/login", json={
        "email": "demo.grocery@lax360.com",
        "password": "Demo@12345"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo.grocery@lax360.com"
    assert data["tenant"]["business_category"] == "grocery"

def test_registration_and_wizard(client):
    import uuid
    uniq = str(uuid.uuid4())[:8]
    reg_res = client.post("/api/auth/register", json={
        "full_name": f"Tester {uniq}",
        "email": f"tester_{uniq}@lax360.com",
        "password": "Password@123",
        "business_name": f"Test Business {uniq}",
        "business_category": "restaurant",
        "phone": "9998887776"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup wizard
    wizard_res = client.post("/api/tenants/setup-wizard", headers=headers, json={
        "business_name": f"Test Cafe {uniq}",
        "business_category": "restaurant",
        "owner_name": f"Owner {uniq}",
        "email": f"tester_{uniq}@lax360.com",
        "phone": "9998887776",
        "gstin": "07AAAAA1111A1Z1",
        "address": "Connaught Place",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "currency": "INR",
        "financial_year": "2025-2026",
        "invoice_prefix": "TCF",
        "default_tax_rate": 5.0,
        "is_tax_inclusive": False
    })
    assert wizard_res.status_code == 200
    assert wizard_res.json()["tenant"]["is_setup_completed"] is True

def test_billing_checkout_and_pdf(client):
    # Login as grocery demo user
    login_res = client.post("/api/auth/login", json={
        "email": "demo.grocery@lax360.com",
        "password": "Demo@12345"
    })
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch products
    prods_res = client.get("/api/products", headers=headers)
    assert prods_res.status_code == 200
    prods = prods_res.json()["items"]
    assert len(prods) > 0

    p1 = prods[0]
    checkout_payload = {
        "customer_name": "Rajesh Khanna",
        "customer_phone": "9812345678",
        "customer_state": "Delhi", # Intra-state: CGST + SGST
        "items": [
            {
                "product_id": p1["id"],
                "name": p1["name"],
                "sku": p1["sku"],
                "hsn_sac": p1.get("hsn_sac", "1101"),
                "quantity": 2,
                "unit": p1.get("unit", "Pack"),
                "unit_price": float(p1["selling_price"]),
                "discount": 10.0,
                "tax_rate": float(p1["tax_rate"]),
                "is_tax_inclusive": False
            }
        ],
        "payments": [
            {"method": "UPI", "amount": 100.0, "reference": "UPI99214"},
            {"method": "CASH", "amount": 450.0}
        ]
    }

    checkout_res = client.post("/api/billing/checkout", headers=headers, json=checkout_payload)
    assert checkout_res.status_code == 200
    inv = checkout_res.json()
    assert inv["invoice_number"].startswith("GRO-")
    assert inv["total_taxable"] > 0
    assert inv["cgst_amount"] > 0
    assert inv["sgst_amount"] > 0
    assert inv["igst_amount"] == 0.0 # Intra-state
    assert "Rupees" in inv["amount_in_words"]
    inv_id = inv["id"]

    # Test PDF generation
    pdf_res = client.get(f"/api/invoices/{inv_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000 # Valid binary PDF

def test_reports_and_dashboard(client):
    login_res = client.post("/api/auth/login", json={
        "email": "demo.grocery@lax360.com",
        "password": "Demo@12345"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    dash_res = client.get("/api/dashboard/metrics", headers=headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert "summary" in dash
    assert "sales_trend" in dash
    assert dash["business_category"] == "grocery"

    # GST report
    gstr1_res = client.get("/api/reports/gst-gstr1", headers=headers)
    assert gstr1_res.status_code == 200
    assert "summary" in gstr1_res.json()

    # Subscriptions
    plans_res = client.get("/api/subscriptions/plans")
    assert plans_res.status_code == 200
    assert len(plans_res.json()) == 5

def test_superadmin_admin_panel(client):
    # 1. Non-admin should be rejected (403 Forbidden)
    store_login = client.post("/api/auth/login", json={
        "email": "demo.grocery@lax360.com",
        "password": "Demo@12345"
    })
    assert store_login.status_code == 200
    store_token = store_login.json()["access_token"]
    forbidden_res = client.get("/api/admin/overview", headers={"Authorization": f"Bearer {store_token}"})
    assert forbidden_res.status_code == 403

    # 2. Superadmin login
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@lax360.com",
        "password": "Admin@12345"
    })
    assert admin_login.status_code == 200, admin_login.text
    admin_data = admin_login.json()
    assert admin_data["user"]["role"] == "saas_super_admin"
    admin_headers = {"Authorization": f"Bearer {admin_data['access_token']}"}

    # 3. Overview metrics
    overview_res = client.get("/api/admin/overview", headers=admin_headers)
    assert overview_res.status_code == 200
    ov = overview_res.json()
    assert ov["total_tenants"] >= 6
    assert ov["total_users"] >= 7
    assert "category_distribution" in ov
    assert "subscription_distribution" in ov
    assert ov["mrr_estimate"] > 0
    assert ov["system_health"]["database_status"] == "connected"

    # 4. Tenants management (List, Create, Update, Status, Subscription Override)
    tenants_res = client.get("/api/admin/tenants", headers=admin_headers)
    assert tenants_res.status_code == 200
    tenants = tenants_res.json()
    assert len(tenants) >= 6

    # Create new business from admin
    import uuid
    uniq = str(uuid.uuid4())[:6]
    create_tenant_res = client.post("/api/admin/tenants", headers=admin_headers, json={
        "name": f"Admin Onboarded Store {uniq}",
        "business_category": "textile",
        "owner_name": f"Priya Silk {uniq}",
        "email": f"priya_{uniq}@lax360test.com",
        "password": "Password@123",
        "phone": "9812345678",
        "gstin": "07AABCT1234A1Z5",
        "address": "Ring Road Commercial Complex",
        "city": "Surat",
        "state": "Gujarat",
        "pincode": "395002",
        "plan": "enterprise",
        "invoice_prefix": "PRI"
    })
    assert create_tenant_res.status_code == 200, create_tenant_res.text
    new_tenant = create_tenant_res.json()["tenant"]
    new_t_id = new_tenant["id"]

    # Get details
    detail_res = client.get(f"/api/admin/tenants/{new_t_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["tenant"]["name"] == f"Admin Onboarded Store {uniq}"

    # Update status
    status_res = client.put(f"/api/admin/tenants/{new_t_id}/status", headers=admin_headers, json={
        "status": "suspended",
        "reason": "Routine KYC Verification Pending"
    })
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "suspended"

    # Override subscription
    sub_res = client.put(f"/api/admin/tenants/{new_t_id}/subscription", headers=admin_headers, json={
        "plan": "enterprise",
        "billing_cycle": "yearly",
        "extension_days": 365,
        "notes": "Complementary Annual SaaS Access for Partner"
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["subscription"]["plan"] == "enterprise"

    # Reactivate tenant
    client.put(f"/api/admin/tenants/{new_t_id}/status", headers=admin_headers, json={"status": "active"})

    # Impersonate tenant
    impersonate_res = client.post(f"/api/admin/tenants/{new_t_id}/impersonate", headers=admin_headers)
    assert impersonate_res.status_code == 200
    assert "access_token" in impersonate_res.json()
    assert impersonate_res.json()["tenant"]["id"] == new_t_id

    # 5. Users Management
    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    all_users = users_res.json()
    assert len(all_users) >= 7

    # Create new user
    new_user_res = client.post("/api/admin/users", headers=admin_headers, json={
        "full_name": f"Manager {uniq}",
        "email": f"mgr_{uniq}@lax360test.com",
        "password": "Password@123",
        "role": "business_admin",
        "tenant_id": new_t_id
    })
    assert new_user_res.status_code == 200
    new_u_id = new_user_res.json()["user"]["id"]

    # Reset password
    pw_res = client.put(f"/api/admin/users/{new_u_id}/password", headers=admin_headers, json={
        "new_password": "NewSecretPassword@999"
    })
    assert pw_res.status_code == 200

    # Toggle user status
    toggle_res = client.put(f"/api/admin/users/{new_u_id}/status", headers=admin_headers, json={
        "is_active": False
    })
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # 6. Business Categories Management
    cats_res = client.get("/api/admin/categories", headers=admin_headers)
    assert cats_res.status_code == 200
    cats = cats_res.json()
    assert len(cats) == 6
    for c in cats:
        assert "tenants_count" in c
        assert "features" in c

    # Toggle category status
    cat_toggle = client.put("/api/admin/categories/grocery/status", headers=admin_headers, json={"is_enabled": True})
    assert cat_toggle.status_code == 200

    # Update category config
    cat_cfg = client.put("/api/admin/categories/grocery/config", headers=admin_headers, json={
        "tagline": "Superfast barcode checkout and unit conversions"
    })
    assert cat_cfg.status_code == 200

    # 7. Subscriptions Plans & Ledger
    plans_admin = client.get("/api/admin/subscriptions/plans", headers=admin_headers)
    assert plans_admin.status_code == 200
    assert len(plans_admin.json()) == 5
    assert "active_subscribers" in plans_admin.json()[0]

    txns_res = client.get("/api/admin/subscriptions/transactions", headers=admin_headers)
    assert txns_res.status_code == 200
    assert len(txns_res.json()) >= 1

    # 8. Announcements
    new_ann = client.post("/api/admin/announcements", headers=admin_headers, json={
        "title": "Universal Tax Slab Update Live",
        "message": "All business verticals now support updated GST tax slabs automatically.",
        "type": "success",
        "target_category": "all"
    })
    assert new_ann.status_code == 200
    ann_id = new_ann.json()["announcement"]["id"]

    ann_list = client.get("/api/admin/announcements", headers=admin_headers)
    assert ann_list.status_code == 200
    assert any(a["id"] == ann_id for a in ann_list.json())

    # 9. Audit Logs
    audit_res = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()) > 0
    actions = [a["action"] for a in audit_res.json()]
    assert "TENANT_CREATED" in actions
    assert "USER_PASSWORD_RESET" in actions

    # 10. Platform Settings
    settings_res = client.get("/api/admin/settings", headers=admin_headers)
    assert settings_res.status_code == 200
    assert "platform_name" in settings_res.json()

    update_settings = client.put("/api/admin/settings", headers=admin_headers, json={
        "support_phone": "+91 99999 88888",
        "default_trial_days": 21
    })
    assert update_settings.status_code == 200
    assert update_settings.json()["settings"]["default_trial_days"] == 21

