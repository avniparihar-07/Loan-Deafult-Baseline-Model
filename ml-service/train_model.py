"""
Train and save the Logistic Regression model for Loan Default Prediction.
This script reads the dataset, preprocesses it, trains the model, and saves
the model artifacts (model, scaler, feature names) for the API to load.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
import joblib
import os

# --- Configuration ---
DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'Loan_default.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model_artifacts')

def train_and_save_model():
    """Train the logistic regression model and save artifacts."""
    print("=" * 60)
    print("  Loan Default Prediction - Model Training")
    print("=" * 60)

    # 1. Load Data
    print("\n[1/6] Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    print(f"  Dataset shape: {df.shape}")
    print(f"  Default rate: {df['Default'].mean():.2%}")

    # 2. Drop non-predictive columns
    print("\n[2/6] Preparing features...")
    df = df.drop(columns=['LoanID'])

    # 3. Feature Engineering
    print("\n[3/6] Engineering features...")
    df['Loan_Income_Ratio'] = df['LoanAmount'] / df['Income']
    df['Estimated_EMI'] = df['LoanAmount'] / df['LoanTerm']
    df['EMI_Income_Ratio'] = df['Estimated_EMI'] / df['Income']

    # Income groups
    income_bins = [0, 40000, 80000, float('inf')]
    income_labels = ['Low Income', 'Medium Income', 'High Income']
    df['Income_Group'] = pd.cut(df['Income'], bins=income_bins, labels=income_labels)

    # 4. Encode categorical variables
    print("\n[4/6] Encoding categorical variables...")
    target = df['Default']
    features = df.drop(columns=['Default'])

    # One-hot encode
    categorical_cols = ['Education', 'EmploymentType', 'MaritalStatus',
                        'HasMortgage', 'HasDependents', 'LoanPurpose',
                        'HasCoSigner', 'Income_Group']
    features = pd.get_dummies(features, columns=categorical_cols, drop_first=True)

    # Ensure consistent feature order
    feature_names = list(features.columns)
    print(f"  Total features: {len(feature_names)}")

    # 5. Scale features
    print("\n[5/6] Training model...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, target, test_size=0.2, random_state=42, stratify=target
    )

    # Train Logistic Regression
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    roc_auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\n  ROC-AUC Score: {roc_auc:.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Non-Default', 'Default']))

    cm = confusion_matrix(y_test, y_pred)
    print(f"  Confusion Matrix:")
    print(f"    TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"    FN={cm[1][0]}  TP={cm[1][1]}")

    # 6. Save artifacts
    print("\n[6/6] Saving model artifacts...")
    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(model, os.path.join(MODEL_DIR, 'logistic_model.pkl'))
    joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.pkl'))
    joblib.dump(feature_names, os.path.join(MODEL_DIR, 'feature_names.pkl'))

    # Save model metadata
    metadata = {
        'roc_auc': roc_auc,
        'n_features': len(feature_names),
        'n_training_samples': len(X_train),
        'n_test_samples': len(X_test),
        'default_rate': float(target.mean()),
        'feature_names': feature_names,
    }
    joblib.dump(metadata, os.path.join(MODEL_DIR, 'metadata.pkl'))

    print(f"  Artifacts saved to: {MODEL_DIR}")
    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)

    return model, scaler, feature_names


if __name__ == '__main__':
    train_and_save_model()
