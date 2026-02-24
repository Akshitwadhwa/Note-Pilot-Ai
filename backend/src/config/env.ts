import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireDatabaseUrl(): string {
  const value = requireEnv("DATABASE_URL").trim();

  if (value.includes("[YOUR-PASSWORD]")) {
    throw new Error(
      "Invalid DATABASE_URL: replace [YOUR-PASSWORD] with your actual database password."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid DATABASE_URL: expected a valid PostgreSQL connection URL.");
  }

  // Supabase Postgres endpoints require SSL from external clients.
  if (
    parsed.hostname.endsWith(".supabase.co") &&
    !parsed.searchParams.has("sslmode")
  ) {
    parsed.searchParams.set("sslmode", "require");
    return parsed.toString();
  }

  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: requireDatabaseUrl(),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini"
};
