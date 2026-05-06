// Loads .env for local `prisma migrate` / CLI. In Docker, DATABASE_URL comes from the environment;
// the dotenv package must still be present in the image (see Dockerfile COPY node_modules/dotenv).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
