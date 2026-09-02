import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const QuizResult = sequelize.define(
  "QuizResult",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quiz_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "quizzes",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_questions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "quiz_results",
    timestamps: false,
  },
);

export default QuizResult;
