const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { User } = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // recommended
  secure: false, // use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// check SMTP connection on startup
transporter
  .verify()
  .then(() => {
    console.log("SMTP server is ready to take messages");
  })
  .catch((err) => {
    console.error("SMTP verification failed:", err);
  });

// helper to generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// helper to send OTP email
async function sendOtpEmail(to, otp) {
  try {
    console.log("Sending OTP to:", to, "code:", otp);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "Procuro OTP Verification",
      text: `Your OTP for Procuro registration is ${otp}. It is valid for 2 minutes.`,
    });

    console.log("Mail sent:", info.messageId || info.response);
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw err; // so register catches it
  }
}

async function register(req, res) {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    // generate OTP and expiry (2 minutes from now)
    const otp = generateOtp();
    const expires = new Date(Date.now() + 2 * 60 * 1000);

    // create user as NOT verified yet
    const user = await User.create({
      name,
      email,
      password_hash: hash,
      role: role || "EMPLOYEE",
      department: role === "EMPLOYEE" || !role ? department || null : null,
      status: "ACTIVE",
      is_verified: false,
      otp_code: otp,
      otp_expires_at: expires,
    });

    // send OTP mail
    await sendOtpEmail(email, otp);

    return res.json({
      message:
        "OTP sent to your email. Please verify within 2 minutes to complete registration.",
      user_id: user.user_id,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // block login if not verified
    if (!user.is_verified) {
      return res.status(403).json({
        error: "Please verify your account with OTP first.",
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, department: user.department },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// POST /auth/verify-otp  { email, otp }
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!user.otp_code || !user.otp_expires_at) {
      return res.status(400).json({ error: "No OTP requested" });
    }

    if (new Date() > user.otp_expires_at) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.is_verified = true;
    user.otp_code = null;
    user.otp_expires_at = null;
    await user.save();

    return res.json({ message: "OTP verified. Account activated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { register, login, verifyOtp };