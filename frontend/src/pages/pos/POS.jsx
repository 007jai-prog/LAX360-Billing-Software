import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useAuth } from '../../context/AuthContext';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import ReturnExchangePanel from './ReturnExchangePanel';
import {
  ScanBarcode,
  Search,
  Plus,
  Trash2,
  Download,
  CreditCard,
  Receipt,
  CheckCircle,
  ShoppingBag,
  Minus,
  AlertTriangle,
} from 'lucide-react';

const STOCK_REFRESH_INTERVAL_MS = 15 * 1000;

const normalizeBarcode = (value) => String(value ?? '').trim().toUpperCase();

const getProductId = (product) =>
  product?.id ?? product?._id ?? product?.product_id ?? null;

const getProductStock = (product) => {
  const stock = Number(product?.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
};

const getQuantityStep = (unit) =>
  ['kg', 'ltr'].includes(String(unit || '').toLowerCase()) ? 0.1 : 1;

const barcodeMatchesProduct = (product, code) => {
  const normalizedCode = normalizeBarcode(code);
  if (!normalizedCode || !product) return false;

  return [
    product.barcode,
    product.barcode_number,
    product.sku,
    product.custom_fields?.barcode,
    product.custom_fields?.barcode_number,
  ].some((value) => normalizeBarcode(value) === normalizedCode);
};

const getProductsFromResponse = (response) => {
  let data = response?.data;

  for (let depth = 0; depth < 3 && data && !Array.isArray(data); depth += 1) {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    data = data.data;
  }

  return Array.isArray(data) ? data : [];
};

export const POS = () => {
  const { tenant } = useAuth();
  const { config, currentCategory } = useBusinessConfig();

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [products, setProducts] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);

  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerState, setCustomerState] = useState(tenant?.state || 'Delhi');

  const [discountPercent, setDiscountPercent] = useState(0);
  const [flatDiscount, setFlatDiscount] = useState(0);

  const [restaurantTable, setRestaurantTable] = useState('T-1');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [doctorName, setDoctorName] = useState('');
  const [wholesaleTier, setWholesaleTier] = useState('RETAIL');

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [printBill, setPrintBill] = useState(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isResolvingBarcode, setIsResolvingBarcode] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');

  const [isReturnPanelOpen, setIsReturnPanelOpen] = useState(false);

  const barcodeInputRef = useRef(null);
  const videoRef = useRef(null);
  const productsRef = useRef(products);
  const billItemsRef = useRef(billItems);
  const addToBillRef = useRef(null);
  const processBarcodeRef = useRef(null);

  const scannerReaderRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerSessionRef = useRef(0);
  const scanRequestedRef = useRef(false);
  const processingScanRef = useRef(false);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    billItemsRef.current = billItems;
  }, [billItems]);

  useEffect(() => {
    let isMounted = true;
    let requestInProgress = false;

    const fetchProducts = async () => {
      if (requestInProgress) return;
      requestInProgress = true;

      try {
        const response = await api.get('/products?limit=100');
        const latestProducts = getProductsFromResponse(response);

        if (isMounted) {
          setProducts((currentProducts) => {
            const productsById = new Map();

            currentProducts.forEach((product) => {
              const id = getProductId(product);
              if (id != null) productsById.set(String(id), product);
            });

            latestProducts.forEach((product) => {
              const id = getProductId(product);
              if (id != null) {
                productsById.set(String(id), {
                  ...productsById.get(String(id)),
                  ...product,
                });
              }
            });

            return [...productsById.values()];
          });
        }
      } catch (error) {
        console.error('Failed to load POS products or refresh stock:', error);
      } finally {
        requestInProgress = false;
        if (isMounted) setProductsLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchProducts();
    };

    fetchProducts();

    const intervalId = window.setInterval(
      fetchProducts,
      STOCK_REFRESH_INTERVAL_MS
    );

    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (tenant?.state) {
      setCustomerState((current) => current || tenant.state);
    }
  }, [tenant?.state]);

  const getCurrentStock = (productId) => {
    const product = productsRef.current.find(
      (candidate) => String(getProductId(candidate)) === String(productId)
    );

    return getProductStock(product);
  };

  const getUnitPrice = (product) => {
    const fields = product.custom_fields || {};

    if (
      currentCategory === 'wholesale' &&
      wholesaleTier === 'DISTRIBUTOR' &&
      fields.distributor_price
    ) {
      return Number(fields.distributor_price);
    }

    if (
      currentCategory === 'wholesale' &&
      wholesaleTier === 'DEALER' &&
      fields.dealer_price
    ) {
      return Number(fields.dealer_price);
    }

    return Number(product.selling_price) || 0;
  };

  const addToBill = (product) => {
    const productId = getProductId(product);

    if (productId == null) {
      window.alert('This product cannot be added because it has no product ID.');
      return;
    }

    const availableStock = getProductStock(product);

    if (availableStock <= 0) {
      window.alert(`${product.name || 'This product'} is out of stock.`);
      return;
    }

    const existing = billItemsRef.current.find(
      (item) => String(item.product_id) === String(productId)
    );

    const increment = getQuantityStep(product.unit);
    const currentQuantity = Number(existing?.quantity || 0);
    const nextQuantity = Number((currentQuantity + increment).toFixed(2));

    if (nextQuantity > availableStock) {
      window.alert(
        `Only ${availableStock} ${product.unit || 'units'} of ${product.name || 'this product'} are available.`
      );
      return;
    }

    setQuantityDrafts((current) => {
      if (!(productId in current)) return current;
      const next = { ...current };
      delete next[productId];
      return next;
    });

    setBillItems((currentItems) => {
      const currentItem = currentItems.find(
        (item) => String(item.product_id) === String(productId)
      );

      if (currentItem) {
        return currentItems.map((item) =>
          String(item.product_id) === String(productId)
            ? { ...item, quantity: nextQuantity }
            : item
        );
      }

      const savedImei = String(
        product.custom_fields?.imei || product.imei || ''
      ).trim();

      return [
        ...currentItems,
        {
          product_id: productId,
          name: product.name,
          sku: product.sku || '',
          barcode:
            product.barcode ||
            product.barcode_number ||
            product.custom_fields?.barcode ||
            '',
          hsn_sac: product.hsn_sac || '9983',
          unit: product.unit || 'Pcs',
          unit_price: getUnitPrice(product),
          quantity: increment,
          discount: 0,
          tax_rate: Number(product.tax_rate) || 0,
          is_tax_inclusive: Boolean(product.is_tax_inclusive),
          custom_fields: product.custom_fields || {},
          selected_size:
            product.custom_fields?.sizes?.split(',')[0]?.trim() || '',
          imei_input: savedImei,
        },
      ];
    });
  };

  useEffect(() => {
    addToBillRef.current = addToBill;
  });

  const findProductByCode = async (value) => {
    const code = normalizeBarcode(value);
    if (!code) return null;

    const localMatch = productsRef.current.find((product) =>
      barcodeMatchesProduct(product, code)
    );

    if (localMatch) return localMatch;

    try {
      const response = await api.get(
        `/products?search=${encodeURIComponent(code)}&limit=100`
      );
      const serverProducts = getProductsFromResponse(response);
      const exactMatch = serverProducts.find((product) =>
        barcodeMatchesProduct(product, code)
      );

      if (exactMatch) {
        setProducts((currentProducts) => {
          const exactId = getProductId(exactMatch);
          const alreadyExists = currentProducts.some(
            (product) => String(getProductId(product)) === String(exactId)
          );

          if (!alreadyExists) return [...currentProducts, exactMatch];

          return currentProducts.map((product) =>
            String(getProductId(product)) === String(exactId)
              ? { ...product, ...exactMatch }
              : product
          );
        });
      }

      return exactMatch || null;
    } catch (error) {
      console.error('Failed to look up product by barcode:', error);
      return null;
    }
  };

  const stopCamera = () => {
    scannerSessionRef.current += 1;
    scanRequestedRef.current = false;
    processingScanRef.current = false;

    try {
      scannerControlsRef.current?.stop();
      scannerReaderRef.current?.reset();
    } catch (error) {
      console.warn('Scanner cleanup failed:', error);
    }

    scannerControlsRef.current = null;
    scannerReaderRef.current = null;

    const stream = scannerStreamRef.current || videoRef.current?.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => track.stop());
    }

    scannerStreamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setIsCameraReady(false);
    setIsScanning(false);
    setIsResolvingBarcode(false);
  };

  const closeScanner = () => {
    stopCamera();
    setIsScannerOpen(false);
    setScannerError('');
    setLastScannedCode('');
  };

  const handleDecodedBarcode = async (result, session) => {
    if (
      !result ||
      scannerSessionRef.current !== session ||
      !scanRequestedRef.current ||
      processingScanRef.current
    ) {
      return;
    }

    processingScanRef.current = true;
    scanRequestedRef.current = false;

    const scannedCode = result.getText().trim();
    setLastScannedCode(scannedCode);
    setScannerError('');
    setIsScanning(false);
    setIsResolvingBarcode(true);

    const product = await findProductByCode(scannedCode);

    if (scannerSessionRef.current !== session) return;

    setIsResolvingBarcode(false);

    if (!product) {
      setScannerError(
        `Scanned "${scannedCode}", but no matching product was found. Check the product's saved barcode or SKU.`
      );
      processingScanRef.current = false;
      return;
    }

    if (getProductStock(product) <= 0) {
      setScannerError(`${product.name || 'This product'} is out of stock.`);
      processingScanRef.current = false;
      return;
    }

    addToBillRef.current?.(product);
    setBarcodeInput('');
    closeScanner();
  };

  useEffect(() => {
    processBarcodeRef.current = handleDecodedBarcode;
  });

  useEffect(() => {
    if (!isScannerOpen || !videoRef.current) return undefined;

    let cancelled = false;
    const session = ++scannerSessionRef.current;

    scanRequestedRef.current = false;
    processingScanRef.current = false;
    setScannerError('');
    setLastScannedCode('');
    setIsCameraReady(false);
    setIsScanning(false);
    setIsResolvingBarcode(false);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.ITF,
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    scannerReaderRef.current = reader;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not available in this browser.');
        }

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && processBarcodeRef.current) {
              void processBarcodeRef.current(result, session);
            }
          }
        );

        if (cancelled || scannerSessionRef.current !== session) {
          controls.stop();
          reader.reset();
          return;
        }

        scannerControlsRef.current = controls;

        const stream = videoRef.current?.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
          scannerStreamRef.current = stream;

          const videoTrack = stream.getVideoTracks?.()[0];
          const capabilities = videoTrack?.getCapabilities?.();

          if (capabilities?.focusMode?.includes('continuous')) {
            try {
              await videoTrack.applyConstraints({
                advanced: [{ focusMode: 'continuous' }],
              });
            } catch {
              // Autofocus is optional and browser-dependent.
            }
          }
        }

        if (!cancelled && scannerSessionRef.current === session) {
          setIsCameraReady(true);
        }
      } catch (error) {
        console.error('Failed to start barcode camera:', error);

        if (!cancelled && scannerSessionRef.current === session) {
          setScannerError(
            'Could not open the camera. Allow camera access and use localhost or HTTPS.'
          );
          setIsCameraReady(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      scanRequestedRef.current = false;
      processingScanRef.current = false;
      scannerSessionRef.current += 1;

      try {
        scannerControlsRef.current?.stop();
        reader.reset();
      } catch (error) {
        console.warn('Scanner cleanup failed:', error);
      }

      const stream = scannerStreamRef.current || videoRef.current?.srcObject;
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => track.stop());
      }

      scannerControlsRef.current = null;
      scannerReaderRef.current = null;
      scannerStreamRef.current = null;

      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isScannerOpen]);

  useEffect(() => {
    if (!isScannerOpen) barcodeInputRef.current?.focus();
  }, [isScannerOpen]);

  useEffect(() => {
    return () => {
      scannerControlsRef.current?.stop();
      scannerReaderRef.current?.reset();

      const stream = scannerStreamRef.current || videoRef.current?.srcObject;
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleScanClick = () => {
    if (!isCameraReady || isScanning || isResolvingBarcode) return;

    setScannerError('');
    setLastScannedCode('');
    processingScanRef.current = false;
    scanRequestedRef.current = true;
    setIsScanning(true);
  };

  const handleBarcodeSubmit = async (event) => {
    event.preventDefault();

    const code = barcodeInput.trim();
    if (!code) return;

    const product = await findProductByCode(code);

    if (!product) {
      window.alert(`No product found with barcode or SKU: ${code}`);
      barcodeInputRef.current?.focus();
      return;
    }

    if (getProductStock(product) <= 0) {
      window.alert(`${product.name || 'This product'} is out of stock.`);
      barcodeInputRef.current?.focus();
      return;
    }

    addToBill(product);
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.barcode, product.barcode_number].some(
        (value) => String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [products, searchQuery]);

  const decreaseBillItemQuantity = (productId) => {
    const availableStock = getCurrentStock(productId);
    if (availableStock <= 0) return;

    setBillItems((currentItems) => {
      const item = currentItems.find(
        (billItem) => String(billItem.product_id) === String(productId)
      );
      if (!item) return currentItems;

      const step = getQuantityStep(item.unit);
      const nextQuantity = Number((item.quantity - step).toFixed(2));

      if (nextQuantity <= 0) {
        setQuantityDrafts((current) => {
          const next = { ...current };
          delete next[productId];
          return next;
        });

        return currentItems.filter(
          (billItem) => String(billItem.product_id) !== String(productId)
        );
      }

      return currentItems.map((billItem) =>
        String(billItem.product_id) === String(productId)
          ? { ...billItem, quantity: nextQuantity }
          : billItem
      );
    });
  };

  const handleQuantityDraftChange = (productId, value) => {
    setQuantityDrafts((current) => ({
      ...current,
      [productId]: value,
    }));
  };

  const commitQuantity = (index, productId) => {
    const draft = quantityDrafts[productId];
    if (draft === undefined) return;

    const quantity = Number.parseFloat(draft);
    const availableStock = getCurrentStock(productId);

    if (!Number.isFinite(quantity) || quantity <= 0 || availableStock <= 0) {
      setQuantityDrafts((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      return;
    }

    const finalQuantity = Math.min(quantity, availableStock);

    if (quantity > availableStock) {
      window.alert(
        `Quantity was limited to the available stock: ${availableStock}.`
      );
    }

    setBillItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: Number(finalQuantity.toFixed(2)) }
          : item
      )
    );

    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const updateBillItem = (index, changes) => {
    setBillItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item
      )
    );
  };

  const removeBillItem = (index) => {
    const item = billItems[index];

    if (item) {
      setQuantityDrafts((current) => {
        const next = { ...current };
        delete next[item.product_id];
        return next;
      });
    }

    setBillItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const clearBill = () => {
    setBillItems([]);
    setQuantityDrafts({});
    setDiscountPercent(0);
    setFlatDiscount(0);
  };

  const stockIssues = useMemo(
    () =>
      billItems.filter((item) => {
        const product = products.find(
          (candidate) =>
            String(getProductId(candidate)) === String(item.product_id)
        );
        const availableStock = getProductStock(product);

        return (
          availableStock <= 0 || Number(item.quantity || 0) > availableStock
        );
      }),
    [billItems, products]
  );

  const totals = useMemo(() => {
    const businessState = tenant?.state || 'Delhi';
    const isInterState =
      customerState.trim().toLowerCase() !==
      businessState.trim().toLowerCase();

    let subtotal = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    billItems.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const gross = quantity * item.unit_price;
      const afterItemDiscount = Math.max(0, gross - (item.discount || 0));

      let taxable = afterItemDiscount;
      let tax = 0;

      if (item.is_tax_inclusive && item.tax_rate > 0) {
        taxable = afterItemDiscount / (1 + item.tax_rate / 100);
        tax = afterItemDiscount - taxable;
      } else {
        tax = taxable * (item.tax_rate / 100);
      }

      subtotal += gross;
      totalTaxable += taxable;

      if (isInterState) {
        totalIgst += tax;
      } else {
        totalCgst += tax / 2;
        totalSgst += tax / 2;
      }
    });

    const invoiceDiscount = Math.min(
      totalTaxable,
      Math.max(
        0,
        totalTaxable * (Number(discountPercent) / 100) +
          Number(flatDiscount)
      )
    );

    const totalTaxes = totalCgst + totalSgst + totalIgst;
    const rawTotal = Math.max(0, totalTaxable - invoiceDiscount + totalTaxes);
    const roundOff = Math.round(rawTotal) - rawTotal;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
      totalTaxes: Number(totalTaxes.toFixed(2)),
      invoiceDiscount: Number(invoiceDiscount.toFixed(2)),
      roundOff: Number(roundOff.toFixed(2)),
      finalPayable: Number((rawTotal + roundOff).toFixed(2)),
      isInterState,
    };
  }, [
    billItems,
    customerState,
    tenant?.state,
    discountPercent,
    flatDiscount,
  ]);

  const createBillSnapshot = () => ({
    customerName: customerName || 'Walk-in Customer',
    customerPhone,
    customerState,
    createdAt: new Date().toLocaleString(),
    items: billItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
    })),
    totals: { ...totals },
  });

  const handlePrintBill = () => {
    if (billItems.length === 0) {
      window.alert('The bill is empty. Add products before printing.');
      return;
    }

    setPrintBill(createBillSnapshot());
    window.setTimeout(() => window.print(), 100);
  };

  const handleOpenCheckout = () => {
    if (billItems.length === 0) {
      window.alert('The bill is empty. Add products first.');
      return;
    }

    if (stockIssues.length > 0) {
      window.alert(
        'Checkout is blocked because one or more products are out of stock or the cart quantity exceeds available stock. Remove or reduce those items first.'
      );
      return;
    }

    setPaidAmount(totals.finalPayable.toFixed(2));
    setIsCheckoutOpen(true);
  };

  const handleFinalCheckout = async () => {
    if (isSubmitting || billItems.length === 0) return;

    if (stockIssues.length > 0) {
      window.alert(
        'Checkout is blocked because one or more products are out of stock or the cart quantity exceeds available stock. Remove or reduce those items first.'
      );
      setIsCheckoutOpen(false);
      return;
    }

    setIsSubmitting(true);

    const billSnapshot = createBillSnapshot();
    const isRestaurantOrder =
      String(currentCategory || '').toLowerCase() === 'restaurant';

    const metadata = {};

    if (isRestaurantOrder) {
      metadata.table_number = restaurantTable;
      metadata.order_type = orderType;
    } else if (currentCategory === 'pharmacy') {
      metadata.doctor_name = doctorName;
    }

    const payload = {
      customer_id: null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_state: customerState,
      customer_gstin: '',
      items: billItems.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        hsn_sac: item.hsn_sac,
        quantity: Number(item.quantity) || 0,
        unit: item.unit,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_rate: item.tax_rate,
        is_tax_inclusive: item.is_tax_inclusive,
        custom_fields: {
          ...item.custom_fields,
          size: item.selected_size,
          imei: String(
            item.imei_input || item.custom_fields?.imei || ''
          ).trim(),
        },
      })),
      discount_percentage: Number(discountPercent) || 0,
      flat_discount: Number(flatDiscount) || 0,
      payments: [
        {
          method: paymentMethod,
          amount: Number(paidAmount) || totals.finalPayable,
          reference: paymentRef,
        },
      ],
      metadata,
    };

    try {
      const response = await api.post('/billing/checkout', payload);
      const invoice = response.data;

      let kitchenWarning = '';

      if (isRestaurantOrder) {
        try {
          await api.post('/restaurant/kot', {
            table_number:
              orderType === 'DINE_IN' ? restaurantTable : orderType,
            order_type: orderType,
            items: billItems.map((item) => ({
              name: item.name,
              quantity: Number(item.quantity) || 1,
              notes: '',
            })),
            waiter_name: '',
            notes: '',
          });
        } catch (kotError) {
          console.error(
            'Invoice created, but kitchen ticket creation failed:',
            kotError
          );
          kitchenWarning =
            kotError.response?.data?.detail ||
            'The invoice was created, but the kitchen ticket could not be created. Do not retry checkout; check the kitchen/API logs.';
        }
      }

      setPrintBill({
        ...billSnapshot,
        invoiceNumber: invoice.invoice_number,
        paymentStatus: invoice.payment_status,
        finalPayable:
          invoice.final_payable ?? billSnapshot.totals.finalPayable,
      });
      setCompletedInvoice(invoice);
      setIsCheckoutOpen(false);
      clearBill();

      if (kitchenWarning) {
        window.alert(kitchenWarning);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      window.alert(error.response?.data?.detail || 'Failed to generate invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const SummaryRow = ({ label, value, strong = false }) => (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={strong ? 'font-bold text-slate-900' : 'text-slate-500'}>
        {label}
      </span>
      <span
        className={
          strong
            ? 'font-extrabold text-slate-900'
            : 'font-semibold text-slate-700'
        }
      >
        {value}
      </span>
    </div>
  );

  return (
    <>
      <main className="flex h-auto min-h-[calc(100dvh-6.5rem)] flex-col gap-3 print:hidden lg:h-[calc(100dvh-6.5rem)] lg:min-h-0 lg:flex-row lg:gap-6">
        <section className="flex h-[45vh] min-h-[280px] flex-none flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:h-auto lg:min-h-0 lg:flex-1">
          <div className="space-y-3 border-b border-slate-100 bg-slate-50/50 p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setScannerError('');
                    setLastScannedCode('');
                    setIsScannerOpen(true);
                  }}
                  aria-label="Open camera barcode scanner"
                  title="Scan barcode with camera"
                  className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 rounded text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <ScanBarcode className="h-4 w-4" />
                </button>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(event) => setBarcodeInput(event.target.value)}
                  placeholder="Use USB scanner or click the barcode icon..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </form>

              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search catalog items..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {config?.category_name || currentCategory || 'Business'} POS Mode
                {productsLoading && (
                  <span className="ml-2 normal-case text-slate-400">
                    Checking stock...
                  </span>
                )}
              </span>

              {currentCategory === 'restaurant' && (
                <div className="flex gap-2">
                  <select
                    value={restaurantTable}
                    onChange={(event) => setRestaurantTable(event.target.value)}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900"
                  >
                    {['T-1', 'T-2', 'T-3', 'T-4', 'T-5'].map((table) => (
                      <option key={table} value={table}>
                        Table {table}
                      </option>
                    ))}
                  </select>
                  <select
                    value={orderType}
                    onChange={(event) => setOrderType(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                  >
                    <option value="DINE_IN">Dine-In</option>
                    <option value="TAKEAWAY">Takeaway</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
              )}

              {currentCategory === 'wholesale' && (
                <select
                  value={wholesaleTier}
                  onChange={(event) => setWholesaleTier(event.target.value)}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-900"
                >
                  <option value="RETAIL">Standard Retail</option>
                  <option value="DEALER">Dealer Pricing</option>
                  <option value="DISTRIBUTOR">Distributor Bulk</option>
                </select>
              )}

              {currentCategory === 'pharmacy' && (
                <input
                  type="text"
                  placeholder="Doctor Name"
                  value={doctorName}
                  onChange={(event) => setDoctorName(event.target.value)}
                  className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs"
                />
              )}

              <button
                type="button"
                onClick={() => setIsReturnPanelOpen(true)}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
              >
                Returns / Exchanges
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <ShoppingBag className="mb-2 h-12 w-12 text-slate-300" />
                <p className="text-sm font-semibold">No products found</p>
                <p className="text-xs">Try adjusting your search query</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                  const productId = getProductId(product);
                  const stock = getProductStock(product);
                  const outOfStock = stock <= 0;
                  const billItem = billItems.find(
                    (item) => String(item.product_id) === String(productId)
                  );
                  const step = getQuantityStep(product.unit);
                  const quantityInBill = Number(billItem?.quantity || 0);
                  const quantityAtStockLimit =
                    quantityInBill + step > stock;

                  return (
                    <article
                      key={productId || product.sku || product.name}
                      aria-disabled={outOfStock}
                      className={`flex flex-col justify-between rounded-2xl border p-3 transition ${
                        outOfStock
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                          : 'border-slate-200/80 bg-white hover:border-indigo-500 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="mb-1 flex justify-between gap-2 text-[10px] font-semibold text-slate-400">
                          <span className="truncate">
                            {product.category || 'General'}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            {product.unit || 'Pcs'}
                          </span>
                        </div>
                        <h2 className="line-clamp-2 text-xs font-bold text-slate-800">
                          {product.name}
                        </h2>
                        {product.custom_fields?.batch_number && (
                          <p className="mt-1 text-[9px] font-bold text-blue-700">
                            Batch: {product.custom_fields.batch_number}
                          </p>
                        )}
                        {product.custom_fields?.food_type && (
                          <p className="mt-1 text-[9px] font-bold">
                            {product.custom_fields.food_type}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900">
                            ₹{getUnitPrice(product).toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            GST {Number(product.tax_rate) || 0}%
                          </p>
                          <p
                            className={`mt-1 text-[9px] font-bold ${
                              outOfStock ? 'text-rose-700' : 'text-slate-500'
                            }`}
                          >
                            {outOfStock
                              ? 'Out of Stock'
                              : `Available: ${stock} ${product.unit || 'Pcs'}`}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decreaseBillItemQuantity(productId)}
                            disabled={!billItem || outOfStock}
                            aria-label={`Decrease quantity of ${product.name} on bill`}
                            title="Decrease quantity"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToBill(product)}
                            disabled={
                              outOfStock ||
                              (Boolean(billItem) && quantityAtStockLimit)
                            }
                            aria-label={`Add ${product.name} to bill`}
                            title={
                              outOfStock
                                ? 'Product is out of stock'
                                : quantityAtStockLimit
                                  ? 'Available stock limit reached'
                                  : 'Add to bill'
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-[560px] w-full flex-none flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:min-h-0 lg:w-96">
          <header className="space-y-3 border-b border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Billing</h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                {billItems.length} items
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer Name"
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Phone (Optional)"
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          </header>

          <div className="min-h-[180px] flex-1 divide-y divide-slate-100 overflow-y-auto p-3">
            {billItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
                <Receipt className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">Bill is empty</p>
                <p className="mt-1 text-[11px]">
                  Scan a barcode or select a product to add it here
                </p>
              </div>
            ) : (
              billItems.map((item, index) => {
                const availableStock = getCurrentStock(item.product_id);
                const outOfStock = availableStock <= 0;
                const quantityExceedsStock =
                  Number(item.quantity || 0) > availableStock;
                const itemUnavailable = outOfStock || quantityExceedsStock;

                return (
                  <article
                    key={`${item.product_id}-${index}`}
                    aria-disabled={itemUnavailable}
                    className={`space-y-2 py-3 ${
                      itemUnavailable ? 'rounded-lg bg-rose-50/70 px-2' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs font-bold ${
                            itemUnavailable ? 'text-rose-800' : 'text-slate-800'
                          }`}
                        >
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          ₹{item.unit_price.toFixed(2)} / {item.unit} · GST{' '}
                          {item.tax_rate}%
                        </p>
                        {itemUnavailable && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            {outOfStock
                              ? 'Out of stock — remove this item to continue'
                              : `Only ${availableStock} ${item.unit} available — reduce quantity`}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBillItem(index)}
                        aria-label={`Remove ${item.name} from bill`}
                        title="Remove from bill"
                        className="rounded p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {currentCategory === 'textile' && (
                      <label className="flex items-center gap-2 text-[10px] text-slate-500">
                        Size
                        <select
                          value={item.selected_size}
                          disabled={itemUnavailable}
                          onChange={(event) =>
                            updateBillItem(index, {
                              selected_size: event.target.value,
                            })
                          }
                          className="rounded border border-slate-200 bg-white px-2 py-1 disabled:opacity-50"
                        >
                          {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {currentCategory === 'electronics' && (
                      <input
                        type="text"
                        value={
                          item.imei_input ||
                          item.custom_fields?.imei ||
                          ''
                        }
                        readOnly={Boolean(item.custom_fields?.imei)}
                        disabled={itemUnavailable}
                        onChange={(event) =>
                          updateBillItem(index, {
                            imei_input: event.target.value,
                          })
                        }
                        placeholder="IMEI not saved on product"
                        aria-label={`IMEI for ${item.name}`}
                        className="w-full rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs read-only:cursor-not-allowed read-only:opacity-80 disabled:opacity-50"
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] text-slate-400">
                        Qty
                        <input
                          type="number"
                          min="0.1"
                          max={availableStock}
                          step={getQuantityStep(item.unit)}
                          value={
                            quantityDrafts[item.product_id] ??
                            String(item.quantity)
                          }
                          disabled={itemUnavailable}
                          onChange={(event) =>
                            handleQuantityDraftChange(
                              item.product_id,
                              event.target.value
                            )
                          }
                          onBlur={() =>
                            commitQuantity(index, item.product_id)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                          }}
                          aria-label={`Quantity of ${item.name}`}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:opacity-60"
                        />
                      </label>
                      <p
                        className={`text-xs font-black ${
                          itemUnavailable ? 'text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        ₹
                        {(
                          (Number(item.quantity) || 0) * item.unit_price -
                          item.discount
                        ).toFixed(2)}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {stockIssues.length > 0 && (
            <div
              role="alert"
              className="mx-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Checkout is disabled until out-of-stock items are removed or
                quantities are reduced to available stock.
              </span>
            </div>
          )}

          <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-4">
            <div className="space-y-2">
              <SummaryRow
                label="Subtotal:"
                value={`₹${totals.subtotal.toFixed(2)}`}
              />
              {totals.invoiceDiscount > 0 && (
                <SummaryRow
                  label="Discount:"
                  value={`-₹${totals.invoiceDiscount.toFixed(2)}`}
                />
              )}
              {totals.isInterState ? (
                <SummaryRow
                  label="IGST:"
                  value={`₹${totals.totalIgst.toFixed(2)}`}
                />
              ) : (
                <>
                  <SummaryRow
                    label="CGST:"
                    value={`₹${totals.totalCgst.toFixed(2)}`}
                  />
                  <SummaryRow
                    label="SGST:"
                    value={`₹${totals.totalSgst.toFixed(2)}`}
                  />
                </>
              )}
              <SummaryRow
                label="Round Off:"
                value={`₹${totals.roundOff.toFixed(2)}`}
              />
              <div className="border-t border-slate-200 pt-2">
                <SummaryRow
                  label="Payable:"
                  value={`₹${totals.finalPayable.toFixed(2)}`}
                  strong
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clearBill}
                className="rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Clear Bill
              </button>
              <button
                type="button"
                onClick={handlePrintBill}
                disabled={billItems.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-2 py-2.5 text-xs font-bold text-indigo-700 disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Print Bill
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenCheckout}
              disabled={billItems.length === 0 || stockIssues.length > 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CreditCard className="h-4 w-4" />
              Charge ₹{totals.finalPayable.toFixed(2)}
            </button>
          </div>
        </section>
      </main>

      <div className="print:hidden">
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Payment & Invoice Tender"
          size="md"
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase text-indigo-500">
                Total Bill Amount
              </p>
              <p className="text-2xl font-black text-slate-900">
                ₹{totals.finalPayable.toFixed(2)}
              </p>
            </div>

            {stockIssues.length > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Stock changed. Remove out-of-stock products or reduce
                  quantities before checkout.
                </span>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-700">
                Select Payment Method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border p-3 text-xs font-bold ${
                        paymentMethod === method
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="text-xs font-bold text-slate-700">
                Amount Paid (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                Ref / Transaction ID
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(event) => setPaymentRef(event.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalCheckout}
                disabled={isSubmitting || stockIssues.length > 0}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {isSubmitting ? 'Processing...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>

        {completedInvoice && (
          <Modal
            isOpen={true}
            onClose={() => setCompletedInvoice(null)}
            title="Invoice Generated Successfully!"
            size="md"
          >
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
              <div>
                <p className="text-xl font-extrabold text-slate-900">
                  Invoice {completedInvoice.invoice_number}
                </p>
                <p className="text-xs text-slate-500">
                  Total: ₹{completedInvoice.final_payable} · Status:{' '}
                  {completedInvoice.payment_status}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (printBill) window.print();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white"
                >
                  <Download className="h-4 w-4" />
                  Print Bill
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedInvoice(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700"
                >
                  New Transaction
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      {isScannerOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Scan a barcode</h2>
              <button
                type="button"
                onClick={closeScanner}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <video
              ref={videoRef}
              className="min-h-48 w-full rounded-xl bg-black object-contain"
              muted
              playsInline
            />

            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              {isCameraReady ? 'Camera ready.' : 'Opening camera...'}
            </p>

            {lastScannedCode && (
              <p className="mt-2 text-xs text-slate-700">
                Detected code: <strong>{lastScannedCode}</strong>
              </p>
            )}

            {scannerError && (
              <p role="alert" className="mt-2 text-sm text-rose-600">
                {scannerError}
              </p>
            )}

            <button
              type="button"
              onClick={handleScanClick}
              disabled={!isCameraReady || isScanning || isResolvingBarcode}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScanning
                ? 'Scanning...'
                : isResolvingBarcode
                  ? 'Checking stock...'
                  : 'Scan'}
            </button>

            <p className="mt-3 text-xs text-slate-500">
              After a successful match, the item appears in the Billing panel.
              Out-of-stock products cannot be added.
            </p>
          </div>
        </div>
      )}

      {printBill && (
        <article className="hidden bg-white p-6 text-black print:fixed print:inset-0 print:z-[9999] print:block print:overflow-visible print:p-8">
          <header className="mb-6 border-b border-slate-400 pb-4 text-center">
            <h1 className="text-2xl font-bold">Sales Invoice</h1>
            {printBill.invoiceNumber && (
              <p className="mt-2 text-sm">
                Invoice: {printBill.invoiceNumber}
              </p>
            )}
            <p className="mt-1 text-sm">Date: {printBill.createdAt}</p>
          </header>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-bold uppercase">Customer</h2>
            <p className="text-sm">{printBill.customerName}</p>
            {printBill.customerPhone && (
              <p className="text-sm">Phone: {printBill.customerPhone}</p>
            )}
            {printBill.customerState && (
              <p className="text-sm">State: {printBill.customerState}</p>
            )}
          </section>

          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-slate-400">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Price</th>
                <th className="py-2 pr-2">GST</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {printBill.items.map((item, index) => (
                <tr
                  key={`${item.product_id}-${index}`}
                  className="border-b border-slate-300"
                >
                  <td className="py-2 pr-2">
                    <span>{item.name}</span>
                    {item.sku && (
                      <span className="block text-xs">SKU: {item.sku}</span>
                    )}
                    {item.selected_size && (
                      <span className="block text-xs">
                        Size: {item.selected_size}
                      </span>
                    )}
                    {item.imei_input && (
                      <span className="block text-xs">
                        IMEI: {item.imei_input}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 pr-2">
                    ₹{item.unit_price.toFixed(2)}
                  </td>
                  <td className="py-2 pr-2">{item.tax_rate}%</td>
                  <td className="py-2 text-right">
                    ₹
                    {(
                      item.quantity * item.unit_price -
                      item.discount
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="ml-auto mt-6 w-full max-w-xs space-y-2">
            <SummaryRow
              label="Subtotal:"
              value={`₹${printBill.totals.subtotal.toFixed(2)}`}
            />

            {printBill.totals.invoiceDiscount > 0 && (
              <SummaryRow
                label="Discount:"
                value={`-₹${printBill.totals.invoiceDiscount.toFixed(2)}`}
              />
            )}

            {printBill.totals.isInterState ? (
              <SummaryRow
                label="IGST:"
                value={`₹${printBill.totals.totalIgst.toFixed(2)}`}
              />
            ) : (
              <>
                <SummaryRow
                  label="CGST:"
                  value={`₹${printBill.totals.totalCgst.toFixed(2)}`}
                />
                <SummaryRow
                  label="SGST:"
                  value={`₹${printBill.totals.totalSgst.toFixed(2)}`}
                />
              </>
            )}

            <SummaryRow
              label="Round Off:"
              value={`₹${printBill.totals.roundOff.toFixed(2)}`}
            />

            <div className="border-t border-slate-500 pt-2">
              <SummaryRow
                label="Payable:"
                value={`₹${Number(
                  printBill.finalPayable ?? printBill.totals.finalPayable
                ).toFixed(2)}`}
                strong
              />
            </div>

            {printBill.paymentStatus && (
              <SummaryRow
                label="Payment Status:"
                value={printBill.paymentStatus}
              />
            )}
          </section>

          <footer className="mt-10 text-center text-sm">
            Thank you for your purchase!
          </footer>
        </article>
      )}

      {isReturnPanelOpen && (
        <ReturnExchangePanel onClose={() => setIsReturnPanelOpen(false)} />
      )}
    </>
  );
};

export default POS;