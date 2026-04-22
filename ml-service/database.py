import os
import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Replace with your actual PostgreSQL credentials
# Format: postgresql://username:password@host:port/database_name
# If you haven't set a password, it might just be 'postgres' or empty.
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:Stuti180207@localhost:5432/GroundZero')

Base = declarative_base()

class PredictionRecord(Base):
    """Database model for storing loan predictions."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Input features
    age = Column(Integer)
    income = Column(Float)
    loan_amount = Column(Float)
    credit_score = Column(Integer)
    months_employed = Column(Integer)
    num_credit_lines = Column(Integer)
    interest_rate = Column(Float)
    loan_term = Column(Integer)
    dti_ratio = Column(Float)
    education = Column(String)
    employment_type = Column(String)
    marital_status = Column(String)
    has_mortgage = Column(String)
    has_dependents = Column(String)
    loan_purpose = Column(String)
    has_cosigner = Column(String)
    
    # Output features
    prediction = Column(Integer)
    default_probability = Column(Float)
    risk_category = Column(String)

# Initialize Engine and Session
engine = None
SessionLocal = None
DB_AVAILABLE = False

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Test connection and create tables
    with engine.connect() as conn:
        logger.info("[OK] Successfully connected to PostgreSQL database.")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    DB_AVAILABLE = True

except OperationalError as e:
    logger.warning("[WARNING] Could not connect to PostgreSQL. Running in Memory-Only Mode.")
    logger.warning("Ensure PostgreSQL is running and credentials in database.py are correct.")
    DB_AVAILABLE = False
except Exception as e:
    logger.error(f"[ERROR] Database initialization error: {e}")
    DB_AVAILABLE = False

def get_db():
    """Return an open database session, or None if DB is unavailable."""
    if not DB_AVAILABLE or SessionLocal is None:
        return None
    return SessionLocal()
