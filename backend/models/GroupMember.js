import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GroupMember = sequelize.define(
  "GroupMember",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    group_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "groups",
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
    role: {
      type: DataTypes.ENUM("member", "admin", "owner"),
      allowNull: false,
      defaultValue: "member",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "group_members",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["group_id", "user_id"],
      },
    ],
  },
);

export default GroupMember;
