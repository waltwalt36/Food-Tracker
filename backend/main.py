from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests

app = FastAPI()

class BarcodeRequest(BaseModel):
    barcode: str

@app.post("/lookup")
def lookup(barcode_request: BarcodeRequest):
    # Replace with the actual API call to OpenFoodFacts or your chosen nutrition API
    response = requests.get(f"https://world.openfoodfacts.net/api/v2/product/{barcode_request.barcode}.json?fields=product_name,nutriments")
    if response.status_code == 200:
        data = response.json()
        return {"product": data}
    else:
        raise HTTPException(status_code=404, detail="Product not found")

