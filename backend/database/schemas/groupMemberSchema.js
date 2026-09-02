import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const GroupMember = sequelize.define(
  "GroupMember",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "groups",
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
    role: {
      type: DataTypes.STRING,
      defaultValue: "member",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "group_members",
    timestamps: false,
  },
);

export default GroupMember;
