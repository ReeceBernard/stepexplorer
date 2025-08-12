import cors from "cors";
import express from "express";
import helmet from "helmet";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Basic route
app.get("/api/test", (req, res) => {
  res.json({ message: "StepExplorer API is running!" });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});
