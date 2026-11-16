from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- AUTH & USER -----------------
class UserRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    business_name: str
    business_category: str # grocery, restaurant, pharmacy, textile, wholesale, electronics
    phone: Optional[str] = ""

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    tenant: Optional[Dict[str, Any]] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# ----------------- TENANT & ONBOARDING -----------------
class TenantSetupRequest(BaseModel):
    business_name: str
    business_category: str
    owner_name: str
    email: EmailStr
    phone: str
    gstin: Optional[str] = ""
    address: str
    city: str
    state: str
    pincode: str
    currency: str = "INR"
    financial_year: str = "2025-2026"
    invoice_prefix: str = "INV"
    default_tax_rate: float = 18.0
    is_tax_inclusive: bool = False
    branches: Optional[List[Dict[str, Any]]] = None

class BranchCreateRequest(BaseModel):
    name: str
    code: str
    address: str
    phone: Optional[str] = ""
    gstin: Optional[str] = ""
    is_main: bool = False

# ----------------- PRODUCTS -----------------
class ProductCreateRequest(BaseModel):
    name: str
    sku: str
    barcode: Optional[str] = ""
    category: str = "General"
    description: Optional[str] = ""
    unit: str = "Pcs"
    purchase_price: float = 0.0
    selling_price: float
    tax_rate: float = 18.0
    is_tax_inclusive: bool = False
    hsn_sac: Optional[str] = "9983"
    stock: float = 0.0
    low_stock_threshold: float = 5.0
    image_url: Optional[str] = ""
    # Dynamic business category specific custom fields
    custom_fields: Optional[Dict[str, Any]] = {}
    variants: Optional[List[Dict[str, Any]]] = []

class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    tax_rate: Optional[float] = None
    is_tax_inclusive: Optional[bool] = None
    hsn_sac: Optional[str] = None
    stock: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    image_url: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    variants: Optional[List[Dict[str, Any]]] = None

# ----------------- BILLING & INVOICES -----------------
class InvoiceItemInput(BaseModel):
    product_id: Optional[str] = None
    name: str
    sku: Optional[str] = ""
    barcode: Optional[str] = ""
    hsn_sac: Optional[str] = "9983"
    quantity: float = 1.0
    unit: str = "Pcs"
    unit_price: float
    discount: float = 0.0
    tax_rate: float = 18.0
    is_tax_inclusive: bool = False
    custom_fields: Optional[Dict[str, Any]] = {}

class PaymentInput(BaseModel):
    method: str = "CASH" # CASH, UPI, CARD, BANK_TRANSFER, CHEQUE, ONLINE
    amount: float
    reference: Optional[str] = ""

class InvoiceCreateRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = "Walk-in Customer"
    customer_phone: Optional[str] = ""
    customer_email: Optional[str] = ""
    customer_gstin: Optional[str] = ""
    customer_address: Optional[str] = ""
    customer_state: Optional[str] = ""
    branch_id: Optional[str] = "HQ"
    invoice_type: str = "REGULAR"
    items: List[InvoiceItemInput]
    discount_percentage: float = 0.0
    flat_discount: float = 0.0
    shipping_charges: float = 0.0
    payments: Optional[List[PaymentInput]] = []
    paid_amount: Optional[float] = None
    payment_method: Optional[str] = "CASH"
    notes: Optional[str] = "Thank you for your business!"
    terms: Optional[str] = "Goods once sold are non-returnable after 7 days."
    metadata: Optional[Dict[str, Any]] = {}

# ----------------- SUPPLIER -----------------
class SupplierCreateRequest(BaseModel):
    name: str
    contact_person: Optional[str] = ""
    phone: str
    email: Optional[str] = ""
    gstin: Optional[str] = ""
    address: Optional[str] = ""
    state: Optional[str] = ""
    city: Optional[str] = ""

# ----------------- INVENTORY & PURCHASES -----------------
class StockAdjustmentRequest(BaseModel):
    product_id: str
    adjustment_type: str # ADD, REDUCE, AUDIT_CORRECTION, DAMAGE, EXPIRY
    quantity: float
    reason: str
    branch_id: Optional[str] = "HQ"

