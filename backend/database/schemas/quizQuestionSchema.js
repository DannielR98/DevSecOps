import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const QuizQuestion = sequelize.define(
  "QuizQuestion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    quizId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "quizzes",
        key: "id",
      },
    },

    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    optionA: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    optionB: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    optionC: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    optionD: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    correctOption: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "1=A, 2=B, 3=C, 4=D",
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "quiz_questions",
    timestamps: false,
  },
);

export default QuizQuestion;
