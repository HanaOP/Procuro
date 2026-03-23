"""
AI-Powered Demand Analysis Service — FastAPI (Fixed)
Uses Prophet for trend detection + WMA for quantity prediction
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from collections import defaultdict
import statistics
import os
import warnings
warnings.filterwarnings('ignore')

try:
    import pandas as pd
    import numpy as np
    from prophet import Prophet
    from sklearn.ensemble import IsolationForest
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

app = FastAPI(title="AI Demand Analysis API", version="2.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "erp_procuro"),
    "user":     os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "hana123"),
    "port":     int(os.getenv("DB_PORT", 5433)),
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

# ── KAGGLE DATASET INTEGRATION ───────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), "dataset", "spend_analysis_dataset.csv")
KAGGLE_DF = None

if ML_AVAILABLE and os.path.exists(CSV_PATH):
    try:
        KAGGLE_DF = pd.read_csv(CSV_PATH)
        KAGGLE_DF["created_at"] = pd.to_datetime(KAGGLE_DF["PurchaseDate"])
        # Map Kaggle columns to DB fields
        KAGGLE_DF = KAGGLE_DF.rename(columns={
            "ItemName": "item_name",
            "Category": "category",
            "Quantity": "quantity",
            "UnitPrice": "estimated_unit_price",
            "TotalCost": "total_amount",
            "Buyer":     "department"
        })
        # Basic mapping for Buyer -> Department to ensure filters work
        # If the buyer name isn't a department, we'll try to keep it 
        # but the dashboard filter might miss it unless 'All' is selected.
    except Exception as e:
        print(f"Error loading Kaggle dataset: {e}")

def fetch_all_requests(department=None, category=None):
    db_rows = []
    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        query = """
            SELECT pr_id, department, category, item_name, quantity,
                   estimated_unit_price, total_amount, priority, required_by, created_at, status
            FROM   "PURCHASE_REQUESTS"
            WHERE  status NOT IN ('REJECTED')
        """
        params = []
        if department: query += " AND department = %s"; params.append(department)
        if category:   query += " AND category = %s";   params.append(category)
        query += " ORDER BY created_at ASC"
        cur.execute(query, params)
        db_rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
    except Exception as e:
        print(f"Database connection skipped (using CSV baseline only): {e}")

    # Combine with Kaggle Data
    csv_rows = []
    if KAGGLE_DF is not None:
        temp_df = KAGGLE_DF.copy()
        if department and department != 'All':
            # Note: Highly likely Kaggle Buyer names don't match exactly.
            # We filter if there's a match, otherwise we might see nothing for that dept.
            temp_df = temp_df[temp_df["department"] == department]
        if category:
            temp_df = temp_df[temp_df["category"] == category]
        
        csv_rows = temp_df.to_dict('records')
        # Assign fake IDs to avoid collisions and nulls
        for i, row in enumerate(csv_rows):
            row['pr_id'] = 90000 + i
            row['status'] = 'COMPLETED'
            # Enforce float types for price and amount
            row['estimated_unit_price'] = float(row.get('estimated_unit_price', 0))
            row['total_amount'] = float(row.get('total_amount', 0))

    return db_rows + csv_rows

def confidence_label(n):
    if n >= 12: return "HIGH"
    if n >= 5:  return "MEDIUM"
    if n >= 2:  return "LOW"
    return "VERY_LOW"

def weighted_moving_average(quantities):
    if not quantities: return 0.0
    n = len(quantities)
    weights = list(range(1, n + 1))
    return round(sum(q * w for q, w in zip(quantities, weights)) / sum(weights), 2)

def estimate_next_date(dates):
    if len(dates) < 2: return None
    sorted_dates = sorted(dates)
    gaps = [(sorted_dates[i+1] - sorted_dates[i]).days for i in range(len(sorted_dates)-1)]
    return (sorted_dates[-1] + timedelta(days=statistics.mean(gaps))).strftime("%Y-%m-%d")

def prophet_trend(dates, values):
    """
    Uses Prophet ONLY to detect trend direction and seasonality.
    Returns: (trend, trend_pct_change, seasonal_factor, model_used)
    """
    if not ML_AVAILABLE or len(dates) < 5:
        return "STABLE", 0.0, 1.0, "statistical"
    try:
        df = pd.DataFrame({
            'ds': pd.to_datetime(dates),
            'y':  [float(v) for v in values]
        }).drop_duplicates('ds').sort_values('ds')

        if len(df) < 2:
            return "STABLE", 0.0, 1.0, "statistical"

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        model.fit(df)

        # Forecast just 1 period ahead from last known date
        last_date = df['ds'].max()
        future_dates = pd.DataFrame({'ds': [last_date + timedelta(days=30)]})
        forecast = model.predict(future_dates)

        last_actual = float(df['y'].iloc[-1])
        predicted   = float(forecast['yhat'].iloc[0])

        if last_actual == 0:
            return "STABLE", 0.0, 1.0, "prophet"

        pct_change = round((predicted - last_actual) / last_actual * 100, 1)

        if pct_change > 10:   trend = "INCREASING ↑"
        elif pct_change < -10: trend = "DECREASING ↓"
        else:                  trend = "STABLE →"

        # Seasonal factor from Prophet's yearly seasonality
        seasonal = float(forecast['yearly'].iloc[0]) if 'yearly' in forecast.columns else 0.0
        seasonal_factor = round(1 + (seasonal / (last_actual or 1)), 2)
        seasonal_factor = max(0.5, min(seasonal_factor, 2.0))  # clamp between 0.5 and 2.0

        return trend, pct_change, seasonal_factor, "prophet"

    except Exception:
        return "STABLE", 0.0, 1.0, "statistical"


def smart_predict(dates, quantities):
    """
    Main prediction logic:
    1. Use WMA for base quantity (reliable)
    2. Use Prophet for trend adjustment
    3. Apply trend factor to WMA result
    Returns: (predicted_qty, lower, upper, trend, model_used)
    """
    base = weighted_moving_average(quantities)

    if len(quantities) < 2:
        margin = round(base * 0.2, 2)
        return base, round(base - margin, 2), round(base + margin, 2), "STABLE", "statistical"

    trend, pct_change, seasonal_factor, model_used = prophet_trend(dates, quantities)

    # Apply trend adjustment to WMA base
    if "INCREASING" in trend:
        adjusted = round(base * min(1 + pct_change/100, 1.5), 2)
    elif "DECREASING" in trend:
        adjusted = round(base * max(1 + pct_change/100, 0.5), 2)
    else:
        adjusted = base

    adjusted = max(adjusted, 0)
    margin   = round(adjusted * 0.15, 2)
    lower    = round(max(adjusted - margin, 0), 2)
    upper    = round(adjusted + margin, 2)

    return adjusted, lower, upper, trend, model_used


def detect_anomaly(quantity, unit_price, category, all_rows):
    cat_rows = [r for r in all_rows if r['category'] == category]
    if len(cat_rows) < 10:
        quantities = [r['quantity'] for r in cat_rows]
        prices     = [float(r['estimated_unit_price']) for r in cat_rows if r['estimated_unit_price']]
        if len(quantities) < 2:
            return False, "NORMAL", "Not enough data", 0.0
        q_mean = statistics.mean(quantities)
        q_std  = statistics.stdev(quantities) if len(quantities) > 1 else 1
        p_mean = statistics.mean(prices) if prices else unit_price
        p_std  = statistics.stdev(prices) if len(prices) > 1 else 1
        q_z = abs(quantity - q_mean) / (q_std or 1)
        p_z = abs(unit_price - p_mean) / (p_std or 1)
        if q_z > 2.5 or p_z > 2.5:
            reason = []
            if q_z > 2.5: reason.append(f"quantity {quantity} is unusual (avg: {round(q_mean,1)})")
            if p_z > 2.5: reason.append(f"price {unit_price} is unusual (avg: {round(p_mean,2)})")
            return True, "ANOMALY", " and ".join(reason), min(round(max(q_z, p_z) / 5, 2), 1.0)
        return False, "NORMAL", "Within expected range", 0.0
    try:
        X = np.array([[r['quantity'], float(r['estimated_unit_price'] or 0)] for r in cat_rows])
        clf = IsolationForest(contamination=0.1, random_state=42)
        clf.fit(X)
        score = clf.decision_function([[quantity, unit_price]])[0]
        pred  = clf.predict([[quantity, unit_price]])[0]
        anomaly_score = round(1 - (score + 0.5), 2)
        if pred == -1:
            avg_qty   = round(float(np.mean(X[:, 0])), 1)
            avg_price = round(float(np.mean(X[:, 1])), 2)
            return True, "ANOMALY", f"Unusual pattern. Category avg: qty={avg_qty}, price=${avg_price}", min(anomaly_score, 1.0)
        return False, "NORMAL", "Within expected range", round(anomaly_score, 2)
    except Exception:
        return False, "NORMAL", "Could not analyze", 0.0


def _build_predictions(rows):
    groups = defaultdict(list)
    for r in rows:
        groups[(r["department"], r["category"], r["item_name"])].append(r)

    predictions = []
    for (dept, cat, item), records in groups.items():
        quantities = [r["quantity"] for r in records]
        dates      = [datetime.fromisoformat(str(r["created_at"])).replace(tzinfo=None) for r in records if r["created_at"]]
        prices     = [float(r["estimated_unit_price"]) for r in records if r["estimated_unit_price"]]

        pred_qty, lower, upper, trend, model_used = smart_predict(dates, quantities)
        avg_price = round(statistics.mean(prices), 2) if prices else 0.0

        predictions.append({
            "department":          dept,
            "category":            cat,
            "item_name":           item,
            "predicted_quantity":  pred_qty,
            "quantity_lower":      lower,
            "quantity_upper":      upper,
            "avg_unit_price":      avg_price,
            "predicted_spend":     round(pred_qty * avg_price, 2),
            "spend_lower":         round(lower * avg_price, 2),
            "spend_upper":         round(upper * avg_price, 2),
            "past_requests":       len(records),
            "last_requested":      dates[-1].strftime("%Y-%m-%d") if dates else None,
            "next_expected_date":  estimate_next_date(dates),
            "confidence":          confidence_label(len(records)),
            "trend":               trend,
            "model_used":          model_used,
        })

    predictions.sort(key=lambda x: x["predicted_quantity"], reverse=True)
    return {
        "total_items": len(predictions),
        "model": "Prophet (trend) + WMA (quantity)" if ML_AVAILABLE else "Statistical WMA",
        "predictions": predictions
    }


# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "ml_available": ML_AVAILABLE, "model": "Prophet + WMA + Isolation Forest" if ML_AVAILABLE else "Statistical"}

@app.get("/predict/all")
def predict_all():
    rows = fetch_all_requests()
    if not rows: return {"predictions": [], "message": "No data found."}
    return _build_predictions(rows)

@app.get("/predict/department/{department}")
def predict_by_department(department: str):
    rows = fetch_all_requests(department=department)
    if not rows: raise HTTPException(404, f"No data for department: {department}")
    result = _build_predictions(rows)
    result["department"] = department
    return result

@app.get("/predict/category/{category}")
def predict_by_category(category: str):
    rows = fetch_all_requests(category=category)
    if not rows: raise HTTPException(404, f"No data for category: {category}")
    result = _build_predictions(rows)
    result["category"] = category
    return result

@app.get("/forecast/spend")
def forecast_spend():
    rows = fetch_all_requests()
    if not rows: return {"forecasts": []}
    dept_data = defaultdict(list)
    for r in rows:
        if r["total_amount"] and r["created_at"]:
            dept_data[r["department"]].append({"date": datetime.fromisoformat(str(r["created_at"])).replace(tzinfo=None), "amount": float(r["total_amount"])})
    forecasts = []
    for dept, entries in dept_data.items():
        entries.sort(key=lambda x: x["date"])
        dates   = [e["date"] for e in entries]
        amounts = [e["amount"] for e in entries]
        pred, lower, upper, trend, model_used = smart_predict(dates, amounts)
        avg = round(statistics.mean(amounts), 2)
        forecasts.append({
            "department": dept,
            "forecasted_monthly_spend": pred,
            "spend_lower": lower,
            "spend_upper": upper,
            "historical_avg": avg,
            "trend": trend,
            "total_historical_spend": round(sum(amounts), 2),
            "data_points": len(amounts),
            "confidence": confidence_label(len(amounts)),
            "model_used": model_used,
        })
    forecasts.sort(key=lambda x: x["forecasted_monthly_spend"], reverse=True)
    return {"forecast_horizon": "next order", "model": "Prophet + WMA" if ML_AVAILABLE else "Statistical", "forecasts": forecasts}

@app.get("/forecast/spend/{department}")
def forecast_spend_department(department: str):
    rows = fetch_all_requests(department=department)
    if not rows: raise HTTPException(404, f"No data for department: {department}")
    monthly = defaultdict(float)
    for r in rows:
        if r["total_amount"] and r["created_at"]:
            dt = datetime.fromisoformat(str(r["created_at"])).replace(tzinfo=None)
            monthly[dt.strftime("%Y-%m")] += float(r["total_amount"])
    months  = sorted(monthly.keys())
    amounts = [monthly[m] for m in months]
    dates   = [datetime.strptime(m, "%Y-%m") for m in months]
    pred, lower, upper, trend, model_used = smart_predict(dates, amounts)
    cat_spend = defaultdict(float)
    for r in rows:
        if r["total_amount"]: cat_spend[r["category"]] += float(r["total_amount"])
    return {
        "department": department,
        "forecasted_next_month": pred,
        "spend_lower": lower,
        "spend_upper": upper,
        "trend": trend,
        "total_spent_to_date": round(sum(amounts), 2),
        "monthly_breakdown": [{"month": m, "spend": round(monthly[m], 2)} for m in months],
        "category_breakdown": [{"category": c, "total_spend": round(s, 2)} for c, s in sorted(cat_spend.items(), key=lambda x: -x[1])],
        "model_used": model_used,
        "confidence": confidence_label(len(amounts)),
    }

@app.get("/anomalies/all")
def get_all_anomalies():
    rows = fetch_all_requests()
    if not rows: return {"anomalies": [], "total_scanned": 0}
    anomalies = []
    for r in rows:
        qty   = r["quantity"]
        price = float(r["estimated_unit_price"] or 0)
        is_anomaly, status, reason, score = detect_anomaly(qty, price, r["category"], rows)
        if is_anomaly:
            anomalies.append({"pr_id": r["pr_id"], "department": r["department"], "category": r["category"], "item_name": r["item_name"], "quantity": qty, "unit_price": price, "total_amount": float(r["total_amount"] or 0), "reason": reason, "anomaly_score": score, "date": str(r["created_at"])[:10] if r["created_at"] else None, "severity": "HIGH" if score > 0.7 else "MEDIUM" if score > 0.4 else "LOW"})
    anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
    return {"total_scanned": len(rows), "total_anomalies": len(anomalies), "anomaly_rate": f"{round(len(anomalies)/len(rows)*100, 1)}%", "model": "Isolation Forest" if ML_AVAILABLE else "Z-Score", "anomalies": anomalies}

@app.get("/anomalies/department/{department}")
def get_anomalies_by_department(department: str):
    all_rows  = fetch_all_requests()
    dept_rows = [r for r in all_rows if r["department"] == department]
    if not dept_rows: raise HTTPException(404, f"No data for department: {department}")
    anomalies = []
    for r in dept_rows:
        qty   = r["quantity"]
        price = float(r["estimated_unit_price"] or 0)
        is_anomaly, _, reason, score = detect_anomaly(qty, price, r["category"], all_rows)
        if is_anomaly:
            anomalies.append({"pr_id": r["pr_id"], "item_name": r["item_name"], "category": r["category"], "quantity": qty, "unit_price": price, "reason": reason, "anomaly_score": score, "date": str(r["created_at"])[:10] if r["created_at"] else None, "severity": "HIGH" if score > 0.7 else "MEDIUM" if score > 0.4 else "LOW"})
    anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
    return {"department": department, "total_scanned": len(dept_rows), "total_anomalies": len(anomalies), "model": "Isolation Forest" if ML_AVAILABLE else "Z-Score", "anomalies": anomalies}

@app.get("/summary/top-items")
def top_items(limit: int = 10):
    rows = fetch_all_requests()
    if not rows: return {"items": []}
    item_counts = defaultdict(lambda: {"count": 0, "total_qty": 0, "departments": set()})
    for r in rows:
        key = (r["category"], r["item_name"])
        item_counts[key]["count"] += 1
        item_counts[key]["total_qty"] += r["quantity"]
        item_counts[key]["departments"].add(r["department"])
    items = [{"category": cat, "item_name": item, "request_count": d["count"], "total_quantity_requested": d["total_qty"], "departments_requesting": len(d["departments"])} for (cat, item), d in item_counts.items()]
    items.sort(key=lambda x: x["request_count"], reverse=True)
    return {"top_items": items[:limit]}

@app.get("/summary/reorder-alerts")
def reorder_alerts():
    rows = fetch_all_requests()
    if not rows: return {"alerts": []}
    groups = defaultdict(list)
    for r in rows: groups[(r["department"], r["category"], r["item_name"])].append(r)
    alerts = []; today = datetime.utcnow()
    for (dept, cat, item), records in groups.items():
        if len(records) < 2: continue
        dates = sorted([datetime.fromisoformat(str(r["created_at"])).replace(tzinfo=None) for r in records if r["created_at"]])
        gaps = [(dates[i+1]-dates[i]).days for i in range(len(dates)-1)]
        avg_gap = statistics.mean(gaps); days_since = (today - dates[-1]).days; days_until_due = int(avg_gap - days_since)
        if days_until_due <= 7:
            alerts.append({"department": dept, "category": cat, "item_name": item, "avg_reorder_gap_days": round(avg_gap), "days_since_last_request": days_since, "days_until_due": max(days_until_due, 0), "urgency": "OVERDUE" if days_until_due < 0 else "DUE_SOON"})
    alerts.sort(key=lambda x: x["days_until_due"])
    return {"total_alerts": len(alerts), "alerts": alerts}

@app.get("/summary/dashboard/{department}")
def department_dashboard(department: str):
    rows     = fetch_all_requests(department=department)
    all_rows = fetch_all_requests()
    if not rows: raise HTTPException(404, f"No data for department: {department}")
    pred_result = _build_predictions(rows)
    amounts = [float(r["total_amount"]) for r in rows if r["total_amount"]]
    dates   = [datetime.fromisoformat(str(r["created_at"])).replace(tzinfo=None) for r in rows if r["created_at"]]
    pred_spend, lower, upper, trend, model = smart_predict(dates, amounts)
    anomalies = []
    for r in rows:
        qty   = r["quantity"]
        price = float(r["estimated_unit_price"] or 0)
        is_anomaly, _, reason, score = detect_anomaly(qty, price, r["category"], all_rows)
        if is_anomaly:
            anomalies.append({"pr_id": r["pr_id"], "item_name": r["item_name"], "quantity": qty, "unit_price": price, "reason": reason, "severity": "HIGH" if score > 0.7 else "MEDIUM" if score > 0.4 else "LOW"})
    item_counts = defaultdict(int)
    for r in rows: item_counts[r["item_name"]] += 1
    top = sorted(item_counts.items(), key=lambda x: -x[1])[:5]
    return {
        "department": department,
        "total_requests_analyzed": len(rows),
        "model": "Prophet + WMA + Isolation Forest" if ML_AVAILABLE else "Statistical",
        "demand_predictions": pred_result["predictions"][:5],
        "spend_forecast": {"next_order_estimate": pred_spend, "lower": lower, "upper": upper, "trend": trend, "total_to_date": round(sum(amounts), 2)},
        "anomalies": {"total_found": len(anomalies), "items": anomalies[:5]},
        "top_requested_items": [{"item": i, "count": c} for i, c in top],
    }