class PurchaseItemInput(BaseModel):
    product_id: Optional[str] = None
    name: str
    quantity: float
    unit_cost: float
    tax_rate: float = 18.0
    batch_number: Optional[str] = ""
    expiry_date: Optional[str] = ""

class PurchaseCreateRequest(BaseModel):
    supplier_id: str
    supplier_invoice_no: str
    purchase_date: Optional[str] = None
    items: List[PurchaseItemInput]
    paid_amount: float = 0.0
    payment_method: str = "BANK_TRANSFER"
    notes: Optional[str] = ""

# ----------------- EXPENSES -----------------
class ExpenseCreateRequest(BaseModel):
    category: str # Rent, Utilities, Salaries, Marketing, Maintenance, Office Supplies, Logistics, Miscellaneous
    amount: float
    payment_method: str = "CASH"
    date: Optional[str] = None
    description: Optional[str] = ""
    reference: Optional[str] = ""

# ----------------- RESTAURANT MODULE -----------------
class RestaurantTableCreateRequest(BaseModel):
    table_number: str
    floor: str = "Ground Floor"
    capacity: int = 4

class KOTCreateRequest(BaseModel):
    table_number: str
    order_type: str = "DINE_IN" # DINE_IN, TAKEAWAY, DELIVERY
    items: List[Dict[str, Any]]
    waiter_name: Optional[str] = "Captain"
    notes: Optional[str] = ""

# ----------------- EMPLOYEES & RBAC -----------------
class EmployeeCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""
    role: str # business_admin, branch_manager, accountant, billing_operator, inventory_manager, employee
    branch_id: Optional[str] = "HQ"

# ----------------- SAAS PLATFORM ADMIN -----------------
class AdminTenantCreateRequest(BaseModel):
    name: str
    business_category: str
    owner_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""
    gstin: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = "New Delhi"
    state: Optional[str] = "Delhi"
    pincode: Optional[str] = "110001"
    plan: Optional[str] = "professional"
    invoice_prefix: Optional[str] = "INV"

class AdminTenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    invoice_prefix: Optional[str] = None
    default_tax_rate: Optional[float] = None
    business_category: Optional[str] = None

class AdminTenantStatusRequest(BaseModel):
    status: str # active, suspended, pending_verification, archived
    reason: Optional[str] = ""

class AdminSubscriptionOverrideRequest(BaseModel):
    plan: str
    billing_cycle: Optional[str] = "monthly"
    status: Optional[str] = "ACTIVE"
    extension_days: Optional[int] = 30
    expires_at: Optional[str] = None
    notes: Optional[str] = ""

class AdminUserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "business_owner" # saas_super_admin, business_owner, business_admin, cashier, inventory_manager, employee
    phone: Optional[str] = ""
    tenant_id: Optional[str] = None

class AdminUserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    tenant_id: Optional[str] = None
    is_active: Optional[bool] = None

class AdminUserStatusRequest(BaseModel):
    is_active: bool

class AdminPasswordResetRequest(BaseModel):
    new_password: str

class AdminAnnouncementCreateRequest(BaseModel):
    title: str
    message: str
    type: Optional[str] = "info" # info, warning, critical, success
    target_category: Optional[str] = "all"
    expires_at: Optional[str] = None

class AdminPlatformSettingsUpdateRequest(BaseModel):
    platform_name: Optional[str] = None
    company_name: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    website_url: Optional[str] = None
    default_trial_days: Optional[int] = None
    maintenance_mode: Optional[bool] = None
    default_currency: Optional[str] = None
    payment_gateway_mode: Optional[str] = None
    allow_self_registration: Optional[bool] = None
    default_tax_rate: Optional[float] = None
    default_theme_mode: Optional[str] = None
    default_accent_color: Optional[str] = None
    default_font_scaling: Optional[str] = None
    default_radius: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None

