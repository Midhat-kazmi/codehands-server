import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sql = readFileSync("db/schema.sql", "utf8");
await pool.query(sql);
console.log("Schema applied.");
await pool.end();