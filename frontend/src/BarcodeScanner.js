import React, { useEffect, useState } from 'react';
import Quagga from 'quagga';
import axios from 'axios';
import ProductInfo from './ProductInfo';

const BarcodeScanner = () => {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    Quagga.init({
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

    // variable to keep track of last time a barcode was scanned
    let lastScanTime = 0;
    // cool down time = 2 seconds or 2000 miliseconds
    const coolDown = 2000;

    Quagga.onDetected((data) => {
      const Barcode = data.codeResult.code;
      const now = Date.now()

      // if loop to check of scan was less than 2 seconds ago
      if (now - lastScanTime > coolDown){
        console.log('Barcode detected:', {
            Barcode
          })

        // Set lastScanTime to now
        lastScanTime = now;

        // Send the barcode to your FastAPI backend
        axios.post('http://localhost:8000/lookup', 
          { barcode: Barcode },
          {
            headers: {
              'content-type': 'application/json'
            }
          }
        )
        .then(response => {
          // leaving this console log for future debugging
          console.log('Nutrition info:', response.data);
          // Here you can update your component state with the nutrition info and display it
          const p = response.data.product?.product ?? response.data.product;
          setProduct(p);
        })
        .catch(error => {
          console.error('Error fetching nutrition info:', error);
        });
      }else{
        console.log('Scan ignored due to cooldown');
      }
    });

    return () => {
      Quagga.stop();
      if (Quagga.offDetected) {
        try { Quagga.offDetected(); } catch (e) { /* ignore if not supported */ }
      }
    };
  }, []);

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
          {product ? (
            <ProductInfo product={product} />
          ) : (
            <div style={{ padding: 12, color: '#666' }}>Scan a product to see nutrition info</div>
          )}
        </div>
      </div>
    </div>
  );
};



export default BarcodeScanner;
