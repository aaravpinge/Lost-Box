import { type Express } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function registerUploadRoutes(app: Express) {
    // Step 1: Request upload URL
    app.post("/api/uploads/request-url", (req, res) => {
        const { name, contentType } = req.body;
        const fileId = randomUUID();
        const extension = path.extname(name);
        const fileName = `${fileId}${extension}`;

        // In local dev, the upload URL is just our own server
        const uploadURL = `/api/uploads/upload/${fileName}`;
        const objectPath = `/uploads/${fileName}`;

        res.json({
            uploadURL,
            objectPath,
            metadata: {
                name,
                contentType,
            },
        });
    });

    // Step 2: Handle the PUT upload
    app.put("/api/uploads/upload/:fileName", (req, res) => {
        const { fileName } = req.params;
        const filePath = path.join(UPLOADS_DIR, fileName);

        const writeStream = fs.createWriteStream(filePath);
        req.pipe(writeStream);

        writeStream.on("finish", () => {
            res.sendStatus(200);
        });

        writeStream.on("error", (err) => {
            console.error("Upload error:", err);
            res.status(500).json({ error: "Failed to save file" });
        });
    });

    // Serve uploaded files
    app.get("/uploads/:fileName", (req, res) => {
        const { fileName } = req.params;
        const filePath = path.join(UPLOADS_DIR, fileName);

        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send("Not found");
        }
    });
}
