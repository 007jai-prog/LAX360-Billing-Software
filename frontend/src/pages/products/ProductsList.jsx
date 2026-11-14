import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBusinessConfig } from '../../context/BusinessConfigContext';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useForm } from 'react-hook-form';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Tag,
  Eye,
  CalendarDays,
  X,
  ScanBarcode
} from 'lucide-react';

const DEFAULT_PRODUCT_VALUES = {
  name: '',
  sku: '',
  barcode: '',
  category: 'General',
  unit: 'Pcs',
  purchase_price: 0,
  selling_price: 100,
  tax_rate: 18,
  stock: 50,
  low_stock_threshold: 5,
  hsn_sac: '9983',
  imei: ''
};

const formatCurrency = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const getProductCustomFields = (product) =>
  product?.custom_fields &&
  typeof product.custom_fields === 'object' &&
  !Array.isArray(product.custom_fields)
    ? product.custom_fields
    : {};

const getProductCategory = (product) =>
  String(product?.category || 'General').trim() || 'General';

export const ProductsList = () => {
  const { config, productFields = [], currentCategory } = useBusinessConfig();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minimumCost, setMinimumCost] = useState('');
  const [maximumCost, setMaximumCost] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerMessage, setScannerMessage] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hasDetectedBarcodeRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: DEFAULT_PRODUCT_VALUES
  });

  const fetchProducts = async () => {
    setLoading(true);

    try {
      let url = '/products?limit=100';
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await api.get(url);
      const data = response.data;
      const fetchedProducts = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.products)
            ? data.products
            : [];

      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!isScannerOpen) return undefined;

    let cancelled = false;
    hasDetectedBarcodeRef.current = false;
    setScannerError('');
    setScannerMessage('Starting camera...');
    setManualBarcode('');

    const stopCamera = () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const handleDetectedBarcode = (barcode) => {
      if (cancelled || hasDetectedBarcodeRef.current) return;

      const value = String(barcode || '').trim();
      if (!value) return;

      hasDetectedBarcodeRef.current = true;
      stopCamera();
      setIsScannerOpen(false);
      openAddProductModal(value);
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError(
          'Camera access is not available in this browser. Enter the barcode manually instead.'
        );
        setScannerMessage('');
        return;
      }

      if (!('BarcodeDetector' in window)) {
        setScannerError(
          'This browser does not support barcode scanning. Enter the barcode manually instead.'
        );
        setScannerMessage('');
        return;
      }

      try {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
        const preferredFormats = [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'qr_code'
        ];
        const formats = preferredFormats.filter((format) =>
          supportedFormats.includes(format)
        );

        const detector = new window.BarcodeDetector(
          formats.length ? { formats } : undefined
        );

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' }
          }
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setScannerMessage('Point the camera at a product barcode.');

        const scanFrame = async () => {
          if (
            cancelled ||
            hasDetectedBarcodeRef.current ||
            !videoRef.current
          ) {
            return;
          }

          try {
            const detectedCodes = await detector.detect(videoRef.current);
            const firstCode = detectedCodes.find((code) => code.rawValue);

            if (firstCode?.rawValue) {
              handleDetectedBarcode(firstCode.rawValue);
              return;
            }
          } catch (error) {
            console.error('Barcode detection failed:', error);
          }

          if (!cancelled && !hasDetectedBarcodeRef.current) {
            animationFrameRef.current =
              window.requestAnimationFrame(scanFrame);
          }
        };

        scanFrame();
      } catch (error) {
        console.error('Unable to start barcode scanner:', error);

        if (!cancelled) {
          setScannerError(
            error.name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access or enter the barcode manually.'
              : 'Unable to start the camera. Enter the barcode manually instead.'
          );
          setScannerMessage('');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // openAddProductModal is intentionally defined as a component-local handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen]);

  const categories = useMemo(
    () =>
      [...new Set(products.map(getProductCategory))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const minCost = minimumCost.trim() === '' ? null : Number(minimumCost);
    const maxCost = maximumCost.trim() === '' ? null : Number(maximumCost);

    return products.filter((product) => {
      if (
        categoryFilter &&
        getProductCategory(product).toLowerCase() !==
          categoryFilter.toLowerCase()
      ) {
        return false;
      }

      const cost = Number(product.purchase_price) || 0;

      if (minCost !== null && Number.isFinite(minCost) && cost < minCost) {
        return false;
      }

      if (maxCost !== null && Number.isFinite(maxCost) && cost > maxCost) {
        return false;
      }

      return true;
    });
  }, [products, categoryFilter, minimumCost, maximumCost]);

  const getFormDefaults = () => {
    const defaults = { ...DEFAULT_PRODUCT_VALUES };

    productFields.forEach((field) => {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      }
    });

    return defaults;
  };

  const openAddProductModal = (barcode = '') => {
    setEditingProduct(null);
    setServerError('');
    reset({
      ...getFormDefaults(),
      barcode,
      ...(barcode ? { sku: barcode } : {})
    });
    setIsProductModalOpen(true);
  };

  const openScanner = () => {
    setScannerError('');
    setScannerMessage('');
    setManualBarcode('');
    hasDetectedBarcodeRef.current = false;
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setScannerError('');
    setScannerMessage('');
  };

  const useManualBarcode = () => {
    const barcode = manualBarcode.trim();

    if (!barcode) {
      setScannerError('Enter a barcode first.');
      return;
    }

    hasDetectedBarcodeRef.current = true;
    setIsScannerOpen(false);
    openAddProductModal(barcode);
  };

  const openEditProductModal = (product) => {
    const customFields = getProductCustomFields(product);

    const values = {
      ...getFormDefaults(),
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      category: product.category || 'General',
      unit: product.unit || 'Pcs',
      purchase_price: product.purchase_price ?? 0,
      selling_price: product.selling_price ?? 0,
      tax_rate: product.tax_rate ?? 0,
      stock: product.stock ?? 0,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      hsn_sac: product.hsn_sac || '9983',
      ...customFields,
      imei: customFields.imei || ''
    };

    setEditingProduct(product);
    setServerError('');
    reset(values);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    if (isSubmitting) return;
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setServerError('');
  };

  const saveProduct = async (data) => {
    setIsSubmitting(true);
    setServerError('');

    try {
      const payload = {
        name: data.name.trim(),
        sku: data.sku.trim(),
        barcode: data.barcode?.trim() || data.sku.trim(),
        category: data.category?.trim() || 'General',
        unit: data.unit,
        purchase_price: Number.parseFloat(data.purchase_price) || 0,
        selling_price: Number.parseFloat(data.selling_price) || 0,
        tax_rate: Number.parseFloat(data.tax_rate) || 0,
        stock: Number.parseFloat(data.stock) || 0,
        low_stock_threshold:
          Number.parseFloat(data.low_stock_threshold) || 5,
        hsn_sac: data.hsn_sac?.trim() || '9983',
        custom_fields: {}
      };

      if (currentCategory === 'electronics') {
        payload.custom_fields.imei = String(data.imei || '').trim();
      }

      productFields.forEach((field) => {
        if (data[field.key] !== undefined && data[field.key] !== '') {
          payload.custom_fields[field.key] = data[field.key];
        }
      });

      if (editingProduct) {
        const productId = editingProduct.id || editingProduct._id;

        if (!productId) {
          throw new Error('This product does not have an ID to update.');
        }

        try {
          await api.put(`/products/${productId}`, payload);
        } catch (putError) {
          const status = putError.response?.status;

          if (status !== 404 && status !== 405) {
            throw putError;
          }

          await api.patch(`/products/${productId}`, payload);
        }
      } else {
        await api.post('/products', payload);
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      reset(getFormDefaults());
      await fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      setServerError(
        error.response?.data?.detail ||
          error.message ||
          `Failed to ${editingProduct ? 'update' : 'create'} product.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      const productId = product.id || product._id;
      await api.delete(`/products/${productId}`);
      await fetchProducts();

      if (
        selectedProduct &&
        String(selectedProduct.id || selectedProduct._id) ===
          String(productId)
      ) {
        setSelectedProduct(null);
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete product.');
    }
  };

  const renderCustomFieldInput = (field) => {
    const isExpiryDate =
      field.key === 'expiry_date' ||
      field.key === 'expiryDate' ||
      field.type === 'date';

    if (field.type === 'select') {
      return (
        <select
          {...register(field.key)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select {field.label}</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div className="relative">
        <input
          type={
            isExpiryDate
              ? 'date'
              : field.type === 'number'
                ? 'number'
                : 'text'
          }
          step={field.type === 'number' ? 'any' : undefined}
          {...register(field.key)}
          className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isExpiryDate ? 'pr-10' : ''
          }`}
        />
        {isExpiryDate && (
          <CalendarDays
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
        )}
      </div>
    );
  };

  const renderProductSpecs = (product) => {
    const fields = getProductCustomFields(product);

    if (currentCategory === 'restaurant' && fields.food_type) {
      return (
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
            fields.food_type === 'Veg'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {fields.food_type}
          {fields.food_category ? ` • ${fields.food_category}` : ''}
        </span>
      );
    }

    if (currentCategory === 'pharmacy' && fields.batch_number) {
      return (
        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
          Batch: {fields.batch_number}
          {fields.expiry_date ? ` • Exp: ${fields.expiry_date}` : ''}
        </span>
      );
    }

    if (currentCategory === 'textile' && fields.sizes) {
      return (
        <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
          Sizes: {fields.sizes}
        </span>
      );
    }

    if (currentCategory === 'wholesale' && fields.moq) {
      return (
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
          MOQ: {fields.moq}
          {fields.dealer_price != null
            ? ` • Dealer: ${formatCurrency(fields.dealer_price)}`
            : ''}
        </span>
      );
    }

    if (currentCategory === 'electronics') {
      const details = [
        fields.brand,
        fields.imei ? `IMEI: ${fields.imei}` : null,
        fields.warranty_months
          ? `${fields.warranty_months} Mo. Warranty`
          : null
      ].filter(Boolean);

      return details.length > 0 ? (
        <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          {details.join(' • ')}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      );
    }

    if (currentCategory === 'grocery') {
      return (
        <span className="text-[10px] font-semibold text-slate-500">
          Unit: {product.unit || 'Pcs'}
        </span>
      );
    }

    return <span className="text-slate-400">—</span>;
  };

  const selectedProductCustomFields = selectedProduct
    ? getProductCustomFields(selectedProduct)
    : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {config?.category_name || 'Product Catalog'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage products, variants, pricing, stock, and tax rates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openScanner}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 active:scale-95"
          >
            <ScanBarcode className="h-4 w-4" />
            <span>Scan Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => openAddProductModal()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, SKU, or barcode..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              Min cost ₹
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minimumCost}
              onChange={(event) => setMinimumCost(event.target.value)}
              placeholder="Any"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              Max cost ₹
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maximumCost}
              onChange={(event) => setMaximumCost(event.target.value)}
              placeholder="Any"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row sm:items-center">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          {(categoryFilter || minimumCost || maximumCost) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('');
                setMinimumCost('');
                setMaximumCost('');
              }}
              className="self-start font-semibold text-indigo-600 hover:text-indigo-800 sm:self-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Product &amp; SKU</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Specialized Specs</th>
                <th className="px-4 py-3.5">Cost</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">GST Rate</th>
                <th className="px-4 py-3.5">Current Stock</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
                    <span>Loading products...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="mx-auto mb-2 h-10 w-10 stroke-[1.5] text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      No products match these filters
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Adjust your search or filters, or add a new product.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stock = Number(product.stock) || 0;
                  const isOutOfStock = stock <= 0;
                  const isLow =
                    !isOutOfStock &&
                    stock <= (Number(product.low_stock_threshold) || 5);

                  return (
                    <tr
                      key={product.id || product._id || product.sku}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-slate-900">
                          {product.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          SKU: {product.sku || '—'} • Barcode:{' '}
                          {product.barcode || 'None'}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {getProductCategory(product)}
                      </td>

                      <td className="px-4 py-3.5">
                        {renderProductSpecs(product)}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {formatCurrency(product.purchase_price)}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-extrabold text-slate-900">
                        {formatCurrency(product.selling_price)}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-indigo-600">
                        {Number(product.tax_rate) || 0}%
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            isOutOfStock
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : isLow
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Out of Stock'
                            : `${stock} ${product.unit || 'Pcs'}`}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditProductModal(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit product"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            aria-label={`Delete ${product.name}`}
                            title="Delete product"
                            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        title={
          editingProduct
            ? `Edit ${editingProduct.name || 'Product'}`
            : `Add New Item (${config?.category_name || 'Product'})`
        }
        size="lg"
      >
        <form onSubmit={handleSubmit(saveProduct)} className="space-y-4">
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Premium Basmati Rice"
                {...register('name', { required: 'Name is required' })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && (
                <p className="mt-0.5 text-[11px] text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                SKU *
              </label>
              <input
                type="text"
                placeholder="e.g. RCE-001"
                {...register('sku', { required: 'SKU is required' })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.sku && (
                <p className="mt-0.5 text-[11px] text-rose-600">
                  {errors.sku.message}
                </p>
              )}
            </div>
          </div>

          {currentCategory === 'electronics' && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                IMEI Number *
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={15}
                placeholder="Enter 15-digit IMEI"
                {...register('imei', {
                  required: 'IMEI number is required for electronics products',
                  pattern: {
                    value: /^\d{15}$/,
                    message: 'IMEI must contain exactly 15 digits'
                  }
                })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.imei && (
                <p className="mt-0.5 text-[11px] text-rose-600">
                  {errors.imei.message}
                </p>
              )}
              <p className="mt-1 text-[10px] text-slate-500">
                Enter the device’s unique 15-digit IMEI.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Barcode / EAN
              </label>
              <input
                type="text"
                placeholder="Barcode number"
                {...register('barcode')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Staples or Starters"
                {...register('category')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Unit of Measure
              </label>
              <select
                {...register('unit')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs"
              >
                <option value="Pcs">Pcs</option>
                <option value="Kg">Kg</option>
                <option value="Gm">Gm</option>
                <option value="Ltr">Ltr</option>
                <option value="Pack">Pack</option>
                <option value="Strip">Strip</option>
                <option value="Box">Box</option>
                <option value="Plate">Plate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Cost Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('purchase_price')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('selling_price', {
                  required: 'Selling price is required'
                })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-xs font-bold"
              />
              {errors.selling_price && (
                <p className="mt-0.5 text-[11px] text-rose-600">
                  {errors.selling_price.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                GST Rate (%)
              </label>
              <select
                {...register('tax_rate')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs"
              >
                <option value="0">0% (Nil)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Opening Stock
              </label>
              <input
                type="number"
                min="0"
                step="1"
                {...register('stock', {
                  valueAsNumber: true,
                  min: {
                    value: 0,
                    message: 'Stock cannot be negative'
                  }
                })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
              />
              {errors.stock && (
                <p className="mt-0.5 text-[11px] text-rose-600">
                  {errors.stock.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Low Stock Alert At
              </label>
              <input
                type="number"
                min="0"
                step="1"
                {...register('low_stock_threshold')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                HSN / SAC
              </label>
              <input
                type="text"
                {...register('hsn_sac')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {productFields.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                <Tag className="h-3.5 w-3.5" />
                <span>
                  {config?.category_name || 'Product'} Custom Attributes
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {productFields
                  .filter(
                    (field) =>
                      !(
                        currentCategory === 'electronics' &&
                        field.key === 'imei'
                      )
                  )
                  .map((field) => {
                    const isExpiryDate =
                      field.key === 'expiry_date' ||
                      field.key === 'expiryDate' ||
                      field.type === 'date';

                    return (
                      <div key={field.key}>
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          {field.label}
                          {isExpiryDate && (
                            <span className="ml-1 font-normal normal-case text-slate-500">
                              (select from calendar)
                            </span>
                          )}
                        </label>
                        {renderCustomFieldInput(field)}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={closeProductModal}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50"
            >
              {editingProduct ? (
                <Edit className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : editingProduct
                    ? 'Save Changes'
                    : 'Save Product to Catalog'}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || 'Product Details'}
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Product Name', selectedProduct.name],
                ['SKU', selectedProduct.sku],
                ['Barcode', selectedProduct.barcode],
                ['Category', selectedProduct.category],
                ['Unit', selectedProduct.unit],
                ['Purchase Cost', formatCurrency(selectedProduct.purchase_price)],
                ['Selling Price', formatCurrency(selectedProduct.selling_price)],
                ['Tax Rate', `${Number(selectedProduct.tax_rate) || 0}%`],
                [
                  'Current Stock',
                  `${Number(selectedProduct.stock) || 0} ${selectedProduct.unit || 'Pcs'}`
                ],
                ['Low Stock Threshold', selectedProduct.low_stock_threshold],
                ['HSN / SAC', selectedProduct.hsn_sac]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                    {label}
                  </p>
                  <p className="break-words text-sm font-medium text-slate-800">
                    {value ?? '—'}
                  </p>
                </div>
              ))}
            </div>

            {Object.keys(selectedProductCustomFields).length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                  <Tag className="h-4 w-4" />
                  Specialized / Custom Details
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(selectedProductCustomFields).map(
                    ([key, value]) => (
                      <div key={key} className="rounded-xl bg-indigo-50/60 p-3">
                        <p className="mb-1 text-[10px] font-bold uppercase text-indigo-600">
                          {productFields.find((field) => field.key === key)
                            ?.label || key.replaceAll('_', ' ')}
                        </p>
                        <p className="break-words text-sm font-medium text-slate-800">
                          {value === null || value === undefined || value === ''
                            ? '—'
                            : String(value)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {isScannerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="barcode-scanner-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2
                  id="barcode-scanner-title"
                  className="text-base font-bold text-slate-900"
                >
                  Scan product barcode
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  The scanned code will be added to a new product form.
                </p>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                aria-label="Close barcode scanner"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-xl bg-slate-950">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />
              </div>

              {scannerMessage && (
                <p className="text-center text-xs text-slate-600">
                  {scannerMessage}
                </p>
              )}

              {scannerError && (
                <p
                  role="alert"
                  className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
                >
                  {scannerError}
                </p>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  useManualBarcode();
                }}
                className="space-y-2"
              >
                <label
                  htmlFor="manual-barcode"
                  className="block text-xs font-bold text-slate-700"
                >
                  Or enter barcode manually
                </label>
                <div className="flex gap-2">
                  <input
                    id="manual-barcode"
                    type="text"
                    autoComplete="off"
                    value={manualBarcode}
                    onChange={(event) => setManualBarcode(event.target.value)}
                    placeholder="Enter or scan barcode"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Use code
                  </button>
                </div>
              </form>

              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={closeScanner}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsList;