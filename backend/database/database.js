import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

let db;

if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
  const isRemote =
    databaseUrl.includes("supabase.co") ||
    databaseUrl.includes("supabase.com") ||
    databaseUrl.includes("sslmode=require") ||
    process.env.DB_SSL === "true";

  db = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    dialectOptions: isRemote
      ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
      : {},
  });
} else if (process.env.DB_HOST && process.env.DB_USER) {
  const isSsl = process.env.DB_SSL === "true";
  db = new Sequelize(
    process.env.DB_NAME || "quiz_devsecops",
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      dialect: "postgres",
      logging: process.env.DB_LOGGING === "true" ? console.log : false,
      dialectOptions: isSsl
        ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
        : {},
    },
  );
} else {
  // SQLite fallback for testing environments and offline development
  db = new Sequelize({
    dialect: "sqlite",
    storage: process.env.NODE_ENV === "test" ? ":memory:" : "./database/quiz.db",
    logging: false,
  });
}

export default db;
