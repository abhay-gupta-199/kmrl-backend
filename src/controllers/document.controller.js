import Document from "../models/document.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Upload new document
 * Audience: all | department | departmentHead | employee | dean
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");

  const {
    audience,
    targetDepartment,
    targetEmployee,
    requiresApproval,
    category,
    tags,
  } = req.body;

  if (!audience) throw new ApiError(400, "Audience field is required");

  // Approval status logic
  let approvalStatus = "approved";
  if (requiresApproval === "true" || requiresApproval === true) {
    approvalStatus = "pending";
  }

  const doc = await Document.create({
    fileName: req.file.originalname,
    fileType: req.file.mimetype.includes("pdf") ? "pdf" : "docx",
    filePath: req.file.path, // path from Multer
    size: req.file.size,
    hash: "", // optional: generate hash if needed
    uploadedBy: req.user._id,
    audience,
    targetDepartment,
    targetEmployee,
    requiresApproval: !!requiresApproval,
    approvalStatus,
    category,
    tags: tags ? tags.split(",") : [],
    department: req.user.department, // auto-tag uploader's dept
  });

  return res
    .status(201)
    .json(new ApiResponse(201, doc, "Document uploaded successfully"));
});
/**
 * @desc Fetch all documents relevant to logged-in user
 */
const getDocuments = asyncHandler(async (req, res) => {
  const user = req.user;

  let query = {};

  // Access control logic with normalized role
  const role = user.role.toLowerCase();

  if (role === "superadmin") {
    query = {}; // SuperAdmin sees everything
  } else if (role === "dean") {
    query = {
      $or: [
        { audience: "all" },
        { audience: "dean" },
        { audience: "department", targetDepartment: user.department },
        { audience: "departmentHead", targetDepartment: user.department },
      ],
    };
  } else if (role === "departmenthead") {
    query = {
      $or: [
        { audience: "all" },
        { audience: "department", targetDepartment: user.department },
        { audience: "departmentHead", targetDepartment: user.department },
        { audience: "employee", targetEmployee: user._id },
      ],
    };
  } else {
    // normal employee
    query = {
      $or: [
        { audience: "all" },
        { audience: "department", targetDepartment: user.department },
        { audience: "employee", targetEmployee: user._id },
      ],
    };
  }

  const docs = await Document.find(query)
    .populate("uploadedBy", "fullName email role department")
    .populate("approvedBy", "fullName email role");

  return res
    .status(200)
    .json(new ApiResponse(200, docs, "Fetched documents successfully"));
});

/**
 * @desc Approve or reject document
 */
const approveDocument = asyncHandler(async (req, res) => {
  const { docId } = req.params;
  const { action } = req.body; // approved | rejected

  if (!["approved", "rejected"].includes(action)) {
    throw new ApiError(400, "Invalid approval action");
  }

  // Only Dean or DepartmentHead can approve
  const role = req.user.role.toLowerCase();
  if (!["departmenthead", "dean"].includes(role)) {
    throw new ApiError(
      403,
      "Only DepartmentHead or Dean can approve documents"
    );
  }

  const doc = await Document.findById(docId);
  if (!doc) throw new ApiError(404, "Document not found");

  if (!doc.requiresApproval) {
    throw new ApiError(400, "This document does not require approval");
  }

  doc.approvalStatus = action;
  doc.approvedBy = req.user._id;
  await doc.save();

  return res
    .status(200)
    .json(new ApiResponse(200, doc, `Document ${action} successfully`));
});

/**
 * @desc Delete / Archive document
 */
const updateDocumentStatus = asyncHandler(async (req, res) => {
  const { docId } = req.params;
  const { status } = req.body; // active | archived | deleted

  if (!["active", "archived", "deleted"].includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  const doc = await Document.findById(docId);
  if (!doc) throw new ApiError(404, "Document not found");

  // Only uploader or SuperAdmin can update
  const role = req.user.role.toLowerCase();
  if (
    doc.uploadedBy.toString() !== req.user._id.toString() &&
    role !== "superadmin"
  ) {
    throw new ApiError(403, "Not authorized to update this document");
  }

  doc.status = status;
  await doc.save();

  return res
    .status(200)
    .json(new ApiResponse(200, doc, "Document status updated successfully"));
});

export { uploadDocument, getDocuments, approveDocument, updateDocumentStatus };
