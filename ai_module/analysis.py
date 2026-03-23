import pandas as pd

# load dataset
data = pd.read_csv("dataset/spend_analysis_dataset.csv")

# rename columns
data = data.rename(columns={
    "ItemName": "item_name",
    "Category": "category",
    "Quantity": "quantity",
    "UnitPrice": "unit_price",
    "TotalCost": "total_cost",
    "PurchaseDate": "purchase_date",
    "Supplier": "supplier",
    "Buyer": "department"
})

# convert date
data["purchase_date"] = pd.to_datetime(data["purchase_date"])

print(data.head())

# ==============================
# STEP 4 — Spending Analysis
# ==============================

# spending by category
category_spending = data.groupby("category")["total_cost"].sum()

print("\nSpending by Category:")
print(category_spending)

# spending by department
dept_spending = data.groupby("department")["total_cost"].sum()

print("\nSpending by Department:")
print(dept_spending)

from sklearn.linear_model import LinearRegression
import pandas as pd

print("\nDepartment-wise Demand Prediction:")

data["month"] = data["purchase_date"].dt.month

departments = data["department"].unique()

for dept in departments:
    
    dept_data = data[data["department"] == dept]
    
    monthly_qty = dept_data.groupby("month")["quantity"].sum().reset_index()
    
    if len(monthly_qty) < 2:
        print(f"{dept}: Not enough data")
        continue
    
    X = monthly_qty[["month"]]
    y = monthly_qty["quantity"]
    
    model = LinearRegression()
    model.fit(X, y)
    
    # FIXED LINE
    next_month = pd.DataFrame([[13]], columns=["month"])
    
    prediction = model.predict(next_month)
    
    print(f"{dept}: Predicted Demand = {int(prediction[0])}")