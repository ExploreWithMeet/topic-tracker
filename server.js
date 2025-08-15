require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const db = require("./models");
const topicRoutes = require("./routes/topics");
const { setupSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = setupSocket(server);

// Security middleware
// app.use(helmet());
// for development use you switch off CSP
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: "*", // Or explicitly your frontend's URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false, // Set true only if using cookies/auth
  })
);

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: "Too many requests from this IP" },
});
app.use(limiter);

// Body parsing
app.use(express.urlencoded({ extended: true }));

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Routes
app.use("/api/topics", topicRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error("Error during server close:", err);
      process.exit(1);
    }
    console.log("Server closed successfully");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("Database connected successfully");

    // Sync database
    await db.sequelize.sync();
    console.log("Database synchronized");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
