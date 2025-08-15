import cors from "cors";
import express from "express";
import helmet from "helmet";
import userRoutes from "./routes/user/user";

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3005",
    "https://stepexplorer.com",
    "https://www.stepexplorer.com",
    "https://dy4dywaqklyn2.cloudfront.net",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Basic route
app.get("/test", (_, res) => {
  res.json({ message: "StepExplorer API is running!" });
});

// User routes
app.use("/users", userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 StepExplorer API running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
