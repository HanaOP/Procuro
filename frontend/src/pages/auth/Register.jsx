import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../../api/authApi";
import { ErrorAlert } from "../../components/Feedback";

const ROLES = ["EMPLOYEE", "MANAGER", "FINANCE", "PROCUREMENT", "SUPPLIER"];
const DEPARTMENTS = [
  "Engineering",
  "HR",
  "Finance",
  "Marketing",
  "Operations",
  "IT",
  "Legal",
  "Admin",
  "Sales",
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await registerApi(form);
      // Navigate to OTP page, pass email via state
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <Link
            to="/login"
            className="font-mono text-amber-400 text-xl font-medium"
          >
            PROCURO
          </Link>
          <h1 className="font-mono text-xl text-slate-100 font-medium mt-6">
            Create account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            An OTP will be sent to your email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Jane Smith"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="input-field"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Min 8 characters"
              required
            />
          </div>

          <div>
            <label className="label">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="input-field"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-surface-900">
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {form.role === "EMPLOYEE" && (
            <div>
              <label className="label">Department *</label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select your department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d} className="bg-surface-900">
                    {d}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-600 font-mono">
                You can only submit requests for your own department
              </p>
            </div>
          )}

          {error && <ErrorAlert message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? "Sending OTP..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
