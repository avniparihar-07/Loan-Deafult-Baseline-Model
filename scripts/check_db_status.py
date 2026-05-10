
import sys
import os
from sqlalchemy import create_engine, text

# Add the ml-service directory to sys.path to import from database.py
sys.path.append(os.path.join(os.getcwd(), 'ml-service'))

try:
    from database import DATABASE_URL
    print(f"Checking connection to: {DATABASE_URL}")
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("[SUCCESS] Database is reachable.")
        
        # Check tables
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result]
        print(f"Tables in DB: {tables}")
        
        if 'predictions' in tables:
            # Count records
            count_res = conn.execute(text("SELECT COUNT(*) FROM predictions"))
            count = count_res.scalar()
            print(f"Total records in 'predictions' table: {count}")
            
            # Show last 5 records
            if count > 0:
                print("\nLast 5 records:")
                records = conn.execute(text("SELECT id, full_name, email, created_at FROM predictions ORDER BY created_at DESC LIMIT 5"))
                for r in records:
                    print(f" - ID: {r[0]}, Name: {r[1]}, Email: {r[2]}, Created: {r[3]}")
        else:
            print("[WARNING] 'predictions' table not found.")
            
except Exception as e:
    print(f"[FAILURE] Database check failed: {e}")
