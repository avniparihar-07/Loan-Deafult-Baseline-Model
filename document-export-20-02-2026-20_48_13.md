# LLD Diagram

```
+------------------------+
|  Input Data Sources    |
|------------------------|
| Borrower Demographics  |
| Financial Details      |
| Loan & Repayment Data  |
+-----------+------------+
            |
            v
+------------------------+
| Data Ingestion Module  |
|------------------------|
| Read CSV (Pandas)      |
| Schema Validation      |
+-----------+------------+
            |
            v
+-----------------------------+
| Data Cleaning & Preprocess  |
|-----------------------------|
| Missing Value Handling      |
| Outlier Treatment           |
| Encoding (Categorical)     |
| Scaling (Numeric)           |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Feature Engineering Module  |
|-----------------------------|
| Loan-to-Income Ratio        |
| EMI-to-Income Ratio         |
| Age / Income Buckets        |
| Statistical Analysis        |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Naive Baseline Model        |
|-----------------------------|
| Majority Class Prediction   |
| Benchmark Accuracy          |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Logistic Regression Model   |
|-----------------------------|
| Train-Test Split            |
| Model Training              |
| Probability Prediction      |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Threshold Optimization      |
|-----------------------------|
| Precision-Recall Tradeoff   |
| Threshold Selection         |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Risk Segmentation Module    |
|-----------------------------|
| Low / Medium / High Risk    |
| Probability Banding         |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Model Evaluation Module     |
|-----------------------------|
| ROC-AUC Calculation         |
| Confusion Matrix            |
| FP / FN Analysis            |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Batch Scoring Module        |
|-----------------------------|
| Input: New Borrower CSV     |
| Output: Risk Scores         |
+-----------+-----------------+
            |
            v
+-----------------------------+
| Reporting & Dashboard       |
|-----------------------------|
| Power BI / Tableau          |
| Insights for Stakeholders   |
+-----------------------------+
```


