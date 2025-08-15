const { Topic } = require("../models");
const { validationResult } = require("express-validator");
const { Op, where } = require("sequelize");

class TopicController {
  // GET /api/topics
  static async getAllTopics(req, res) {
    try {
      const {
        status,
        sortBy = "date_added",
        sortOrder = "DESC",
        search,
      } = req.query;

      const whereClause = {};

      // Filter by status
      if (status && ["complete", "incomplete"].includes(status)) {
        whereClause.status = status;
      }

      // Sorting
      const validSortFields = [
        "date_added",
        "date_completed",
        "name",
        "status",
      ];
      const sortField = validSortFields.includes(sortBy)
        ? sortBy
        : "date_added";
      const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const topics = await Topic.findAll({
        where: whereClause,
        order: [[sortField, order]],
      });

      res.json({
        success: true,
        data: topics.map((topic) => topic.toJSON()),
        count: topics.length,
      });
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch topics",
      });
    }
  }

  // POST /api/topics
  static async createTopic(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { name } = req.body;

      const topic = await Topic.create({
        name,
        status: "incomplete",
      });

      // Emit socket event to notify all clients
      req.io.to("topics").emit("topic_created", topic.toJSON());

      return res.status(201).json({
        success: true,
        data: topic.toJSON(),
        message: "Topic created successfully",
      });
    } catch (error) {
      console.error("Error creating topic:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create topic",
      });
    }
  }

  // PUT /api/topics/:id
  static async updateTopic(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { id } = req.params;
      const { name, status } = req.body;

      const topic = await Topic.findByPk(id);
      if (!topic) {
        return res.status(404).json({
          success: false,
          error: "Topic not found",
        });
      }

      await topic.update({
        name: name || topic.name,
        status: status || topic.status,
      });

      // Emit socket event
      req.io.to("topics").emit("topic_updated", topic.toJSON());

      res.json({
        success: true,
        data: topic.toJSON(),
        message: "Topic updated successfully",
      });
    } catch (error) {
      console.error("Error updating topic:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update topic",
      });
    }
  }

  // PATCH /api/topics/:id/status
  static async toggleTopicStatus(req, res) {
    try {
      const { id } = req.params;

      const topic = await Topic.findByPk(id);
      if (!topic) {
        return res.status(404).json({
          success: false,
          error: "Topic not found",
        });
      }

      const newStatus = topic.status === "complete" ? "incomplete" : "complete";
      await topic.update({
        status: newStatus,
        date_completed: newStatus === "complete" ? new Date() : null,
      });

      // Emit socket event
      req.io.to("topics").emit("topic_updated", topic.toJSON());

      res.json({
        success: true,
        data: topic.toJSON(),
        message: `Topic marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error toggling topic status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to toggle topic status",
      });
    }
  }

  // DELETE /api/topics/:id
  static async deleteTopic(req, res) {
    try {
      const { id } = req.params;

      const topic = await Topic.findByPk(id);
      if (!topic) {
        return res.status(404).json({
          success: false,
          error: "Topic not found",
        });
      }

      await topic.destroy();

      // Emit socket event
      req.io.to("topics").emit("topic_deleted", { id });

      res.json({
        success: true,
        message: "Topic deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting topic:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete topic",
      });
    }
  }

  // GET /api/topics/stats
  static async getTopicStats(req, res) {
    try {
      const totalTopics = await Topic.count();
      const completedTopics = await Topic.count({
        where: { status: "complete" },
      });
      const incompleteTopics = await Topic.count({
        where: { status: "incomplete" },
      });

      res.json({
        success: true,
        data: {
          total: totalTopics,
          completed: completedTopics,
          incomplete: incompleteTopics,
          completionRate:
            totalTopics > 0
              ? Math.round((completedTopics / totalTopics) * 100)
              : 0,
        },
      });
    } catch (error) {
      console.error("Error fetching topic stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch topic statistics",
      });
    }
  }
}

module.exports = TopicController;
