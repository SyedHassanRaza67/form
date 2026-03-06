
import { db } from "./server/db";
import { submissions } from "./shared/schema";
import { desc } from "drizzle-orm";
import fs from "fs";

async function checkSubmissions() {
    const latestSubmissions = await db.query.submissions.findMany({
        orderBy: [desc(submissions.createdAt)],
        limit: 10,
    });

    fs.writeFileSync("submissions_debug.json", JSON.stringify(latestSubmissions, null, 2));
    console.log("Submissions saved to submissions_debug.json");
    process.exit(0);
}

checkSubmissions().catch((err) => {
    console.error(err);
    process.exit(1);
});
