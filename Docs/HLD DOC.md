# LOAN HLD

## **High Level Design (HLD)**
The Loan Default Prediction system is designed as a modular machine learning pipeline that processes borrower data and generates default risk predictions to support credit decision-making.

---

## **1. Data Source Layer**
- Dataset is collected from external repository (Kaggle)
- Stored as CSV file
- Contains borrower demographic, financial, and loan attributes
---

## **2. Data Ingestion & Validation Layer**
- Load dataset using Pandas
- Verify schema consistency
- Check for missing values and anomalies
- Ensure target variable is properly encoded
---

## **3. Data Preprocessing Layer**
- Handle missing values
- Remove duplicates and invalid entries
- Encode categorical variables
- Normalize numeric features
- Create derived risk features (loan/income ratio, etc.)
---

## **4. Exploratory Analysis Layer**
- Analyze class distribution
- Identify correlations
- Detect outliers
- Generate statistical summaries and visualizations
---

## **5. Modeling Layer**
- Implement naive baseline classifier (majority class)
- Train Logistic Regression model
- Generate probability predictions for default risk
---

## **6. Evaluation Layer**
- Compute ROC-AUC score
- Generate confusion matrix
- Calculate precision, recall, and F1-score
- Compare baseline vs Logistic Regression performance
---

## **7. Output & Reporting Layer**
- Produce borrower risk scores
- Generate performance reports
- Provide insights for decision makers
- Export results for dashboard visualization


