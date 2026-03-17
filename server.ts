import express from "express";
import { createServer as createViteServer } from "vite";
import archiver from "archiver";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/bulk-download", async (req, res) => {
    const { files } = req.body; // Expecting { files: [{ url: string, name: string }] }
    
    if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: "Invalid request" });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('documents.zip');
    archive.pipe(res);

    for (const file of files) {
        try {
            const response = await axios.get(file.url, { responseType: 'stream' });
            archive.append(response.data, { name: file.name });
        } catch (error) {
            console.error(`Error downloading ${file.name}:`, error);
        }
    }

    await archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
