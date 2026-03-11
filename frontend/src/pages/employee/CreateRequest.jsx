import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createRequest } from "../../api/employeeApi";
import AppLayout from "../../components/AppLayout";
import { ErrorAlert, SuccessAlert } from "../../components/Feedback";

const CATEGORIES = [
  "IT",
  "Office Supplies",
  "Furniture",
  "Hardware",
  "Software",
  "Maintenance",
  "Other",
];

export default function CreateRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [document, setDocument] = useState(null);

  const [form, setForm] = useState({
    item_name: "",
    item_details: "",
    quantity: "",
    estimated_unit_price: "",
    category: "",
    required_by: "",
    department: user?.department || "",
  });

  const totalAmount =
    form.quantity && form.estimated_unit_price
      ? (
          parseFloat(form.quantity) * parseFloat(form.estimated_unit_price)
        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })
      : "—";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (draft) => {
    setError("");
    setSuccess("");
    if (!draft && !document) {
      setError("Please upload a supporting PDF document before submitting.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity),
        estimated_unit_price: parseFloat(form.estimated_unit_price),
      };
      await createRequest(payload, document, draft);
      setSuccess(
        draft
          ? "Draft saved successfully."
          : "Request submitted for manager approval.",
      );
      setTimeout(
        () => navigate(draft ? "/employee/drafts" : "/employee/requests"),
        1500,
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <p className="section-title mb-1">Employee</p>
          <h1 className="page-title">New Purchase Request</h1>
        </div>

        <div className="card space-y-5">
          {/* Item Info */}
          <div>
            <p className="section-title mb-4 border-b border-surface-700 pb-2">
              Item Details
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Item Name *</label>
                <input
                  name="item_name"
                  value={form.item_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g. Dell Laptop XPS 15"
                />
              </div>
              <div>
                <label className="label">Item Details</label>
                <textarea
                  name="item_details"
                  value={form.item_details}
                  onChange={handleChange}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Specifications, model numbers, additional notes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category *</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-surface-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity & Price */}
          <div>
            <p className="section-title mb-4 border-b border-surface-700 pb-2">
              Quantity & Cost
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity * (1–20)</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="20"
                  value={form.quantity}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="label">Unit Price (₹) *</label>
                <input
                  name="estimated_unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_unit_price}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-3 px-4 py-3 bg-surface-800 border border-surface-600 flex justify-between items-center">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                Estimated Total
              </span>
              <span className="font-mono text-amber-400 text-lg font-medium">
                ₹{totalAmount}
              </span>
            </div>
          </div>

          {/* Logistics */}
          <div>
            <p className="section-title mb-4 border-b border-surface-700 pb-2">
              Logistics
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Department *</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className={`input-field ${user?.department ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="e.g. Engineering"
                    readOnly={!!user?.department}
                  />
                  {user?.department && (
                    <p className="mt-1 text-xs text-slate-600 font-mono">
                      Locked to your department
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Required By *</label>
                  <input
                    name="required_by"
                    type="date"
                    value={form.required_by}
                    onChange={handleChange}
                    className="input-field"
                    min={
                      new Date(Date.now() + 86400000)
                        .toISOString()
                        .split("T")[0]
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Document */}
          <div>
            <p className="section-title mb-4 border-b border-surface-700 pb-2">
              Supporting Document
            </p>
            <div>
              <label className="label">Upload PDF *</label>
              <label className="flex items-center gap-3 cursor-pointer input-field hover:border-amber-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                </svg>
                <span className={`text-sm font-mono truncate ${document ? "text-amber-400" : "text-slate-500"}`}>
                  {document ? document.name : "Click to upload PDF (max 10 MB)"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setDocument(e.target.files[0] || null)}
                />
              </label>
              {!document && (
                <p className="mt-1 text-xs text-slate-600 font-mono">Required to submit a request</p>
              )}
            </div>
          </div>

          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="btn-primary"
            >
              {loading && !isDraft ? "Submitting..." : "Submit Request"}
            </button>
            <button
              onClick={() => {
                setIsDraft(true);
                handleSubmit(true);
              }}
              disabled={loading}
              className="btn-secondary"
            >
              {loading && isDraft ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={() => navigate("/employee")}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
