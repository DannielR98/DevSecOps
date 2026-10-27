import { Sequelize } from "sequelize";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

const isSslRequired = () => {
  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") return true;
  if (process.env.DB_SSL === "false" || process.env.DB_SSL === "0") return false;
  const host = process.env.DB_HOST || "";
  // Supabase or remote cloud hosts require SSL
  if (host.includes("supabase.co") || host.includes("pooler.supabase.com")) return true;
  if (
    databaseUrl &&
    (databaseUrl.includes("supabase.co") ||
      databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("pooler.supabase.com"))
  ) {
    return true;
  }
  return false;
};

const sslOptions = isSslRequired()
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : {};

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: sslOptions,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || "quiz_app",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || "root",
    {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      dialect: "postgres",
      logging: false,
      dialectOptions: sslOptions,
    },
  );
}

export default sequelize;
