import React, { useEffect, useState, useRef } from 'react';
import Quagga from 'quagga';
import axios from 'axios';
import ProductInfo from './ProductInfo';
import ManualBarcodeInput from './ManualBarcodeInput';
import DailySummary from "./components/DailySummary";

const BarcodeScanner = () => {
  const [product, setProduct] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [lastAddedEntry, setLastAddedEntry] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scannerReady, setScannerReady] = useState(false);
  const detectionBuffer = useRef([]);
  const REQUIRED_MATCHES = 5;

  // shared lookup function used by both scanner and manual input
  const lookupBarcode = async (Barcode) => {
    try {
      console.log('Looking up barcode:', Barcode);

      const response = await axios.post(
        'http://localhost:8000/lookup',
        { barcode: Barcode },
        {
          headers: { 'content-type': 'application/json' },
        }
      );

      console.log('Nutrition info:', response.data);

      // support different response shapes (your existing code already handled this)
      const p = response.data.product?.product ?? response.data.product;
      setProduct(p);
    } catch (error) {
      console.error('Error fetching nutrition info:', error);
      // optionally surface an error to the user; for now we just clear product
      setProduct(null);
    }
  };

  useEffect(() => {
    Quagga.init(
      {
      inputStream: {
        type: 'LiveStream',
        target: document.querySelector('#interactive'),
        constraints: {
          width: 640,
          height: 480,
        }
      },
      numOfWorkers: 2,
      locate: true,
      decoder: {
        readers: ['ean_reader', 'upc_reader']
      }
    }, (err) => {
      if (err) {
        console.error('Quagga init error:', err);
        setScanError(typeof err === 'string' ? err : (err?.message || JSON.stringify(err)));
        return;
      }
      console.log('Quagga started successfully');
      setScannerReady(true);
      Quagga.start();

      Quagga.onDetected((data) => {
        const code = data.codeResult.code;

        // collect into buffer; only accept when the same code appears REQUIRED_MATCHES times in a row
        detectionBuffer.current.push(code);
        if (detectionBuffer.current.length > REQUIRED_MATCHES) {
          detectionBuffer.current.shift();
        }

        const allMatch = detectionBuffer.current.length === REQUIRED_MATCHES &&
          detectionBuffer.current.every(c => c === code);

        if (allMatch) {
          console.log('Barcode confirmed:', code);
          detectionBuffer.current = [];
          lookupBarcode(code);
        }
      });
    });

    return () => {
      Quagga.stop();
      if (Quagga.offDetected) {
        try {
          Quagga.offDetected();
        } catch (e) {
          /* ignore if not supported */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>

      {/* Page title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--text)',
        }}>
          Scan a <span style={{ color: 'var(--accent)' }}>barcode</span>
        </h2>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 300 }}>
          Point your camera at a food barcode to log nutrition
        </p>
      </div>

      {/* Scanner — centered hero */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ width: '100%', maxWidth: 580 }}>

          {scanError && (
            <div style={{
              color: 'var(--red)',
              marginBottom: 12,
              padding: '12px 16px',
              background: 'var(--red-dim)',
              border: '1px solid rgba(224,107,107,0.25)',
              borderRadius: 'var(--radius)',
              fontSize: 14,
            }}>
              <strong>Camera error:</strong> {scanError}
            </div>
          )}

          {!scannerReady && !scanError && (
            <div style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 8,
              fontFamily: 'var(--font-mono)',
            }}>
              starting camera…
            </div>
          )}

          {/* Scanner frame */}
          <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {scannerReady && (
              <>
                <div className="scan-line" />
                <div className="scan-corner tl" />
                <div className="scan-corner tr" />
                <div className="scan-corner bl" />
                <div className="scan-corner br" />
              </>
            )}
            <div
              id="interactive"
              className="viewport"
              style={{ height: 400 }}
            />
          </div>

          {/* Status badge */}
          {scannerReady && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 10,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 6px var(--green)',
                display: 'inline-block',
              }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                scanner active
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Manual input — centered below scanner */}
      <div style={{ maxWidth: 580, margin: '0 auto 40px' }}>
        <ManualBarcodeInput onLookup={lookupBarcode} />
      </div>

      {/* Bottom row: Daily summary + Product info */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <DailySummary dailyGoal={2200} lastUpdated={lastUpdated} lastAddedEntry={lastAddedEntry} />
        </div>

        <div style={{ flex: 1 }}>
          {product ? (
            <ProductInfo product={product} onAdded={(createdEntry) => {
              console.log("BarcodeScanner: onAdded called with:", createdEntry);
              if (createdEntry) setLastAddedEntry(createdEntry);
              setLastUpdated(Date.now());
            }} />
          ) : (
            <div style={{
              padding: '32px 24px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              fontSize: 14,
            }}>
              Scan a product or type a barcode to see nutrition info
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
