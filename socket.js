const socketIo = require("socket.io");
const { Topic } = require("./models");

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5000",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join a room
    socket.join("topics");

    // Handle topic creation
    socket.on("create_topic", async (data) => {
      try {
        const topic = await Topic.create({
          name: data.name,
          status: "incomplete",
        });

        // Broadcast to all clients
        io.to("topics").emit("topic_created", topic.toJSON());

        socket.emit("operation_success", {
          type: "create",
          message: "Topic created successfully",
          topic: topic.toJSON(),
        });
      } catch (error) {
        console.error("Error creating topic:", error);
        socket.emit("operation_error", {
          type: "create",
          message: "Failed to create topic",
          error: error.message,
        });
      }
    });

    // Handle topic update
    socket.on("update_topic", async (data) => {
      try {
        const topic = await Topic.findByPk(data.id);
        if (!topic) {
          socket.emit("operation_error", {
            type: "update",
            message: "Topic not found",
          });
          return;
        }

        await topic.update({
          name: data.name || topic.name,
          status: data.status || topic.status,
        });

        // Broadcast to all clients
        io.to("topics").emit("topic_updated", topic.toJSON());

        socket.emit("operation_success", {
          type: "update",
          message: "Topic updated successfully",
          topic: topic.toJSON(),
        });
      } catch (error) {
        console.error("Error updating topic:", error);
        socket.emit("operation_error", {
          type: "update",
          message: "Failed to update topic",
          error: error.message,
        });
      }
    });

    // Handle topic status toggle
    socket.on("toggle_topic_status", async (data) => {
      try {
        const topic = await Topic.findByPk(data.id);
        if (!topic) {
          socket.emit("operation_error", {
            type: "toggle",
            message: "Topic not found",
          });
          return;
        }

        const newStatus =
          topic.status === "complete" ? "incomplete" : "complete";
        await topic.update({
          status: newStatus,
          date_completed: newStatus === "complete" ? new Date() : null,
        });

        // Broadcast to all clients
        io.to("topics").emit("topic_updated", topic.toJSON());

        socket.emit("operation_success", {
          type: "toggle",
          message: `Topic marked as ${newStatus}`,
          topic: topic.toJSON(),
        });
      } catch (error) {
        console.error("Error toggling topic status:", error);
        socket.emit("operation_error", {
          type: "toggle",
          message: "Failed to toggle topic status",
          error: error.message,
        });
      }
    });

    // Handle topic deletion
    socket.on("delete_topic", async (data) => {
      try {
        const topic = await Topic.findByPk(data.id);
        if (!topic) {
          socket.emit("operation_error", {
            type: "delete",
            message: "Topic not found",
          });
          return;
        }

        await topic.destroy();

        // Broadcast to all clients
        io.to("topics").emit("topic_deleted", { id: data.id });

        socket.emit("operation_success", {
          type: "delete",
          message: "Topic deleted successfully",
          id: data.id,
        });
      } catch (error) {
        console.error("Error deleting topic:", error);
        socket.emit("operation_error", {
          type: "delete",
          message: "Failed to delete topic",
          error: error.message,
        });
      }
    });

    // Handle get all topics
    socket.on("get_topics", async (filters = {}) => {
      try {
        const whereClause = {};

        if (
          filters.status &&
          ["complete", "incomplete"].includes(filters.status)
        ) {
          whereClause.status = filters.status;
        }

        const topics = await Topic.findAll({
          where: whereClause,
          order: [
            [filters.sortBy || "date_added", filters.sortOrder || "DESC"],
          ],
        });

        socket.emit(
          "topics_loaded",
          topics.map((topic) => topic.toJSON())
        );
      } catch (error) {
        console.error("Error fetching topics:", error);
        socket.emit("operation_error", {
          type: "fetch",
          message: "Failed to fetch topics",
          error: error.message,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

module.exports = { setupSocket };
