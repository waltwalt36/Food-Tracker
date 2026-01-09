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
  const lastScanRef = useRef(0);
  const coolDown = 2000;

  // shared lookup function used by both scanner and manual input
  const lookupBarcode = async (Barcode) => {
    try {
      const now = Date.now();

      // if this call comes from scanner, we already check cooldown in onDetected,
      // but keep this here as a defensive check for manual calls too.
      if (now - lastScanRef.current < coolDown) {
        console.log('Lookup ignored due to cooldown');
        return;
      }

      // mark the time so subsequent calls are rate-limited
      lastScanRef.current = now;

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
        constraints: {
          width: 640,
          height: 480,
          facingMode: 'environment'
        }
      },
      decoder: {
        readers: ['ean_reader', 'upc_reader']
      }
    }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected((data) => {
      const Barcode = data.codeResult.code;
      const now = Date.now();

      // enforce cooldown using lastScanRef so manual and scanner share it
      if (now - lastScanRef.current > coolDown) {
        console.log('Barcode detected:', { Barcode });

        // update lastScanRef here (defensive; lookupBarcode will also set it)
        lastScanRef.current = now;

        // call shared lookup function
        lookupBarcode(Barcode);
      } else {
        console.log('Scan ignored due to cooldown');
      }
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
    <div>
      <h2>Scan a Barcode</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          id="interactive"
          className="viewport"
          style={{ flex: 1, minHeight: 360, background: '#FFF' }}
        />
        <div style={{ width: 360 }}>
          {/* DAILY SUMMARY: will refetch when lastUpdated changes */}
          <DailySummary dailyGoal={2200} lastUpdated={lastUpdated} lastAddedEntry={lastAddedEntry}/>

          {/* Manual barcode input wired to the same lookup function */}
          <div style={{ marginTop: 16 }}>
            <ManualBarcodeInput onLookup={lookupBarcode} />
          </div>

          <div style={{ marginTop: 12 }}>
            {product ? (
              <ProductInfo product={product} onAdded={(createdEntry) => {
                console.log("BarcodeScanner: onAdded called with:", createdEntry);
                if (createdEntry) {
                  // set lastAddedEntry so DailySummary can optimistically update
                  setLastAddedEntry(createdEntry);
                }
                // bump lastUpdated so DailySummary also refetches
                setLastUpdated(Date.now());
              }}
            />
            ) : (
              <div style={{ padding: 12, color: '#666' }}>
                Scan a product or type a barcode to see nutrition info
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
