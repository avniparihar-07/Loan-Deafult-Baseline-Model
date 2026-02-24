# Loan CONSUMER

## **Consumer Flow**
The system is designed to support credit decision-making by providing default risk predictions based on borrower information. The end user interacts with the system through a structured workflow.

---

### **Step 1: Borrower Data Entry**
The credit officer collects borrower information including:

- Demographic details
- Financial data
- Loan characteristics
This data is entered into the system or uploaded from a dataset.

---

### **Step 2: Data Processing**
The system preprocesses the input data by:

- Cleaning missing or invalid values
- Encoding categorical attributes
- Transforming features into model-ready format
---

### **Step 3: Risk Prediction**
The trained Logistic Regression model evaluates the borrower’s profile and generates:

- Probability of default
- Predicted class (Default / Non-default)
---

### **Step 4: Decision Support Output**
The system displays:

- Risk score
- Risk category (Low / Medium / High)
- Model confidence indicators
---

### **Step 5: Credit Decision**
The credit officer uses the prediction as decision support to:

- Approve loan
- Reject application
- Request additional documentation
- Adjust loan terms
---

### **Step 6: Reporting & Monitoring**
The risk team reviews:

- Aggregate model performance
- Default trends
- Dashboard insights for portfolio management


