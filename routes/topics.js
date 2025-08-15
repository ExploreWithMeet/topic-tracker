const express = require("express");
const router = express.Router();
const TopicController = require("../controllers/topicController");
const {
  validateTopic,
  validateTopicUpdate,
} = require("../middleware/validate");

// Get all topics
router.get("/", TopicController.getAllTopics);

// POST /api/topics - Create new topic
router.post("/", validateTopic, TopicController.createTopic);

// PUT /api/topics/:id - Update topic
router.put("/:id", validateTopicUpdate, TopicController.updateTopic);

// PATCH /api/topics/:id/status - Toggle topic status
router.patch("/:id/status", TopicController.toggleTopicStatus);

// DELETE /api/topics/:id - Delete topic
router.delete("/:id", TopicController.deleteTopic);

module.exports = router;
