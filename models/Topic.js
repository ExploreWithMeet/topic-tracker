const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Topic = sequelize.define(
    "Topic",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Topic name cannot be empty",
          },
          len: {
            args: [1, 255],
            msg: "Topic name must be between 1 and 255 characters",
          },
        },
      },
      status: {
        type: DataTypes.ENUM("incomplete", "complete"),
        defaultValue: "incomplete",
        allowNull: false,
      },
      date_added: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      date_completed: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "topics",
      indexes: [{ fields: ["status"] }, { fields: ["date_added"] }],
      hooks: {
        beforeUpdate: (topic) => {
          if (topic.changed("status")) {
            if (topic.status === "complete" && !topic.date_completed) {
              topic.date_completed = new Date();
            } else if (topic.status === "incomplete") {
              topic.date_completed = null;
            }
          }
        },
      },
    }
  );

  // Instance method to convert to JSON
  Topic.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    // Format dates for frontend
    if (values.date_added) {
      values.dateAdded = values.date_added.toISOString();
    }
    if (values.date_completed) {
      values.dateCompleted = values.date_completed.toISOString();
    }

    // Remove internal fields
    delete values.date_added;
    delete values.date_completed;
    delete values.created_at;
    delete values.updated_at;

    return values;
  };

  return Topic;
};
