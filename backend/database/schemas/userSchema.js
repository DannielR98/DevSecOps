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

    supabase_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },

    firstname: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    surname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    username: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    email: {
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

User.findByAuthId = function (authId) {
  return User.findOne({
    where: {
      supabase_id: authId,
    },
  });
};

export default User;
