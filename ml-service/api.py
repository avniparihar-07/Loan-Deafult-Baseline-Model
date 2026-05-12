"""
Flask REST API for the Loan Default Prediction Model.
Provides endpoints for single prediction, batch prediction, 
model info, and feature importance.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
import logging
from dotenv import load_dotenv
import bcrypt
import re
import random

# Load environment variables from .env
load_dotenv()

from core.database import get_db, PredictionRecord, User
from services.mailer import send_loan_email

logger = logging.getLogger(__name__)

# Track OTP cooldowns to prevent multiple emails (email -> last_sent_time)
otp_cooldowns = {}

# --- Security Helpers ---
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except:
        return False

def is_institutional_email(email):
    personal_domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com']
    domain = email.split('@')[-1].lower()
    return domain not in personal_domains

def validate_password_complexity(password):
    if len(password) < 8: return False
    if not re.search(r"[A-Z]", password): return False
    if not re.search(r"[a-z]", password): return False
    if not re.search(r"\d", password): return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): return False
    return True

def is_authorized_officer(email):
    authorized_emails = ["thakkerstuti947@hdfc.com", "avniparihar07@icici.com"]
    return email.lower() in authorized_emails

# --- App Setup ---
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')
def get_cors_origins():
    configured = os.getenv('CORS_ORIGINS') or os.getenv('FRONTEND_URL') or ''
    origins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:5178',
        'http://localhost:5179',
        'http://localhost:5180',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176',
        'http://127.0.0.1:5177',
        'http://127.0.0.1:5178',
        'https://groundzero-tawny.vercel.app',
        'https://groundzero-tauny.vercel.app',
        'https://loan-default-backend-production.up.railway.app',
    ]
    origins.extend(origin.strip().rstrip('/') for origin in configured.split(',') if origin.strip())
    return sorted(set(origins))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app, supports_credentials=True, resources={r"*": {"origins": get_cors_origins()}})

# --- Load Model Artifacts ---
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model_artifacts')


def provision_officers():
    """Ensure authorized officers exist in the database with institutional roles."""
    db = get_db()
    if not db: return
    try:
        officers = [
            {"email": "thakkerstuti947@hdfc.com", "first": "Stuti", "last": "Thakker"},
            {"email": "avniparihar07@icici.com", "first": "Avni", "last": "Parihar"}
        ]
        for off in officers:
            existing = db.query(User).filter(User.email == off['email']).first()
            if not existing:
                new_off = User(
                    email=off['email'],
                    first_name=off['first'],
                    last_name=off['last'],
                    password=hash_password("123456Stuti"),
                    role='bank',
                    bank_name="HDFC Bank" if "hdfc" in off['email'] else "ICICI Bank",
                    officer_role="Senior Analyst",
                    bank_role="Admin"
                )
                db.add(new_off)
            else:
                # Update password for existing to match user request
                existing.password = hash_password("123456Stuti")
                existing.role = 'bank'
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error provisioning officers: {e}")
    finally:
        db.close()

# Run provisioning
provision_officers()

def load_model():
    """Load model artifacts from disk."""
    model = joblib.load(os.path.join(MODEL_DIR, 'logistic_model.pkl'))
    scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    feature_names = joblib.load(os.path.join(MODEL_DIR, 'feature_names.pkl'))
    metadata = joblib.load(os.path.join(MODEL_DIR, 'metadata.pkl'))
    return model, scaler, feature_names, metadata


try:
    model, scaler, feature_names, metadata = load_model()
    MODEL_LOADED = True
    print("[OK] Model artifacts loaded successfully.")
except Exception as e:
    MODEL_LOADED = False
    print(f"[ERROR] Failed to load model: {e}")
    print("  Run train_model.py first to generate model artifacts.")


# --- Risk Category Assignment ---
def get_risk_category(probability):
    """Assign risk category based on default probability."""
    if probability < 0.3:
        return 'Low'
    elif probability < 0.6:
        return 'Medium'
    else:
        return 'High'


def get_risk_color(category):
    """Return color for risk category."""
    colors = {'Low': '#10b981', 'Medium': '#f59e0b', 'High': '#ef4444'}
    return colors.get(category, '#6b7280')


# --- Feature Preparation ---
def prepare_features(data):
    """
    Take raw user input and transform it into model-ready features.
    This mirrors the preprocessing done during training.
    """
    # Create a DataFrame from input
    df = pd.DataFrame([data])

    # Ensure numeric types
    numeric_fields = ['Age', 'Income', 'LoanAmount', 'CreditScore',
                      'MonthsEmployed', 'NumCreditLines', 'InterestRate',
                      'LoanTerm', 'DTIRatio']
    # Fill optional numeric fields with defaults if missing
    defaults = {'DTIRatio': 0.3, 'MonthsEmployed': 12, 'NumCreditLines': 1}
    for field, val in defaults.items():
        if pd.isna(df[field].iloc[0]):
            df[field] = val

    invalid_numeric = [
        field for field in numeric_fields
        if pd.isna(df[field].iloc[0]) or not np.isfinite(df[field].iloc[0])
    ]
    if invalid_numeric:
        raise ValueError(f"Invalid numeric values for: {', '.join(invalid_numeric)}")

    if df['Income'].iloc[0] <= 0:
        raise ValueError("Income must be greater than 0")
    if df['LoanAmount'].iloc[0] <= 0:
        raise ValueError("LoanAmount must be greater than 0")
    if df['LoanTerm'].iloc[0] <= 0:
        raise ValueError("LoanTerm must be greater than 0")
    if df['DTIRatio'].iloc[0] < 0 or df['DTIRatio'].iloc[0] > 1:
        raise ValueError("DTIRatio must be between 0 and 1")

    age = df['Age'].iloc[0]
    if age < 18:
        raise ValueError("You must be at least 18 years old to apply for a loan.")
    if not float(age).is_integer():
        raise ValueError("Age must be a whole number.")

    # Feature Engineering
    df['Loan_Income_Ratio'] = df['LoanAmount'] / df['Income']
    df['Estimated_EMI'] = df['LoanAmount'] / df['LoanTerm']
    df['EMI_Income_Ratio'] = df['Estimated_EMI'] / df['Income']

    # Income Group
    income = df['Income'].iloc[0]
    if income <= 40000:
        income_group = 'Low Income'
    elif income <= 80000:
        income_group = 'Medium Income'
    else:
        income_group = 'High Income'

    # One-hot encode categorical variables
    categorical_mappings = {
        'Education': ["High School", "Master's", "PhD"],
        'EmploymentType': ["Part-time", "Self-employed", "Unemployed"],
        'MaritalStatus': ["Married", "Single"],
        'HasMortgage': ["Yes"],
        'HasDependents': ["Yes"],
        'LoanPurpose': ["Business", "Education", "Home", "Other"],
        'HasCoSigner': ["Yes"],
        'Income_Group': ["Medium Income", "High Income"]
    }

    # Initialize all one-hot columns to 0
    for col, categories in categorical_mappings.items():
        for cat in categories:
            col_name = f"{col}_{cat}"
            df[col_name] = 0

    # Set the correct one-hot values
    for col in ['Education', 'EmploymentType', 'MaritalStatus', 'LoanPurpose']:
        val = data.get(col, '')
        col_name = f"{col}_{val}"
        if col_name in df.columns:
            df[col_name] = 1

    for col in ['HasMortgage', 'HasDependents', 'HasCoSigner']:
        if data.get(col, 'No') == 'Yes':
            df[f"{col}_Yes"] = 1

    # Income group encoding
    if income_group == 'Medium Income':
        df['Income_Group_Medium Income'] = 1
    elif income_group == 'High Income':
        df['Income_Group_High Income'] = 1

    # Drop original categorical columns
    cols_to_drop = ['Education', 'EmploymentType', 'MaritalStatus',
                    'HasMortgage', 'HasDependents', 'LoanPurpose',
                    'HasCoSigner', 'Income_Group']
    for col in cols_to_drop:
        if col in df.columns:
            df = df.drop(columns=[col])

    # Reorder to match training features
    for feat in feature_names:
        if feat not in df.columns:
            df[feat] = 0

    df = df[feature_names]

    return df


# ========================
# API ENDPOINTS
# ========================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': MODEL_LOADED,
        'version': '1.0.0'
    })


# --- Auth Routes ---
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500
    
    try:
        # Check if user exists
        email = data.get('email', '').lower()
        password = data.get('password')
        role = data.get('role', 'borrower')

        if role == 'bank' and not is_institutional_email(email):
            return jsonify({'error': 'Institutional access requires a corporate email (Gmail/Yahoo not allowed).'}), 400

        if not validate_password_complexity(password):
            return jsonify({'error': 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'}), 400

        existing = db.query(User).filter(User.email == email).first()
        if existing: return jsonify({'error': 'User already exists'}), 400
        
        new_user = User(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=email,
            password=hash_password(password),
            role=role,
            bank_name=data.get('bank_name'),
            officer_role=data.get('officer_role'),
            bank_role=data.get('bank_role', 'Analyst')
        )
        db.add(new_user)
        db.commit()
        return jsonify({'message': 'Account created successfully. Please login.'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500
    
    try:
        email = data.get('email', '').lower()
        password = data.get('password')
        role = data.get('role', 'borrower') # Identify if trying to log into bank or borrower portal

        user = db.query(User).filter(User.email == email).first()
        
        # 1. Institutional Bank Portal Access (Restricted)
        if role == 'bank':
            if not is_authorized_officer(email):
                return jsonify({'error': 'Access restricted. Only authorized institutional officers can access this portal.'}), 403
            
            if user and user.role != 'bank':
                return jsonify({'error': 'Access restricted. This account is registered as a Borrower. Please use the Borrower Portal.'}), 403
            
            if not user:
                return jsonify({'error': 'Access restricted. No institutional account found for this email.'}), 403

        # 2. Public Borrower Portal Access (Unrestricted)
        # We allow ANY user (even those with 'bank' role) to log in here if they want, 
        # but normally they will be borrowers. We do NOT check whitelist here.
        
        if not user: 
            return jsonify({'error': 'Access Denied: Account not found.'}), 404
        
        # Check lockout
        if user.locked_until and user.locked_until > datetime.utcnow():
            diff = (user.locked_until - datetime.utcnow()).seconds // 60
            return jsonify({'error': f'Account locked due to multiple failed attempts. Try again in {diff + 1} minutes.'}), 403

        # Verify password (handles migration from plain text if necessary)
        is_correct = False
        if user.password.startswith('$2b$'): # Bcrypt hash
            is_correct = check_password(password, user.password)
        else:
            is_correct = (user.password == password)
            if is_correct: # Auto-migrate to hash
                user.password = hash_password(password)
                db.commit()

        if not is_correct:
            # 1. Bank Officer Security (Strict Tracking)
            if user.role == 'bank':
                user.failed_attempts = (user.failed_attempts or 0) + 1
                if user.failed_attempts >= 5:
                    from datetime import timedelta
                    user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                    user.failed_attempts = 0
                    db.commit()
                    return jsonify({'error': 'Institutional account locked for 15 minutes after 5 failed attempts.'}), 403
                db.commit()
                return jsonify({'error': f'Invalid credentials. {5 - user.failed_attempts} attempts remaining.'}), 401
            
            # 2. Borrower Security (Simple Flow)
            return jsonify({'error': 'Invalid email or password.'}), 401
        
        # Reset failed attempts on success
        if user.role == 'bank':
            user.failed_attempts = 0
            db.commit()
        
        # Handle Bank OTP (Only for Bank Portal)
        if role == 'bank' and user.role == 'bank':
            now = datetime.utcnow()
            last_sent = otp_cooldowns.get(user.email)
            
            if last_sent and (now - last_sent).total_seconds() < 10:
                # Still within cooldown, don't generate new one, just tell frontend OTP is required
                return jsonify({
                    'otp_required': True,
                    'email': user.email,
                    'message': 'OTP already sent. Please check your email.'
                })

            otp = f"{random.randint(100000, 999999)}"
            user.otp_code = otp
            otp_cooldowns[user.email] = now
            
            # Store login info
            ua = request.headers.get('User-Agent', 'Unknown')
            user.last_login_info = f"Access from {ua[:50]} on {datetime.utcnow().strftime('%Y-%m-%d')}"
            db.commit()
            
            # Send OTP via mock mailer
            send_loan_email('update', user.first_name, 'LOGIN', {
                'message': f"Your secure login OTP is: {otp}. This code expires in 5 minutes."
            })
            
            return jsonify({
                'otp_required': True,
                'email': user.email,
                'message': 'OTP sent to your institutional email.'
            })

        # Borrower direct login
        return jsonify({
            'first': user.first_name,
            'last': user.last_name,
            'email': user.email,
            'type': user.role,
            'last_login': user.last_login_info
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email', '').lower()
    otp = data.get('otp')
    
    db = get_db()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or user.otp_code != otp:
            return jsonify({'error': 'Invalid or expired OTP'}), 401
        
        # Clear OTP on success
        user.otp_code = None
        db.commit()
        
        return jsonify({
            'first': user.first_name,
            'last': user.last_name,
            'email': user.email,
            'type': user.role,
            'bank_name': user.bank_name,
            'officer_role': user.officer_role,
            'bank_role': user.bank_role,
            'last_login': user.last_login_info
        })
    finally:
        db.close()


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500
    
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # For security, don't reveal if user exists, but here we can be helpful
            return jsonify({'error': 'Account not found'}), 404
        
        # In a real app, generate a secure token and store it. 
        # For this baseline, we'll send a "magic link" or just a simple verification.
        # We'll use their existing password as a "token" hint for the demo reset flow 
        # (NOT secure for production, but works for the prototype)
        
        from services.mailer import send_loan_email
        send_loan_email('reset_password', user.first_name, 'N/A', {
            'email': email,
            'token': 'RESET-' + email.split('@')[0].upper() # Simple mock token
        })
        
        return jsonify({'message': 'Reset instructions sent to your email'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    token = data.get('token')
    new_password = data.get('new_password')
    
    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500
    
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user: return jsonify({'error': 'User not found'}), 404
        
        # Verify mock token
        expected_token = 'RESET-' + email.split('@')[0].upper()
        if token != expected_token:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
            
        user.password = new_password
        db.commit()
        return jsonify({'message': 'Password updated successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/predict', methods=['POST'])
def predict():
    """Single loan default prediction."""
    if not MODEL_LOADED:
        return jsonify({'error': 'Model not loaded. Run train_model.py first.'}), 503

    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No input data provided'}), 400

        # Validate required fields (CreditScore and DTIRatio removed from here)
        required_fields = ['Age', 'Income', 'LoanAmount', 
                           'MonthsEmployed', 'NumCreditLines', 'InterestRate',
                           'LoanTerm', 'Education', 'EmploymentType',
                           'MaritalStatus', 'HasMortgage', 'HasDependents',
                           'LoanPurpose', 'HasCoSigner']

        missing = [f for f in required_fields if f not in data or data[f] == '']
        if missing:
            return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

        # Prepare features
        try:
            features_df = prepare_features(data)
        except ValueError as validation_error:
            return jsonify({'error': str(validation_error)}), 400
        features_scaled = scaler.transform(features_df)

        # Predict
        probability = model.predict_proba(features_scaled)[0][1]
        prediction = int(probability >= 0.5)
        risk_category = get_risk_category(probability)

        # Get feature contributions (coefficient × feature value)
        coefficients = model.coef_[0]
        feature_values = features_scaled[0]
        contributions = coefficients * feature_values
        top_factors_idx = np.argsort(np.abs(contributions))[::-1][:5]

        top_risk_factors = []
        for idx in top_factors_idx:
            factor_name = feature_names[idx]
            factor_impact = float(contributions[idx])
            top_risk_factors.append({
                'feature': factor_name,
                'impact': factor_impact,
                'direction': 'increases risk' if factor_impact > 0 else 'decreases risk'
            })

        response = {
            'prediction': prediction,
            'prediction_label': 'Default' if prediction == 1 else 'Non-Default',
            'default_probability': round(float(probability), 4),
            'risk_category': risk_category,
            'risk_color': get_risk_color(risk_category),
            'confidence': round(float(max(probability, 1 - probability)), 4),
            'top_risk_factors': top_risk_factors,
            'input_summary': {
                'loan_income_ratio': round(float(data['LoanAmount']) / float(data['Income']), 2),
                'estimated_emi': round(float(data['LoanAmount']) / float(data['LoanTerm']), 2),
            }
        }

        db = get_db()
        if db:
            try:
                from datetime import datetime
                full_name = data.get('FullName', 'Anonymous').strip()
                email = data.get('Email', 'anonymous@example.com').strip()
                job_changes = int(data.get('JobChanges', 0))
                created_at = datetime.utcnow()

                logger.info(f"[Simulation] NOT saving to DB — simulation only")
            except Exception as db_e:
                logger.error(f"Simulation log error: {db_e}", exc_info=True)
            finally:
                db.close()

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/apply', methods=['POST'])
def submit_application():
    """Official borrower application submission — no interest rate, no ML yet."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    required = ['FullName', 'Email', 'Age', 'Income', 'LoanAmount', 'LoanTerm',
                'Education', 'EmploymentType', 'MaritalStatus',
                'HasMortgage', 'HasDependents', 'LoanPurpose', 'HasCoSigner']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    # Generate unique Loan ID: GZ-2026-X1Y2
    import random
    import string
    year = datetime.utcnow().year
    rand_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    loan_id = f"GZ-{year}-{rand_part}"

    age = data.get('Age')
    try:
        age_val = float(age)
        if age_val < 18:
            return jsonify({'error': 'You must be at least 18 years old to apply for a loan.'}), 400
        if not age_val.is_integer():
            return jsonify({'error': 'Age must be a whole number.'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid age provided.'}), 400

    db = get_db()
    if not db:
        return jsonify({'error': 'DB offline'}), 500

    try:
        record = PredictionRecord(
            full_name=str(data.get('FullName', '')).strip(),
            email=str(data.get('Email', '')).strip(),
            state=str(data.get('State', 'MH')),
            loan_id=loan_id,
            created_at=datetime.utcnow(),
            age=int(data.get('Age', 0)),
            income=float(data.get('Income', 0)),
            loan_amount=float(data.get('LoanAmount', 0)),
            credit_score=int(data.get('CreditScore', 0)) if data.get('CreditScore') else 0,
            months_employed=int(data.get('MonthsEmployed', 0)),
            num_credit_lines=int(data.get('NumCreditLines', 0)),
            interest_rate=None,            # NOT set by borrower
            loan_term=int(data.get('LoanTerm', 24)),
            dti_ratio=float(data.get('DTIRatio', 0)),
            education=str(data.get('Education', '')),
            employment_type=str(data.get('EmploymentType', '')),
            marital_status=str(data.get('MaritalStatus', '')),
            has_mortgage=str(data.get('HasMortgage', 'No')),
            has_dependents=str(data.get('HasDependents', 'No')),
            loan_purpose=str(data.get('LoanPurpose', 'Other')),
            has_cosigner=str(data.get('HasCoSigner', 'No')),
            has_existing_loan=str(data.get('HasExistingLoan', 'No')),
            existing_bank=str(data.get('ExistingBank', '')),
            existing_rate=float(data.get('ExistingRate', 0)),
            existing_purpose=str(data.get('ExistingPurpose', '')),
            job_changes=int(data.get('JobChanges', 0)),
            target_bank=str(data.get('TargetBank', '')),
            application_type='official',
            status='Pending',
            prediction=None,
            default_probability=None,
            risk_category=None,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info(f"Official application saved: id={record.id}, email={record.email}")
        
        # Send confirmation email
        try:
            send_loan_email('update', record.full_name, record.id, {
                'message': f"We have received your loan application for ₹{record.loan_amount:,.2f}. Our team is currently reviewing your profile."
            })
        except Exception as e:
            logger.error(f"Failed to send application confirmation email: {e}")

        return jsonify({'message': 'Application submitted successfully', 'id': record.id})
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save application: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/applications/<int:app_id>/analyze', methods=['POST'])
def analyze_application(app_id):
    """Run dynamic ML risk assessment and calculate EMI based on officer input."""
    if not MODEL_LOADED:
        return jsonify({'error': 'Model not loaded'}), 503

    data = request.get_json() or {}
    assigned_rate = data.get('assigned_rate')
    if assigned_rate is None:
        return jsonify({'error': 'Interest rate is required for analysis'}), 400

    db = get_db()
    if not db:
        return jsonify({'error': 'DB offline'}), 500

    try:
        record = db.query(PredictionRecord).filter(PredictionRecord.id == app_id).first()
        if not record:
            return jsonify({'error': 'Application not found'}), 404

        rate = float(assigned_rate)
        term = record.loan_term or 36
        amount = record.loan_amount

        # EMI Calculation: [P x R x (1+R)^N]/[(1+R)^N-1]
        monthly_rate = rate / (12 * 100)
        emi = (amount * monthly_rate * pow(1 + monthly_rate, term)) / (pow(1 + monthly_rate, term) - 1)

        # ML Prediction
        ml_data = {
            'Age': record.age, 'Income': record.income,
            'LoanAmount': record.loan_amount, 'CreditScore': record.credit_score or 600,
            'MonthsEmployed': record.months_employed, 'NumCreditLines': record.num_credit_lines or 1,
            'InterestRate': rate,
            'LoanTerm': term, 'DTIRatio': record.dti_ratio or 0,
            'Education': record.education or "Bachelor's",
            'EmploymentType': record.employment_type or 'Full-time',
            'MaritalStatus': record.marital_status or 'Single',
            'HasMortgage': record.has_mortgage or 'No',
            'HasDependents': record.has_dependents or 'No',
            'LoanPurpose': record.loan_purpose or 'Other',
            'HasCoSigner': record.has_cosigner or 'No',
        }
        features_df = prepare_features(ml_data)
        features_scaled = scaler.transform(features_df)
        probability = float(model.predict_proba(features_scaled)[0][1])
        
        # Demo-optimized Risk Category (Professional ranges)
        risk_cat = "Low Risk"
        if probability > 0.6: risk_cat = "High Risk"
        elif probability > 0.3: risk_cat = "Medium Risk"
        
        risk_score = int(850 - (probability * 400))

        # Institutional Recommendation
        recommendation = "Standard Approval Recommended"
        if probability > 0.5: recommendation = "Decline Suggested"
        elif probability > 0.2: recommendation = "Manual Review Required"

        return jsonify({
            'default_probability': round(probability * 100, 1),
            'risk_score': risk_score,
            'emi': round(emi, 2),
            'risk_category': risk_cat,
            'recommendation': recommendation,
            'assigned_rate': rate
        })
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/applications/<int:app_id>/review', methods=['POST'])
def review_application(app_id):
    """Bank analyst: assign rate, set decision status, and persist analysis."""
    if not MODEL_LOADED:
        return jsonify({'error': 'Model not loaded'}), 503

    data = request.get_json() or {}
    db = get_db()
    if not db:
        return jsonify({'error': 'DB offline'}), 500

    try:
        record = db.query(PredictionRecord).filter(PredictionRecord.id == app_id).first()
        if not record:
            return jsonify({'error': 'Application not found'}), 404

        reviewer_bank = data.get('bank_name', '').strip()
        if not reviewer_bank or record.target_bank != reviewer_bank:
            return jsonify({'error': 'Unauthorized Access'}), 403

        decision = data.get('decision')
        note = data.get('note', '')
        assigned_rate = data.get('assigned_rate')
        
        # Capture analysis results from frontend if provided
        prob_pct = data.get('default_probability')
        risk_score = data.get('risk_score')
        risk_cat = data.get('risk_category')

        if assigned_rate is not None:
            record.assigned_rate = float(assigned_rate)
            record.interest_rate = float(assigned_rate)
            
        if prob_pct is not None:
            record.default_probability = float(prob_pct) / 100
        
        if risk_score is not None:
            record.risk_score = int(risk_score)
            
        if risk_cat is not None:
            record.risk_category = risk_cat

        emi_val = data.get('emi')
        if emi_val is not None:
            record.emi = float(emi_val)
            
        tenure_val = data.get('tenure')
        if tenure_val is not None:
            record.tenure = int(tenure_val)

        if decision:
            record.status = decision
            if decision == 'Approved':
                record.application_type = 'official'
        
        if note:
            record.bank_decision_note = note
            
        industry_val = data.get('industry')
        if industry_val:
            record.industry = industry_val

        db.commit()
        db.refresh(record)

        if decision in ['Approved', 'Rejected', 'Additional Verification Required']:
            try:
                email_type = 'approved' if decision == 'Approved' else 'rejected'
                if decision == 'Additional Verification Required':
                    email_type = 'verification_requested'
                send_loan_email(email_type if email_type != 'verification_requested' else 'general', 
                               record.full_name, record.id, {'reason': note, 'status': decision})
            except: pass

        return jsonify({'success': True, 'id': record.id, 'status': record.status})
    except Exception as e:
        db.rollback()
        logger.error(f"Review failed: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/applications', methods=['GET'])
def get_applications():
    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500

    # Bank officers MUST provide their bank_name to see applications
    bank_filter = request.args.get('bank_name', '').strip()
    
    # SECURITY: If no bank_name is provided, return empty list (Privacy by default)
    if not bank_filter:
        return jsonify([])

    # Search filter
    search_query = request.args.get('search', '').strip()

    try:
        query = db.query(PredictionRecord).filter(
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank == bank_filter
        )
        
        if search_query:
            from sqlalchemy import or_
            query = query.filter(or_(
                PredictionRecord.full_name.ilike(f"%{search_query}%"),
                PredictionRecord.loan_id.ilike(f"%{search_query}%"),
                PredictionRecord.email.ilike(f"%{search_query}%")
            ))

        query = query.order_by(PredictionRecord.created_at.desc()).limit(100)
        
        records = query.all()
        result = []
        for r in records:
            # Safe serialization to prevent 500 on Null/Missing fields
            result.append({
                'id': getattr(r, 'id', None),
                'loan_id': getattr(r, 'loan_id', 'N/A'),
                'full_name': getattr(r, 'full_name', 'Anonymous'),
                'email': getattr(r, 'email', ''),
                'state': getattr(r, 'state', 'MH'),
                'age': getattr(r, 'age', 0),
                'income': getattr(r, 'income', 0),
                'loan_amount': getattr(r, 'loan_amount', 0),
                'credit_score': getattr(r, 'credit_score', 0),
                'loan_purpose': getattr(r, 'loan_purpose', 'Other'),
                'risk_category': getattr(r, 'risk_category', 'Pending'),
                'probability': getattr(r, 'default_probability', 0),
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'has_existing_loan': getattr(r, 'has_existing_loan', 'No'),
                'existing_bank': getattr(r, 'existing_bank', ''),
                'existing_rate': getattr(r, 'existing_rate', 0),
                'existing_purpose': getattr(r, 'existing_purpose', ''),
                'dti': getattr(r, 'dti_ratio', 0),
                'term': getattr(r, 'loan_term', 24),
                'interest_rate': getattr(r, 'interest_rate', None),
                'assigned_rate': getattr(r, 'assigned_rate', None),
                'status': getattr(r, 'status', 'Pending') or 'Pending',
                'bank_decision_note': getattr(r, 'bank_decision_note', ''),
                'employment_type': getattr(r, 'employment_type', 'Full-time'),
                'months_employed': getattr(r, 'months_employed', 0),
                'job_changes': getattr(r, 'job_changes', 0),
                'has_cosigner': getattr(r, 'has_cosigner', 'No'),
                'education': getattr(r, 'education', "Bachelor's"),
                'marital_status': getattr(r, 'marital_status', 'Single'),
                'has_mortgage': getattr(r, 'has_mortgage', 'No'),
                'has_dependents': getattr(r, 'has_dependents', 'No'),
                'prediction': getattr(r, 'prediction', None),
                'target_bank': getattr(r, 'target_bank', ''),
                'num_credit_lines': getattr(r, 'num_credit_lines', 0),
                'emi': getattr(r, 'emi', 0),
                'approved_tenure': getattr(r, 'tenure', getattr(r, 'loan_term', 24)),
            })
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Database query failed: {str(e)}'}), 500
    finally:
        db.close()


@app.route('/api/my-applications', methods=['GET'])
def get_my_applications():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email required'}), 400
    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500
    try:
        records = db.query(PredictionRecord).filter(
            PredictionRecord.email == email,
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank != None,
            PredictionRecord.target_bank != ''
        ).order_by(PredictionRecord.created_at.desc()).all()
        result = []
        for r in records:
            result.append({
                'id': getattr(r, 'id', None),
                'loan_id': getattr(r, 'loan_id', 'N/A'),
                'full_name': getattr(r, 'full_name', 'Anonymous'),
                'email': getattr(r, 'email', email),
                'state': getattr(r, 'state', 'MH'),
                'age': getattr(r, 'age', 0),
                'income': getattr(r, 'income', 0),
                'loan_amount': getattr(r, 'loan_amount', 0),
                'credit_score': getattr(r, 'credit_score', 0),
                'loan_purpose': getattr(r, 'loan_purpose', 'Other'),
                'risk_category': getattr(r, 'risk_category', 'Pending'),
                'probability': getattr(r, 'default_probability', 0),
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'has_existing_loan': getattr(r, 'has_existing_loan', 'No'),
                'existing_bank': getattr(r, 'existing_bank', ''),
                'existing_rate': getattr(r, 'existing_rate', 0),
                'existing_purpose': getattr(r, 'existing_purpose', ''),
                'dti': getattr(r, 'dti_ratio', 0),
                'term': getattr(r, 'loan_term', 24),
                'interest_rate': getattr(r, 'interest_rate', None),
                'assigned_rate': getattr(r, 'assigned_rate', None),
                'status': getattr(r, 'status', 'Pending') or 'Pending',
                'bank_decision_note': getattr(r, 'bank_decision_note', ''),
                'employment_type': getattr(r, 'employment_type', 'Full-time'),
                'months_employed': getattr(r, 'months_employed', 0),
                'job_changes': getattr(r, 'job_changes', 0),
                'has_cosigner': getattr(r, 'has_cosigner', 'No'),
                'education': getattr(r, 'education', "Bachelor's"),
                'marital_status': getattr(r, 'marital_status', 'Single'),
                'has_mortgage': getattr(r, 'has_mortgage', 'No'),
                'has_dependents': getattr(r, 'has_dependents', 'No'),
                'prediction': getattr(r, 'prediction', None),
                'target_bank': getattr(r, 'target_bank', ''),
                'num_credit_lines': getattr(r, 'num_credit_lines', 0),
                'emi': getattr(r, 'emi', 0),
                'approved_tenure': getattr(r, 'tenure', getattr(r, 'loan_term', 24)),
            })
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/send-communication', methods=['POST'])
def send_communication():
    """Manual communication endpoint for bank officers."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    app_id = data.get('app_id')
    subject = data.get('subject')
    body = data.get('body')
    borrower_name = data.get('borrower_name', 'Applicant')

    if not body:
        return jsonify({'error': 'Message body is required'}), 400

    try:
        # We reuse the 'update' template for manual communication
        send_loan_email('update', borrower_name, app_id or 'N/A', {
            'message': body
        })
        return jsonify({'success': True, 'message': 'Email dispatched successfully'})
    except Exception as e:
        logger.error(f"Manual communication failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Return model metadata and feature importance."""
    if not MODEL_LOADED:
        return jsonify({'error': 'Model not loaded'}), 503

    # Feature importance from coefficients
    coefficients = model.coef_[0]
    importance = []
    for i, name in enumerate(feature_names):
        importance.append({
            'feature': name,
            'coefficient': round(float(coefficients[i]), 6),
            'abs_coefficient': round(float(abs(coefficients[i])), 6)
        })

    importance.sort(key=lambda x: x['abs_coefficient'], reverse=True)

    return jsonify({
        'model_type': 'Logistic Regression',
        'roc_auc': round(metadata['roc_auc'], 4),
        'n_features': metadata['n_features'],
        'n_training_samples': metadata['n_training_samples'],
        'n_test_samples': metadata['n_test_samples'],
        'default_rate': round(metadata['default_rate'], 4),
        'feature_importance': importance
    })


@app.route('/api/feature-options', methods=['GET'])
def feature_options():
    """Return valid options for categorical features."""
    return jsonify({
        'Education': ["Bachelor's", "High School", "Master's", "PhD"],
        'EmploymentType': ["Full-time", "Part-time", "Self-employed", "Unemployed"],
        'MaritalStatus': ["Divorced", "Married", "Single"],
        'HasMortgage': ["Yes", "No"],
        'HasDependents': ["Yes", "No"],
        'LoanPurpose': ["Auto", "Business", "Education", "Home", "Other"],
        'HasCoSigner': ["Yes", "No"],
        'numeric_ranges': {
            'Age': {'min': 18, 'max': 80, 'step': 1},
            'Income': {'min': 10000, 'max': 200000, 'step': 1000},
            'LoanAmount': {'min': 1000, 'max': 500000, 'step': 1000},
            'CreditScore': {'min': 300, 'max': 850, 'step': 1},
            'MonthsEmployed': {'min': 0, 'max': 360, 'step': 1},
            'NumCreditLines': {'min': 0, 'max': 10, 'step': 1},
            'InterestRate': {'min': 1.0, 'max': 30.0, 'step': 0.1},
            'LoanTerm': {'min': 6, 'max': 60, 'step': 6},
            'DTIRatio': {'min': 0.0, 'max': 1.0, 'step': 0.01}
        }
    })


# --- Institutional Dashboard Aggregation ---

@app.route('/api/bank-dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Return aggregated counters for the institutional dashboard."""
    bank_name = request.args.get('bank_name', '').strip()
    if not bank_name:
        return jsonify({
            'total': 0, 'approved': 0, 'pending': 0, 'rejected': 0, 'high_risk': 0
        })

    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500
    
    try:
        from sqlalchemy import func
        
        # Total official applications for this bank
        total = db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank == bank_name
        ).scalar() or 0

        # Approved
        approved = db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank == bank_name,
            PredictionRecord.status == 'Approved'
        ).scalar() or 0

        # Pending
        pending = db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank == bank_name,
            PredictionRecord.status == 'Pending'
        ).scalar() or 0

        # Rejected
        rejected = db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank == bank_name,
            PredictionRecord.status == 'Rejected'
        ).scalar() or 0

        # High Risk (ML Probability > 60%)
        high_risk = db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.application_type == 'official',
            PredictionRecord.target_bank == bank_name,
            PredictionRecord.default_probability > 0.6
        ).scalar() or 0

        return jsonify({
            'total': total,
            'approved': approved,
            'pending': pending,
            'rejected': rejected,
            'high_risk': high_risk,
            'last_updated': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Stats aggregation failed: {e}")
        return jsonify({'error': 'Aggregation temporarily unavailable'}), 500
    finally:
        db.close()


@app.route('/api/bank-dashboard/analytics', methods=['GET'])
def get_dashboard_analytics():
    """Return historical trend data and distribution for charts."""
    bank_name = request.args.get('bank_name', '').strip()
    if not bank_name:
        return jsonify({'error': 'Bank name required'}), 400

    db = get_db()
    if not db: return jsonify({'error': 'DB offline'}), 500

    try:
        from sqlalchemy import func, extract
        
        # 1. Volume over time (last 12 months)
        trend_data = []
        for i in range(1, 13): 
            try:
                count = db.query(func.count(PredictionRecord.id)).filter(
                    PredictionRecord.application_type == 'official',
                    PredictionRecord.target_bank == bank_name,
                    extract('month', PredictionRecord.created_at) == i
                ).scalar() or 0
                trend_data.append(count)
            except Exception as e:
                logger.warning(f"Trend extraction failed for month {i}: {e}")
                trend_data.append(0)

        # 2. Risk Distribution
        risk_dist = {
            'Low': db.query(func.count(PredictionRecord.id)).filter(
                PredictionRecord.target_bank == bank_name,
                PredictionRecord.risk_category == 'Low'
            ).scalar() or 0,
            'Medium': db.query(func.count(PredictionRecord.id)).filter(
                PredictionRecord.target_bank == bank_name,
                PredictionRecord.risk_category == 'Medium'
            ).scalar() or 0,
            'High': db.query(func.count(PredictionRecord.id)).filter(
                PredictionRecord.target_bank == bank_name,
                PredictionRecord.risk_category == 'High'
            ).scalar() or 0
        }

        # 3. Loan Purpose Distribution
        purposes = ["Home", "Auto", "Education", "Business", "Other"]
        purpose_dist = {p: db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.target_bank == bank_name,
            PredictionRecord.loan_purpose == p
        ).scalar() or 0 for p in purposes}

        # 4. Credit Score Distribution
        credit_ranges = [(300, 400), (400, 500), (500, 600), (600, 700), (700, 800), (800, 900)]
        credit_dist = []
        for low, high in credit_ranges:
            count = db.query(func.count(PredictionRecord.id)).filter(
                PredictionRecord.target_bank == bank_name,
                PredictionRecord.credit_score >= low,
                PredictionRecord.credit_score < high
            ).scalar() or 0
            credit_dist.append(count)

        # 5. Employment Type Distribution
        emp_types = ['Full-time', 'Self-employed', 'Part-time', 'Unemployed']
        emp_dist = {t: db.query(func.count(PredictionRecord.id)).filter(
            PredictionRecord.target_bank == bank_name,
            PredictionRecord.employment_type == t
        ).scalar() or 0 for t in emp_types}

        # 6. DTI Distribution
        dti_ranges = [(0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)]
        dti_dist = []
        for low, high in dti_ranges:
            count = db.query(func.count(PredictionRecord.id)).filter(
                PredictionRecord.target_bank == bank_name,
                PredictionRecord.dti_ratio >= low,
                PredictionRecord.dti_ratio < high
            ).scalar() or 0
            dti_dist.append(count)

        return jsonify({
            'volume_trend': trend_data,
            'risk_distribution': risk_dist,
            'purpose_distribution': purpose_dist,
            'credit_distribution': credit_dist,
            'employment_distribution': emp_dist,
            'dti_distribution': dti_dist
        })
    except Exception as e:
        logger.error(f"Analytics failed: {e}")
        return jsonify({'success': False, 'message': 'Analytics temporarily unavailable'}), 500
    finally:
        db.close()


# --- Serve Frontend ---
@app.route('/')
def serve_frontend():
    """Serve the frontend index.html."""
    return app.send_static_file('index.html')


# --- Run Server ---
if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("  Loan Default Prediction API")
    print("  http://localhost:5000")
    print("=" * 60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
