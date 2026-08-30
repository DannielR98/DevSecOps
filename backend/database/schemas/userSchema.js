import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    firstname: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    surname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },

    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },

    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  },
);

export default User;
