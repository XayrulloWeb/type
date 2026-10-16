const required = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "PASSWORD_ENCRYPTION_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing production variables: ${missing.join(", ")}`);
if (!process.env.NEXTAUTH_URL.startsWith("https://")) throw new Error("NEXTAUTH_URL must use HTTPS.");
if (process.env.NEXTAUTH_SECRET.length < 32) throw new Error("NEXTAUTH_SECRET must contain at least 32 characters.");
if (process.env.PASSWORD_ENCRYPTION_KEY.length < 32) throw new Error("PASSWORD_ENCRYPTION_KEY must contain at least 32 characters.");
console.log("Production environment looks valid.");
