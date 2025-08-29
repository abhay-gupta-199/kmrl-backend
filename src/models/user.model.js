import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Allowed roles by department (configurable)
const departmentRoles = {
  Administration: ["SuperAdmin"],
  Board: ["Chairperson", "Executive Manager"],
  Engineering: ["Admin", "Lead", "Employee"],
  HR: ["Admin", "Employee"],
  Finance: ["Admin", "Auditor", "Employee"],
  Operations: ["Admin", "Supervisor", "Employee"],
};

// Schema
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      enum: Object.keys(departmentRoles),
      required: true,
    },

    role: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return departmentRoles[this.department]?.includes(value);
        },
        message: (props) =>
          `${props.value} is not allowed for department ${props.instance.department}`,
      },
    },
    refreshToken: {
      type: String,
    },

    // 🔒 Controls if user can change password
    isPasswordChangeAllowed: {
      type: Boolean,
      default: false, // employees cannot change their password
    },

    // ✅ To know who created the user (only SuperAdmin should be allowed)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// 🔑 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔑 Compare password (login)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🔑 Generate random password (for new employees)
userSchema.statics.generateRandomPassword = function () {
  return crypto.randomBytes(6).toString("hex"); // 12-char random string
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

const User = mongoose.model("User", userSchema);
export default User;
