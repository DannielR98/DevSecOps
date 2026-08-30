import { Sequelize } from "sequelize";

const db = new Sequelize({
  dialect: "sqlite",
  storage: "./database/quiz.db",
  logging: false,
});

export default db;
