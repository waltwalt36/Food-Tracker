from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. You can specify your frontend's origin instead of "*" for more security.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BarcodeRequest(BaseModel):
    barcode: str

@app.post("/lookup")
def lookup(barcode_request: BarcodeRequest):
    # Replace with the actual API call to OpenFoodFacts or your chosen nutrition API
    print("Received data:", barcode_request)  # Log the received data
    response = requests.get(f"https://world.openfoodfacts.net/api/v2/product/{barcode_request.barcode}.json?fields=product_name,nutriments")
    if response.status_code == 200:
        data = response.json()
        # The external API may wrap the actual product details under a 'product' key
        # (e.g. {"product": { ... }}). Return that inner object when present so the
        # frontend receives an object with `product_name` and `nutriments`.
        return {"product": data.get('product', data)}
    else:
        raise HTTPException(status_code=404, detail="Product not found")

