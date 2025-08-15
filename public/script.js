class TopicTracker {
  constructor() {
    this.topics = [];
    this.currentFilter = "all";
    this.currentSort = "date-desc";
    this.socket = null;

    this.initializeSocket();
    this.initializeElements();
    this.bindEvents();
  }

  initializeSocket() {
    // Connect to the backend socket server
    this.socket = io("http://localhost:5000");

    // Socket event listeners
    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.loadTopics(); // Load topics when connected
      this.showNotification("Connected to server", "success");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
      this.showNotification("Disconnected from server", "warning");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection failed:", error);
      this.showNotification("Failed to connect to server", "error");
    });

    // Listen for topic events from your backend
    this.socket.on("topic_created", (topic) => {
      // console.log("Topic created:", topic);
      this.topics.push(topic);
      this.renderTopics();
      this.showNotification("Topic added successfully", "success");
    });

    this.socket.on("topic_updated", (updatedTopic) => {
      // console.log("Topic updated:", updatedTopic);
      const index = this.topics.findIndex((t) => t.id === updatedTopic.id);
      if (index !== -1) {
        this.topics[index] = updatedTopic;
        this.renderTopics();
        this.showNotification("Topic updated successfully", "success");
      }
    });

    this.socket.on("topic_deleted", (data) => {
      // console.log("Topic deleted:", data);
      const topicId = data.id;
      this.topics = this.topics.filter((t) => t.id !== topicId);
      this.renderTopics();
      this.showNotification("Topic deleted successfully", "success");
    });

    this.socket.on("topics_loaded", (topics) => {
      // console.log("Topics loaded:", topics);
      this.topics = topics;
      this.renderTopics();
    });

    // Listen for operation responses
    this.socket.on("operation_success", (response) => {
      // console.log("Operation success:", response);
      this.showNotification(response.message, "success");
    });

    this.socket.on("operation_error", (error) => {
      // console.error("Operation error:", error);
      this.showNotification(error.message || "Operation failed", "error");
    });

    // Handle general errors
    this.socket.on("error", (error) => {
      // console.error("Socket error:", error);
      this.showNotification("Connection error", "error");
    });
  }

  initializeElements() {
    this.topicInput = document.getElementById("topicInput");
    this.clearInput = document.getElementById("clear-inp");
    this.topicList = document.getElementById("topicList");
    this.filterDateBtn = document.getElementById("filter-date-up");
    this.statusFilterBtn = document.getElementById("all-status-done");
  }

  bindEvents() {
    // Input events
    this.topicInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.addTopic();
      }
    });

    this.clearInput.addEventListener("click", () => {
      this.topicInput.value = "";
      this.topicInput.focus();
    });

    // Filter events
    this.filterDateBtn.addEventListener("click", () => {
      this.toggleDateSort();
    });

    this.statusFilterBtn.addEventListener("click", () => {
      this.toggleStatusFilter();
    });
  }

  loadTopics() {
    if (this.socket && this.socket.connected) {
      // console.log("Loading topics from server...");
      this.socket.emit("get_topics", {
        status: this.currentFilter === "all" ? null : this.currentFilter,
        sortBy: "date_added",
        sortOrder: this.currentSort === "date-desc" ? "DESC" : "ASC",
      });
    }
  }

  addTopic() {
    const topicName = this.topicInput.value.trim();
    if (!topicName) return;

    if (this.socket && this.socket.connected) {
      // console.log("Creating topic:", topicName);
      this.socket.emit("create_topic", {
        name: topicName,
      });
      this.topicInput.value = "";
    } else {
      this.showNotification("Not connected to server", "error");
    }
  }

  deleteTopic(id) {
    if (this.socket && this.socket.connected) {
      // console.log("Deleting topic:", id);
      this.socket.emit("delete_topic", { id });
    } else {
      this.showNotification("Not connected to server", "error");
    }
  }

  toggleTopicStatus(id) {
    if (this.socket && this.socket.connected) {
      // console.log("Toggling topic status:", id);
      this.socket.emit("toggle_topic_status", { id });
    } else {
      this.showNotification("Not connected to server", "error");
    }
  }

  editTopic(id, newName) {
    if (this.socket && this.socket.connected) {
      // console.log("Updating topic:", id, newName);
      this.socket.emit("update_topic", {
        id,
        name: newName,
      });
    } else {
      this.showNotification("Not connected to server", "error");
    }
  }

  toggleDateSort() {
    if (this.currentSort === "date-desc") {
      this.currentSort = "date-asc";
      this.filterDateBtn.textContent = "Date ↓";
      this.filterDateBtn.id = "filter-date-down";
    } else {
      this.currentSort = "date-desc";
      this.filterDateBtn.textContent = "Date ↑";
      this.filterDateBtn.id = "filter-date-up";
    }
    this.loadTopics(); // Reload with new sort order
  }

  toggleStatusFilter() {
    if (this.currentFilter === "all") {
      this.currentFilter = "complete";
      this.statusFilterBtn.textContent = "Done";
      this.statusFilterBtn.id = "all-status-done";
    } else if (this.currentFilter === "complete") {
      this.currentFilter = "incomplete";
      this.statusFilterBtn.textContent = "Incomplete";
      this.statusFilterBtn.id = "all-status-incomplete";
    } else {
      this.currentFilter = "all";
      this.statusFilterBtn.textContent = "All";
      this.statusFilterBtn.id = "all-status-done";
    }
    this.loadTopics(); // Reload with new filter
  }

  getFilteredAndSortedTopics() {
    let filteredTopics = [...this.topics];

    // Filter by status
    if (this.currentFilter === "complete") {
      filteredTopics = filteredTopics.filter(
        (topic) => topic.status === "complete"
      );
    } else if (this.currentFilter === "incomplete") {
      filteredTopics = filteredTopics.filter(
        (topic) => topic.status === "incomplete"
      );
    }

    // Sort by date
    if (this.currentSort === "date-desc") {
      filteredTopics.sort((a, b) => {
        const dateA = new Date(
          a.dateAdded || a.date_added || a.createdAt || a.created_at
        );
        const dateB = new Date(
          b.dateAdded || b.date_added || b.createdAt || b.created_at
        );
        return dateB - dateA;
      });
    } else {
      filteredTopics.sort((a, b) => {
        const dateA = new Date(
          a.dateAdded || a.date_added || a.createdAt || a.created_at
        );
        const dateB = new Date(
          b.dateAdded || b.date_added || b.createdAt || b.created_at
        );
        return dateA - dateB;
      });
    }

    return filteredTopics;
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  createTopicElement(topic, index) {
    const topicDiv = document.createElement("div");
    topicDiv.className = `topic ${topic.status}`;

    const statusIcon = topic.status === "complete" ? "✓" : "○";
    const statusClass = topic.status === "complete" ? "complete" : "incomplete";

    // Handle different possible date field names from your backend
    const dateAdded =
      topic.dateAdded ||
      topic.date_added ||
      topic.createdAt ||
      topic.created_at;
    const dateCompleted =
      topic.dateCompleted ||
      topic.date_completed ||
      topic.completedAt ||
      topic.completed_at;

    topicDiv.innerHTML = `
            <div class="topic-info">
                <div class="topic-name" data-id="${topic.id}">
                    ${index + 1}. ${topic.name}
                </div>
                <div class="topic-meta">
                    <span class="topic-date">Added: ${this.formatDate(
                      dateAdded
                    )}</span>
                    ${
                      dateCompleted
                        ? `<span class="topic-completed">Completed: ${this.formatDate(
                            dateCompleted
                          )}</span>`
                        : ""
                    }
                    <span class="topic-status ${statusClass}">${statusIcon} ${
      topic.status
    }</span>
                </div>
            </div>
            <div class="topic-actions">
                <button class="editBtn" onclick="topicTracker.startEdit('${
                  topic.id
                }')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                        <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                    </svg>
                </button>
                <button class="deleteBtn" onclick="topicTracker.deleteTopic('${
                  topic.id
                }')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                    </svg>
                </button>
                <button class="${
                  topic.status === "complete" ? "incompleteBtn" : "doneBtn"
                }" onclick="topicTracker.toggleTopicStatus('${topic.id}')">
                    ${
                      topic.status === "complete"
                        ? `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                        </svg>
                    `
                        : `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2" viewBox="0 0 16 16">
                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/>
                        </svg>
                    `
                    }
                </button>
            </div>
        `;

    return topicDiv;
  }

  startEdit(id) {
    const topic = this.topics.find((t) => t.id === id);
    if (!topic) return;

    const topicNameElement = document.querySelector(`[data-id="${id}"]`);
    const originalName = topic.name;

    // Extract just the topic name without the number
    const nameWithoutNumber = originalName.replace(/^\d+\.\s*/, "");

    const input = document.createElement("input");
    input.type = "text";
    input.value = nameWithoutNumber;
    input.className = "edit-input";
    input.style.cssText = `
            width: 100%;
            padding: 5px;
            font-size: 18px;
            border: 2px solid #2196f3;
            border-radius: 5px;
            background: white;
            outline: none;
        `;

    const saveEdit = () => {
      const newName = input.value.trim();
      if (newName && newName !== nameWithoutNumber) {
        this.editTopic(id, newName);
      } else {
        this.renderTopics();
      }
    };

    const cancelEdit = () => {
      this.renderTopics();
    };

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    });

    input.addEventListener("blur", saveEdit);

    topicNameElement.innerHTML = "";
    topicNameElement.appendChild(input);
    input.focus();
    input.select();
  }

  renderTopics() {
    const topics = this.getFilteredAndSortedTopics();
    this.topicList.innerHTML = "";

    if (topics.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.style.cssText = `
                text-align: center;
                color: #ccc;
                font-size: 18px;
                margin-top: 50px;
                font-style: italic;
            `;
      emptyMessage.textContent =
        this.currentFilter === "all"
          ? "No topics added yet. Start learning something new!"
          : `No ${this.currentFilter} topics found.`;
      this.topicList.appendChild(emptyMessage);
      return;
    }

    topics.forEach((topic, index) => {
      const topicElement = this.createTopicElement(topic, index);
      this.topicList.appendChild(topicElement);
    });
  }

  showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => notification.remove());

    // Create new notification
    const notificationDiv = document.createElement("div");
    notificationDiv.className = "notification";

    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196F3",
    };

    notificationDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      font-weight: 500;
    `;

    // Add CSS animation if not already added
    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notificationDiv.parentNode) {
        notificationDiv.style.animation = "slideIn 0.3s ease-out reverse";
        setTimeout(() => {
          notificationDiv.remove();
        }, 300);
      }
    }, 4000);
  }

  // Method to reconnect if connection is lost
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    setTimeout(() => {
      this.initializeSocket();
    }, 1000);
  }

  // Method to refresh data from server
  refreshData() {
    this.loadTopics();
    this.showNotification("Data refreshed", "info");
  }
}

// Initialize the app when the page loads
let topicTracker;
document.addEventListener("DOMContentLoaded", () => {
  topicTracker = new TopicTracker();

  // Add connection status indicator
  const connectionStatus = document.createElement("div");
  connectionStatus.id = "connection-status";
  connectionStatus.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    z-index: 999;
    background: #4CAF50;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  connectionStatus.textContent = "● Connected";
  document.body.appendChild(connectionStatus);

  // Update connection status based on socket events
  if (topicTracker.socket) {
    topicTracker.socket.on("connect", () => {
      connectionStatus.style.background = "#4CAF50";
      connectionStatus.textContent = "● Connected";
      connectionStatus.onclick = null;
    });

    topicTracker.socket.on("disconnect", () => {
      connectionStatus.style.background = "#f44336";
      connectionStatus.textContent = "● Disconnected";
      connectionStatus.style.cursor = "pointer";
      connectionStatus.onclick = () => topicTracker.reconnect();
      connectionStatus.title = "Click to reconnect";
    });

    topicTracker.socket.on("connect_error", () => {
      connectionStatus.style.background = "#ff9800";
      connectionStatus.textContent = "● Connection Error";
      connectionStatus.style.cursor = "pointer";
      connectionStatus.onclick = () => topicTracker.reconnect();
      connectionStatus.title = "Click to reconnect";
    });
  }

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + R to refresh data
    if ((e.ctrlKey || e.metaKey) && e.key === "r") {
      e.preventDefault();
      topicTracker.refreshData();
    }

    // Focus input on '/' key
    if (e.key === "/" && document.activeElement !== topicTracker.topicInput) {
      e.preventDefault();
      topicTracker.topicInput.focus();
    }
  });
});

// Export for potential module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = TopicTracker;
}
