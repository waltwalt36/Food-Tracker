from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, date, time, timedelta, timezone
from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
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

# ----------------------------------------------
# entry create class to add a certain item to db
# ----------------------------------------------

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

# ******************************************
# FUNCTION TO GET A DATABASE CONNECTION
# ******************************************

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

# Post request

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
 Query your database for the user
    # This is pseudocode; replace with your DB logic
    user_record = db.query(User).filter(User.email == email).first()        RETURNING id;
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

# ----------------------------------------
# entry out class to return a certain item
# ----------------------------------------

class EntryOut(BaseModel):
    id: str
    product_name: str
    barcode: Optional[str] = None
    calories_per_serving: int
    servings: float
    total_calories: int

    total_fat: Optional[float] = 0.0
    saturated_fat: Optional[float] = 0.0
    trans_fat: Optional[float] = 0.0
    cholesterol: Optional[float] = 0.0
    sodium: Optional[float] = 0.0
    total_carbs: Optional[float] = 0.0
    dietary_fiber: Optional[float] = 0.0
    total_sugars: Optional[float] = 0.0
    added_sugars: Optional[float] = 0.0
    protein: Optional[float] = 0.0

    timestamp: Optional[str]

@app.get("/api/entries", response_model=list[EntryOut])
def get_entries_by_date(date: str = Query(..., description="YYYY-MM-DD")):
    """
    Return list of entries for the given date (UTC day window).
    Date format: YYYY-MM-DD
    """
    # parse date
    try:
        qdate = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    # build UTC day range [start, end)
    start_dt = datetime.combine(qdate, time.min).replace(tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=1)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        sql = """
        SELECT id, product_name, barcode, calories_per_serving, servings, total_calories,
               total_fat, saturated_fat, trans_fat, cholesterol, sodium,
               total_carbs, dietary_fiber, total_sugars, added_sugars, protein,
               timestamp
        FROM entries
        WHERE timestamp >= %s AND timestamp < %s
        ORDER BY timestamp ASC;
        """
        cur.execute(sql, (start_dt, end_dt))
        rows = cur.fetchall()
        # map rows to dicts
        columns = [desc[0] for desc in cur.description]
        results = []
        for r in rows:
            obj = dict(zip(columns, r))
            # psycopg2 may return datetime with tzinfo or without; ensure it's ISO serializable
            if obj.get("timestamp") is not None:
                # make sure it's a timezone-aware ISO string
                ts = obj["timestamp"]
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                obj["timestamp"] = ts.isoformat()
            # convert UUIDs to str if necessary
            if obj.get("id") is not None:
                obj["id"] = str(obj["id"])
            results.append(obj)
        return results
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ---------------    
# DELETE ENDPOINT
# ---------------

@app.delete("/api/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: UUID):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        sql = "DELETE FROM entries WHERE id = %s RETURNING id;"
        cur.execute(sql, (str(entry_id),))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Entry not found")
        conn.commit()
        return None  # 204 no content
    except HTTPException:
        # re-raise expected HTTP errors
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# -----------------------------------
# USER VERIFICATION STUFF USING AUTH
# -----------------------------------

# Set up password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fake secret key for JWT signing (in production, keep this secret!)
SECRET_KEY = "Waltclem2006@"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ----------
# AUTH STUFF
# ----------

# OAuth2 with pass
# word flow
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

#function gets the user from db
def get_user(email: str):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE email = %s;", (email,))
            user_record = cur.fetchone()
            return user_record
    finally:
        conn.close()