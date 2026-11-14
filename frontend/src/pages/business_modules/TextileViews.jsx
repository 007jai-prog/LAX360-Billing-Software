import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { RefreshCw, Printer } from 'lucide-react';

export const BarcodeGenerator = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const response = await api.get('/products?limit=100');
        const data = response.data;

        const productList = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.products)
              ? data.products
              : [];

        if (!isMounted) return;

        setProducts(productList);
        setSelectedProduct(productList[0] || null);
      } catch (error) {
        console.error('Failed to load apparel products:', error);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              margin: 0;
            }

            html,
            body,
            #root {
              width: 100%;
              min-height: 0;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            body * {
              visibility: hidden !important;
            }

            #printable-hang-tag,
            #printable-hang-tag * {
              visibility: visible !important;
            }

            #printable-hang-tag {
              position: fixed !important;
              top: 10mm !important;
              left: 50% !important;
              z-index: 999999 !important;
              width: 64mm !important;
              max-width: 64mm !important;
              margin: 0 !important;
              transform: translateX(-50%) !important;
              border: 1.5px solid #111827 !important;
              border-radius: 5mm !important;
              background: #fff !important;
              box-shadow: none !important;
              color: #111827 !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
        `}
      </style>

      <div className="space-y-6 print:hidden">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Apparel Barcode Tag Generator
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Generate retail hang-tags and barcode labels with Size, Color &amp; MRP
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase text-slate-900">
              Select Apparel Style
            </h2>

            <div>
              <label
                htmlFor="apparel-product"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Garment Article
              </label>
              <select
                id="apparel-product"
                value={selectedProduct?.id || selectedProduct?._id || ''}
                onChange={(event) => {
                  const found = products.find(
                    (product) =>
                      String(product.id || product._id) === event.target.value
                  );
                  setSelectedProduct(found || null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs"
              >
                {products.map((product) => {
                  const productId = product.id || product._id;

                  return (
                    <option key={productId} value={productId}>
                      {product.name} (SKU: {product.sku || '—'})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedProduct && (
              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
                <p>
                  <strong>Brand:</strong>{' '}
                  {selectedProduct.custom_fields?.brand || 'LAX Couture'}
                </p>
                <p>
                  <strong>Available Sizes:</strong>{' '}
                  {selectedProduct.custom_fields?.sizes || 'S, M, L, XL'}
                </p>
                <p>
                  <strong>Colors:</strong>{' '}
                  {selectedProduct.custom_fields?.colors || 'Navy, Black'}
                </p>
                <p>
                  <strong>Selling Price:</strong> ₹
                  {Number(selectedProduct.selling_price || 0).toFixed(2)}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              disabled={!selectedProduct}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>Print Apparel Hang Tag</span>
            </button>
          </section>

          <section className="flex items-center justify-center">
            {selectedProduct ? (
              <HangTag product={selectedProduct} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No apparel products found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Add a product before generating a hang tag.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Kept outside the screen-only page wrapper so the print target is a
          direct, stable element for the print stylesheet. */}
      {selectedProduct && <HangTag product={selectedProduct} printTarget />}
    </>
  );
};

const HangTag = ({ product, printTarget = false }) => {
  const barcode =
    product.barcode ||
    product.barcode_number ||
    product.sku ||
    'No barcode';

  return (
    <article
      id={printTarget ? 'printable-hang-tag' : undefined}
      aria-label={printTarget ? 'Printable apparel hang tag' : 'Hang tag preview'}
      className={`relative w-64 space-y-3 overflow-hidden rounded-2xl border-2 border-slate-900 bg-white p-6 text-center shadow-xl ${
        printTarget ? 'hidden print:block' : ''
      }`}
    >
      <div className="mx-auto h-3 w-3 rounded-full border border-slate-400" />

      <p className="text-xs font-black uppercase tracking-widest text-indigo-700">
        {product.custom_fields?.brand || 'LAX APPAREL'}
      </p>

      <h2 className="line-clamp-1 text-sm font-extrabold text-slate-900">
        {product.name}
      </h2>

      <div className="flex items-center justify-around border-y border-dashed border-slate-300 py-2 text-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-400">
            Size
          </p>
          <p className="text-base font-black text-slate-900">
            {product.custom_fields?.sizes?.split(',')[0]?.trim() || 'L'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-400">
            Color
          </p>
          <p className="text-xs font-bold text-slate-800">
            {product.custom_fields?.colors?.split(',')[0]?.trim() || 'NAVY'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
        <div
          aria-hidden="true"
          className="flex h-10 items-center justify-center font-mono text-base font-black tracking-[4px] text-slate-800"
        >
          ||||| | ||||| | ||||
        </div>
        <p className="break-all font-mono text-[10px] font-bold text-slate-500">
          {barcode}
        </p>
      </div>

      <div>
        <p className="text-[10px] text-slate-400">MAX RETAIL PRICE</p>
        <p className="text-xl font-black text-slate-900">
          ₹{Number(product.selling_price || 0).toFixed(2)}
        </p>
        <p className="text-[9px] text-slate-400">
          (Inclusive of all GST taxes)
        </p>
      </div>
    </article>
  );
};

export const TextileExchanges = () => (
  <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
        Garment Exchanges &amp; Returns
      </h1>
      <p className="mt-1 text-xs text-slate-500">
        Manage size/color fit exchanges and credit adjustments
      </p>
    </header>

    <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
      <RefreshCw className="mx-auto mb-3 h-10 w-10 text-indigo-600" />
      <h2 className="text-base font-bold text-slate-900">
        Exchange Management Active
      </h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
        When customers request size adjustments (e.g. Size M to Size L), use
        the POS return toggle to exchange without modifying original tax
        compliance records.
      </p>
    </div>
  </div>
);