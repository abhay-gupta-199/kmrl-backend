import { Router } from "express";
import {
  uploadDocument,
  getDocuments,
  approveDocument,
  updateDocumentStatus,
} from "../controllers/document.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// RESTful endpoints
router.post("/upload", verifyJWT,upload.single("file"), uploadDocument); // POST /documents
router.get("/get-doc", verifyJWT, getDocuments); // GET /documents
router.post("/:docId/approve", verifyJWT, approveDocument); // POST /documents/:docId/approve
router.patch("/:docId/status", verifyJWT, updateDocumentStatus); // PATCH /documents/:docId/status

export default router;
