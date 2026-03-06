
import { db } from "./server/db";
import { sites } from "./shared/schema";

async function checkSites() {
    const allSites = await db.query.sites.findMany();
    console.log(JSON.stringify(allSites, null, 2));
    process.exit(0);
}

checkSites().catch((err) => {
    console.error(err);
    process.exit(1);
});
