import cors from "cors";
import express from "express";
import helmet from "helmet";
import userRoutes from "./routes/user/user";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Basic route
app.get("/api/test", (req, res) => {
  res.json({ message: "StepExplorer API is running!" });
});

// User routes
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 StepExplorer API running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
