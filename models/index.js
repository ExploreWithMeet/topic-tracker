const { Sequelize } = require("sequelize");
const config =
  require("../config/database")[process.env.NODE_ENV || "development"];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Import models
const Topic = require("./Topic")(sequelize);

// Add models to db object
db.Topic = Topic;

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
