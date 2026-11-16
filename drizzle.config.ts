import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/**/*.ts",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_EZx4madXA8jt@ep-flat-star-b93tfjfy.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full",
  }
});