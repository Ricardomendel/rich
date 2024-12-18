// src/controllers/documentController.js
const Document = require("../models/Document");
const fs = require("fs");
const path = require("path");

const documentController = {
  // Upload document
  async uploadDocument(req, res) {
    try {
      console.log("Starting upload process...");
      console.log("Request file:", req.file);
      console.log("Request body:", req.body);
      console.log("User:", req.user);

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create new document
      const document = new Document({
        title: req.body.title || req.file.originalname,
        fileName: req.file.filename,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        fileSize: req.file.size,
        category: req.body.category || "other",
        tags: req.body.tags
          ? req.body.tags.split(",").map((tag) => tag.trim())
          : [],
        createdBy: req.user._id,
      });

      console.log("Document to save:", document);
      await document.save();
      console.log("Document saved successfully");

      res.status(201).json({
        message: "Document uploaded successfully",
        document: {
          id: document._id,
          title: document.title,
          fileName: document.fileName,
          category: document.category,
          tags: document.tags,
          createdAt: document.createdAt,
        },
      });
    } catch (error) {
      console.error("Upload error details:", error);

      // If file was uploaded but database save failed, remove the file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error removing file:", unlinkError);
        }
      }

      res.status(500).json({
        error: "Error uploading document",
        details: error.message,
      });
    }
  },

  // Get all documents
  async getAllDocuments(req, res) {
    try {
      const { userId } = req.query;
      const filter =
        req.user.role === "boss"
          ? userId
            ? { createdBy: userId }
            : {}
          : { createdBy: req.user._id };

      const documents = await Document.find(filter)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      res.json({ documents });
    } catch (error) {
      console.error("Error getting documents:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get single document
  async getDocument(req, res) {
    try {
      const document = await Document.findById(req.params.id).lean().exec();

      if (!document || document.createdBy.toString() !== req.user._id.toString()) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({ document });
    } catch (error) {
      console.error("Error getting document:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Download document
  async downloadDocument(req, res) {
    try {
      const document = await Document.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      }).lean().exec();

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const { filePath, fileType, fileName, fileSize } = document;

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          return res.status(404).json({ error: "File not found on server" });
        }

        res.setHeader("Content-Type", fileType);
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Length", fileSize);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Error downloading document" });
    }
  },

  // Delete document
  async deleteDocument(req, res) {
    try {
      const document = await Document.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete file from storage
      if (document.filePath) {
        const filePath = path.join(__dirname, "..", "..", document.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Delete document from database
      await Document.deleteOne({ _id: document._id });

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  },
  // src/controllers/documentController.js
  async approveDocument(req, res) {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;

      if (req.user.role !== "boss") {
        return res
          .status(403)
          .json({ error: "Only bosses can approve documents" });
      }

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      document.approvalStatus = status;
      document.approvalComments = comments || "";
      document.approvedBy = req.user._id;
      document.approvalDate = new Date();

      await document.save();

      res.json({ document });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async printDocument(req, res) {
    try {
      const document = await Document.findById(req.params.id);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.approvalStatus !== "approved") {
        return res
          .status(403)
          .json({ error: "Document must be approved before printing" });
      }

      // Increment print count and update last printed date
      document.printCount += 1;
      document.lastPrintedAt = new Date();
      await document.save();

      res.json({
        message: "Document printed successfully",
        url: `${process.env.SERVER_URL}/uploads/${document.fileName}`,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

// Create uploads directory if it doesn't exist
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
module.exports = documentController;
