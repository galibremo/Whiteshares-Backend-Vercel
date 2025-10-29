const connectionString = process.env.DATABASE_URL;
const schemaPath = ["./src/models/drizzle"];
const migrationPath = "./.drizzle/migrations/";
var drizzle_config_default = {
  dialect: "postgresql",
  schema: schemaPath,
  out: migrationPath,
  dbCredentials: { url: connectionString },
  verbose: true,
  strict: true
};
export {
  drizzle_config_default as default
};
