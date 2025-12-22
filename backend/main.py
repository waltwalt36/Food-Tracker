from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import requests
import psycopg2
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows all origins. You can specify your frontend's origin instead of "*" for more security.
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
    
# Replace these values with your actual database credentials
conn = psycopg2.connect(
    dbname="postgres",
    user="postgres",
    password="Waltjb0128",
    host="localhost",
    port="5432"
)

# Pydantic model: include all nutrient fields as optional floats
class EntryCreate(BaseModel):
    product_name: str
    barcode: Optional[str] = None
    calories_per_serving: int
    servings: float
    total_calories: int

    # Make these optional so requests won't fail if a key is missing
    fat: Optional[float] = 0.0
    saturated_fat: Optional[float] = 0.0
    trans_fat: Optional[float] = 0.0
    cholesterol: Optional[float] = 0.0
    sodium: Optional[float] = 0.0
    carbs: Optional[float] = 0.0
    fiber: Optional[float] = 0.0
    sugars: Optional[float] = 0.0
    added_sugars: Optional[float] = 0.0
    protein: Optional[float] = 0.0

# Your function to get a database connection
def get_db_connection():
        DATABASE_URL = os.environ.get("DATABASE_URL")
        if DATABASE_URL:
            return psycopg2.connect(DATABASE_URL)
        return psycopg2.connect(
            dbname=os.environ.get("DB_NAME", "postgres"),
            user=os.environ.get("DB_USER", "postgres"),
            password=os.environ.get("DB_PASS", "Waltjb0128"),
            host=os.environ.get("DB_HOST", "localhost"),
            port=os.environ.get("DB_PORT", "5432"),
    )

@app.post("/api/entries")
def create_entry(entry: EntryCreate):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        sql = """
        INSERT INTO entries
          (product_name, barcode, calories_per_serving, servings, total_calories,
           total_fat, saturated_fat, trans_fat, cholesterol, sodium,
           total_carbs, dietary_fiber, total_sugars, added_sugars, protein)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
        """

        # Use getattr to be defensive, but Pydantic gives defaults so getattr is extra-safe
        values = (
            entry.product_name,
            entry.barcode,
            entry.calories_per_serving,
            entry.servings,
            entry.total_calories,
            getattr(entry, "fat", 0.0),
            getattr(entry, "saturated_fat", 0.0),
            getattr(entry, "trans_fat", 0.0),
            getattr(entry, "cholesterol", 0.0),
            getattr(entry, "sodium", 0.0),
            getattr(entry, "carbs", 0.0),
            getattr(entry, "fiber", 0.0),
            getattr(entry, "sugars", 0.0),
            getattr(entry, "added_sugars", 0.0),
            getattr(entry, "protein", 0.0),
        )

        cur.execute(sql, values)
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"message": "Entry added", "id": str(new_id)}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()