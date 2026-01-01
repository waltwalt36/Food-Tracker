from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import FastAPI, HTTPException, Query, Depends, status
from datetime import datetime, date, time, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
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


# ----------
# AUTH STUFF
# ----------

# OAuth2 with pass
# word flow
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# -------------
# GET CURR USER
# -------------

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ******************************
# POST REQUEST FOR ENTRIES TABLE
# ******************************

@app.post("/api/entries", status_code=201)
def create_entry(entry: EntryCreate, current_user = Depends(get_current_user)):
    # --- DEBUG: show what we received (temporary; remove in prod) ---
    print(">>> create_entry called")
    print("current_user (raw):", repr(current_user))
    print("entry (pydantic):", entry.json())

    if current_user is None:
        # token invalid / missing — clear 401
        raise HTTPException(status_code=401, detail="Not authenticated")

    # extract user id robustly whether current_user is dict or object
    uid = None
    if isinstance(current_user, dict):
        uid = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
    else:
        uid = getattr(current_user, "id", None) or getattr(current_user, "user_id", None) or getattr(current_user, "sub", None)

    if uid is None:
        # no id found on current_user — return a clear error
        raise HTTPException(status_code=400, detail="Authenticated user has no id")

    # proceed with DB insert
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        sql = """
        INSERT INTO entries
          (user_id, product_name, barcode, calories_per_serving, servings, total_calories,
           total_fat, saturated_fat, trans_fat, cholesterol, sodium,
           total_carbs, dietary_fiber, total_sugars, added_sugars, protein, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
        RETURNING id;
        """

        values = (
            str(uid),
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

        print("SQL values:", values)
        cur.execute(sql, values)
        new_row = cur.fetchone()
        print("fetchone:", new_row)
        if new_row is None:
            conn.rollback()
            raise HTTPException(status_code=500, detail="Insert did not return id")
        new_id = new_row[0]
        conn.commit()
        return {"message": "Entry added", "id": str(new_id)}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print("create_entry exception:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ----------------------------------------
# ENTRY OUT CLASS TO RETURN A CERTAIN ITEM
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

# ---------------------------------    
# DELETE ENDPOINT FOR ENTRIES TABLE
# ---------------------------------

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

# ----------------------------------   
# DELETE ENDPOINT FOR ENTRIES TABLE
# ----------------------------------

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
SECRET_KEY = os.environ.get("SECRET_KEY", "Waltclem2006@")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h for dev

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    # Truncate to 72 characters for bcrypt
    if len(password) > 72:
        password = password[:72]
    return pwd_context.hash(password)

# -----------------------------------------------
# FUNCTION GETS USER INFORMATION USING USER EMAIL
# -----------------------------------------------

def get_user_by_email(email: str):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, email, password_hash FROM users WHERE email = %s;",
                (email,)
            )
            return cur.fetchone()
    finally:
        conn.close()


# -----------------------------------------------------
# HELPER FUNCTION CREATES USER USING EMAIL AND PASSWORD
# -----------------------------------------------------

def create_user(email: str, password: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            pwd_hash = hash_password(password)
            cur.execute(
                """
                INSERT INTO users (email, password_hash, created_at)
                VALUES (%s, %s, NOW())
                RETURNING id;
                """,
                (email, pwd_hash)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            return {"id": str(user_id), "email": email}
    finally:
        conn.close()

# --------------
# TOKEN CREATION
# --------------

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ------------
# SIGNUP ROUTE
# ------------

@app.post("/api/signup")
def signup(payload: dict):
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    if get_user_by_email(email):
        raise HTTPException(status_code=400, detail="User already exists")

    user = create_user(email, password)
    return {"message": "User created", "user": user}

# -----------
# LOGIN ROUTE
# -----------

@app.post("/api/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({
        "sub": str(user["id"]),
        "email": user["email"]
    })

    return {"access_token": token, "token_type": "bearer"}

# -----------
# GET ENTRIES
# -----------

@app.get("/api/entries")
def get_entries(date: str, current_user=Depends(get_current_user)):
    start = datetime.fromisoformat(date)
    end = start + timedelta(days=1)

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM entries
                WHERE user_id = %s
                AND timestamp >= %s
                AND timestamp < %s
                ORDER BY timestamp ASC;
                """,
                (current_user["id"], start, end)
            )
            return cur.fetchall()
    finally:
        conn.close()

# --------------
# DELETE ENTRIES
# --------------

@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: str, current_user=Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM entries
                WHERE id = %s AND user_id = %s;
                """,
                (entry_id, current_user["id"])
            )
            conn.commit()
            return {"message": "Entry deleted"}
    finally:
        conn.close()

# ----------
# GET TOKEN
# ----------
@app.get("/api/me")
def read_me(current_user = Depends(get_current_user)):
    try:
        payload = dict(current_user)
    except Exception:
        # if it's already a dict-like, make a shallow copy
        payload = current_user if isinstance(current_user, dict) else {"id": None, "email": None}
    # Optionally filter out sensitive fields before returning
    return {"id": payload.get("id"), "email": payload.get("email")}
