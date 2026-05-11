import os
import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get DATABASE_URL — Railway provides 'postgres://', SQLAlchemy needs 'postgresql://'
# Falls back to local SQLite for development
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    # Build path relative to ml-service directory to work in both local and container environments
    _base_dir = os.path.join(os.path.dirname(__file__), '..') # ml-service/
    _data_dir = os.path.join(_base_dir, '..', 'data') # root/data/
    
    # Ensure the directory exists
    try:
        os.makedirs(_data_dir, exist_ok=True)
    except:
        # Fallback to local ml-service/data if root/data is not writable (e.g. in some containers)
        _data_dir = os.path.join(_base_dir, 'data')
        os.makedirs(_data_dir, exist_ok=True)

    _sqlite_path = os.path.abspath(os.path.join(_data_dir, 'local_dev.db'))
    DATABASE_URL = f'sqlite:///{_sqlite_path}'
    logger.warning(f"[DATABASE] Using local SQLite: {_sqlite_path}")
else:
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)


Base = declarative_base()

class PredictionRecord(Base):
    """Database model for storing loan predictions."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String)
    state = Column(String)
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
    
    # New Fields
    has_existing_loan = Column(String)
    existing_bank = Column(String)
    existing_rate = Column(Float)
    existing_purpose = Column(String)
    job_changes = Column(Integer, default=0)
    target_bank = Column(String)       # Bank the borrower is applying to
    industry = Column(String)          # Industry sector assigned during review
    loan_id = Column(String, unique=True, index=True)

    # Institutional Transaction Intelligence
    monthly_inflow = Column(Float, nullable=True)
    monthly_outflow = Column(Float, nullable=True)
    bounced_transactions = Column(Integer, default=0)
    salary_consistency = Column(String, default='High') # High | Medium | Low
    active_liabilities = Column(Float, nullable=True)
    existing_emi_burden = Column(Float, nullable=True)

    # Workflow columns
    application_type = Column(String, default='official')  # 'official' | 'simulation'
    status = Column(String, default='Pending')              # Pending | Under Review | Approved | Rejected
    assigned_rate = Column(Float, nullable=True)            # Bank-assigned interest rate
    bank_decision_note = Column(String, nullable=True)      # Bank analyst notes

    # Output features
    prediction = Column(Integer)
    default_probability = Column(Float)
    risk_score = Column(Integer)
    risk_category = Column(String)
    emi = Column(Float, nullable=True)      # Calculated Monthly Installment
    tenure = Column(Integer, nullable=True) # Approved tenure in months

class User(Base):
    """Database model for registered users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default='borrower') # 'bank' or 'borrower'
    bank_name = Column(String)         # For bank officers: which bank they work at
    officer_role = Column(String)      # For bank officers: their job title/role
    bank_role = Column(String, default='Analyst') # Analyst, Senior Analyst, Manager, Admin
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login_info = Column(String, nullable=True)
    otp_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Initialize Engine and Session
engine = None
SessionLocal = None
DB_AVAILABLE = False

_is_sqlite = DATABASE_URL.startswith('sqlite')

try:
    if _is_sqlite:
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={}
        )

    with engine.connect() as conn:
        logger.info("[OK] Successfully connected to database.")

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Run migrations to add missing columns (PostgreSQL + SQLite)
    def migrate_add_missing_columns():
        """Add any missing columns to existing tables."""
        new_columns = [
            ('job_changes',         'INTEGER DEFAULT 0'),
            ('application_type',    "VARCHAR DEFAULT 'official'"),
            ('status',              "VARCHAR DEFAULT 'Pending'"),
            ('assigned_rate',       'FLOAT'),
            ('bank_decision_note',  'VARCHAR'),
            ('target_bank',         'VARCHAR'),
            ('industry',            'VARCHAR'),
            ('loan_id',             'VARCHAR'),
            ('monthly_inflow',      'FLOAT'),
            ('monthly_outflow',     'FLOAT'),
            ('bounced_transactions','INTEGER DEFAULT 0'),
            ('salary_consistency',  'VARCHAR DEFAULT "High"'),
            ('active_liabilities',  'FLOAT'),
            ('existing_emi_burden', 'FLOAT'),
            ('risk_score',          'INTEGER'),
            ('emi',                 'FLOAT'),
            ('tenure',              'INTEGER'),
        ]
        try:
            inspector = inspect(engine)
            existing = [col['name'] for col in inspector.get_columns('predictions')]
            with engine.connect() as conn:
                for col_name, col_def in new_columns:
                    if col_name not in existing:
                        logger.info(f"Adding missing column '{col_name}' to predictions table...")
                        conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col_name} {col_def}"))
                        conn.commit()
                        logger.info(f"[OK] Column '{col_name}' added.")
        except Exception as e:
            logger.warning(f"Migration check failed (may already exist): {e}")

        # Run migrations for users table
        try:
            inspector = inspect(engine)
            existing_user_cols = [col['name'] for col in inspector.get_columns('users')]
            user_columns = [
                ('bank_name',       'VARCHAR'),
                ('officer_role',    'VARCHAR'),
                ('bank_role',       "VARCHAR DEFAULT 'Analyst'"),
                ('failed_attempts', 'INTEGER DEFAULT 0'),
                ('locked_until',    'TIMESTAMP'),
                ('last_login_info', 'VARCHAR'),
                ('otp_code',        'VARCHAR'),
            ]
            with engine.connect() as conn:
                for col_name, col_def in user_columns:
                    if col_name not in existing_user_cols:
                        logger.info(f"Adding missing column '{col_name}' to users table...")
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                        conn.commit()
                        logger.info(f"[OK] Column '{col_name}' added to users.")
        except Exception as e:
            logger.warning(f"User table migration check failed: {e}")

    migrate_add_missing_columns()

    DB_AVAILABLE = True

except OperationalError as e:
    logger.error(f"[DB ERROR] Cannot connect to database: {e}")
    DB_AVAILABLE = False

except Exception as e:
    logger.error(f"[DB ERROR] Unexpected error connecting to database: {e}")
    DB_AVAILABLE = False

def get_db():
    """Return an open database session, or None if DB is unavailable."""
    if not DB_AVAILABLE or SessionLocal is None:
        return None
    return SessionLocal()
