import { type Express } from "express";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import path from "path";

export function registerUploadRoutes(app: Express) {
    // Step 1: Request upload URL
    app.post("/api/uploads/request-url", (req, res) => {
        const { name, contentType } = req.body;
        const fileId = randomUUID();
        const extension = path.extname(name);
        const fileName = `${fileId}${extension}`;

        // Return the API route where the PUT upload should happen
        const uploadURL = `/api/uploads/upload/${fileName}`;

        res.json({
            uploadURL,
            // objectPath is overridden in Step 2 by the Vercel Blob URL
            objectPath: "", 
            metadata: {
                name,
                contentType,
            },
        });
    });

    // Step 2: Handle the PUT upload directly to Vercel Blob
    app.put("/api/uploads/upload/:fileName", async (req, res) => {
        const { fileName } = req.params;

        try {
            const blob = await put(`uploads/${fileName}`, req, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            res.status(200).json({ url: blob.url });
        } catch (err) {
            console.error("Upload error:", err);
            res.status(500).json({ error: "Failed to save file to Vercel Blob" });
        }
    });
}
