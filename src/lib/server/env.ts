import { ConfigError } from "./errors";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(`Server isn't set up yet: ${name} is missing. See the README's setup steps.`);
  return value;
}

export function signupsOpen(): boolean {
  return (process.env.ALLOW_SIGNUPS ?? "true").toLowerCase() !== "false";
}
