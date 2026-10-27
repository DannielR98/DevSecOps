import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const QuizResult = sequelize.define(
  "QuizResult",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quiz_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "quizzes",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    total_questions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "quiz_results",
    timestamps: false,
  },
);

export default QuizResult;
