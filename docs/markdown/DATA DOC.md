# Data Flow diagram

```
E1: Historical Loan Database
            |
            | Borrower, Loan, Repayment Data
            v
+----------------------------------+
| 1. Data Ingestion                |
+----------------------------------+
            |
            v
+----------------------------------+
| D1: Raw Borrower Data             |
+----------------------------------+
            |
            v
+----------------------------------+
| 2. Data Cleaning & Preprocessing |
| - Missing Values                 |
| - Encoding                       |
| - Scaling                        |
+----------------------------------+
            |
            v
+----------------------------------+
| D2: Cleaned Dataset               |
+----------------------------------+
            |
            v
+----------------------------------+
| 3. Feature Engineering &         |
|    Statistical Analysis          |
+----------------------------------+
            |
            v
+----------------------------------+
| 4. Baseline Modeling             |
| - Naive Baseline                 |
| - Logistic Regression            |
+----------------------------------+
            |
            v
+----------------------------------+
| 5. Model Evaluation              |
| - ROC-AUC                        |
| - Confusion Matrix               |
+----------------------------------+
            |
            v
+----------------------------------+
| D3: Model Artifacts               |
| (Model + Thresholds)              |
+----------------------------------+
            |
            v
+----------------------------------+
| 6. Risk Scoring & Segmentation   |
| - Probability Scores             |
| - Low / Medium / High Risk       |
+----------------------------------+
            |
            v
+----------------------------------+
| D4: Scoring Output                |
+----------------------------------+
            |
            v
E2: Credit Officer / Dashboard

+-----------------------------+
| Cleaned Feature Dataset     |
+-------------+---------------+
              |
              v
+-----------------------------+
| Train-Test Split            |
+-------------+---------------+
              |
              v
+-----------------------------+
| Naive Baseline Model        |
| (Majority Class)            |
+-------------+---------------+
              |
              v
+-----------------------------+
| Logistic Regression Model   |
| (Probability Output)        |
+-------------+---------------+
              |
              v
+-----------------------------+
| Threshold Optimization      |
+-------------+---------------+
              |
              v
+-----------------------------+
| Risk Band Assignment        |
| Low / Medium / High         |
+-----------------------------+
```


