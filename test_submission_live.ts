
import { autoFillForm } from "./server/browser";
import { db } from "./server/db";
import { sites } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testSubmission() {
    const [site] = await db.select().from(sites).where(eq(sites.url, "https://theprohomes.com/contact-us/"));

    if (!site) {
        console.error("Site not found");
        process.exit(1);
    }

    const fields = site.fields as any[];
    const formData: Record<string, string> = {
        "first-name-2": "Test",
        "last-name-2": "Agent",
        "email-2": "test@example.com",
        "phone-2": "5550199999",
        "zip": "90210",
        "consent": "on"
    };

    // Add some service types
    formData["serviceType_roofing"] = "on";

    console.log("Starting live submission test...");

    try {
        const result = await autoFillForm(
            site.url,
            fields,
            formData,
            site.submitSelector,
            null, // No proxy for this test to avoid network issues unless site blocks
            (progress) => {
                console.log(`[Progress] ${progress.percent}% - ${progress.step}: ${progress.detail}`);
            }
        );

        console.log("Submission Result:", JSON.stringify(result, null, 2));

        if (result.success) {
            console.log("SUCCESS: Form submitted successfully.");
            if (result.extractedData?.trusted_form_url) {
                console.log("SUCCESS: TrustedForm URL captured:", result.extractedData.trusted_form_url);
            } else {
                console.warn("WARNING: No TrustedForm URL captured. Check if the site uses TrustedForm.");
            }
        } else {
            console.error("FAILURE: Submission failed:", result.errorMessage);
        }
    } catch (err: any) {
        console.error("CRITICAL ERROR during test:", err.message);
    }

    process.exit(0);
}

testSubmission();
