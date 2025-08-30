import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "docx"],
      required: true,
    },
    filePath: { type: String, required: true },
    size: { type: Number },
    hash: { type: String },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🎯 Who is this message/document intended for?
    audience: {
      type: String,
      enum: ["all", "department", "employee", "departmentHead", "dean"],
      required: true,
    },
    targetDepartment: {
      type: String, // valid only if audience = "department" or "departmentHead"
    },
    targetEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // valid only if audience = "employee"
    },

    // ✅ Optional: if doc needs approval (employee → Dean via HOD)
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Head or Dean who approved
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // only "pending" if requiresApproval=true
    },

    department: { type: String },
    category: { type: String },
    tags: [{ type: String }],

    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
