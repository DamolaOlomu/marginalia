// Checks that Postgres and R2 are reachable and configured. Run: npm run doctor
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

let failed = false;
const ok = (m) => console.log(`  ✓ ${m}`);
const no = (m) => {
  failed = true;
  console.log(`  ✗ ${m}`);
};

console.log("\nEnvironment");
const need = ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const missing = need.filter((n) => !process.env[n]);
if (missing.length) no(`Missing in .env.local: ${missing.join(", ")}`);
else ok("All required variables are set");

if (process.env.DATABASE_URL) {
  console.log("\nPostgres");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    ok("Connected");
    const { rows } = await client.query(
      "select to_regclass('public.users') as u, to_regclass('public.sessions') as s, to_regclass('public.commentaries') as c",
    );
    if (rows[0].u && rows[0].s && rows[0].c) ok("Tables exist");
    else no("Tables are missing. Run: npm run db:migrate");
  } catch (e) {
    no(`Could not connect: ${e instanceof Error ? e.message : e}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (need.slice(1).every((n) => process.env[n])) {
  console.log("\nCloudflare R2");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET }));
    ok(`Bucket "${process.env.R2_BUCKET}" is reachable with these credentials`);
  } catch (e) {
    no(`Could not reach the bucket: ${e instanceof Error ? e.message : e}`);
  }
  console.log("  • Not checkable from here: the bucket's CORS rule. Browser uploads fail without it (see README, step 4).");
}

console.log(failed ? "\nSomething needs attention (see ✗ above).\n" : "\nAll good. Start the app with: npm run dev\n");
process.exitCode = failed ? 1 : 0;
