import axios from "axios";
import crypto from "crypto";
import { type ProxyConfig } from "./browser";

interface CacheEntry {
    working: boolean;
    expiresAt: number;
}

const zipCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Build the final proxy username by substituting the geo value.
 * - If the template contains {zip}, replace it with the zip code.
 * - If the template contains {state}, replace it with the state code.
 * - Otherwise, append the geo suffix (legacy fallback).
 */
export function buildGeoUsername(template: string, type: "zip" | "state" | "county", value: string, session: string): string {
    let username = template;

    // Replace specific geo placeholders
    if (type === "zip") {
        username = username.replace(/\{zip\}/g, value);
    } else if (type === "state") {
        username = username.replace(/\{state\}/g, value);
    } else if (type === "county") {
        username = username.replace(/\{county\}/g, value);
    }

    // Replace session placeholder
    username = username.replace(/\{session\}/g, session);

    // Legacy fallback for geo if no specific placeholder was found
    if (type === "zip" && !template.includes("{zip}") && !template.includes("{state}") && !template.includes("{county}")) {
        username = `${username}-zip-${value}`;
    } else if (type === "state" && !template.includes("{zip}") && !template.includes("{state}") && !template.includes("{county}")) {
        username = `${username}-state-${value}`;
    } else if (type === "county" && !template.includes("{zip}") && !template.includes("{state}") && !template.includes("{county}")) {
        username = `${username}-county-${value}`;
    }

    // Legacy fallback for session if no specific placeholder was found
    if (!template.includes("{session}") && session) {
        username = `${username}-session-${session}`;
    }

    return username;
}

/**
 * Attempt to use the ZIP proxy first, fall back to state proxy.
 * 
 * @param zip - ZIP code extracted from the form (can be null)
 * @param state - State code extracted from the form (can be null, e.g. "ca")
 * @param baseConfig - Base proxy host/port/password/type
 * @param zipUsernameTemplate - Username template for ZIP proxy (e.g. "user-zip-{zip}")
 * @param stateUsernameTemplate - Username template for State proxy (e.g. "user-state-{state}"), can be null
 */
export async function getWorkingProxy(
    zip: string | null,
    state: string | null,
    county: string | null,
    baseConfig: {
        host: string;
        port: number;
        password: string;
        type: string;
    },
    zipUsernameTemplate: string,
    stateUsernameTemplate: string | null = null,
    countyUsernameTemplate: string | null = null
): Promise<{
    primary: ProxyConfig;
    fallback: ProxyConfig | null;
    method: "zip" | "state" | "county" | "none";
}> {
    const { host, port, password, type } = baseConfig;
    const sessionId = crypto.randomBytes(4).toString("hex");

    let primaryProxy: ProxyConfig | null = null;
    let fallbackProxy: ProxyConfig | null = null;
    let method: "zip" | "state" | "county" | "none" = "none";

    // 1. Try ZIP proxy (Highest Priority)
    let zipWorks = false;
    if (zip && zipUsernameTemplate) {
        const cacheKey = `zip:${zip}:${zipUsernameTemplate}`;
        const cached = zipCache.get(cacheKey);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            zipWorks = cached.working;
        } else {
            const testSession = `test-${sessionId}`;
            const zipUsernameTest = buildGeoUsername(zipUsernameTemplate, "zip", zip, testSession);
            console.log(`[proxy] Testing ZIP proxy for ${zip}: ${zipUsernameTest}`);
            zipWorks = await testProxy(host, port, zipUsernameTest, password, type);
            zipCache.set(cacheKey, { working: zipWorks, expiresAt: now + CACHE_TTL });
        }

        if (zipWorks) {
            const zipUsername = buildGeoUsername(zipUsernameTemplate, "zip", zip, sessionId);
            primaryProxy = { host, port, username: zipUsername, password, protocol: type, label: `zip-${zip}` };
            console.log(`[proxy] ZIP proxy OK for ${zip} with session ${sessionId}`);
        } else {
            console.warn(`[proxy] ZIP proxy NOT working/available for ${zip}`);
        }
    }

    // 2. Try State proxy (Fallback or Primary if ZIP fails)
    let stateWorks = false;
    if (state && stateUsernameTemplate) {
        const cacheKey = `state:${state}:${stateUsernameTemplate}`;
        const cached = zipCache.get(cacheKey);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            stateWorks = cached.working;
        } else {
            const testSession = `test-${sessionId}`;
            const stateUsernameTest = buildGeoUsername(stateUsernameTemplate, "state", state, testSession);
            console.log(`[proxy] Testing State proxy for ${state}: ${stateUsernameTest}`);
            stateWorks = await testProxy(host, port, stateUsernameTest, password, type);
            zipCache.set(cacheKey, { working: stateWorks, expiresAt: now + CACHE_TTL });
        }

        if (stateWorks) {
            const stateUsername = buildGeoUsername(stateUsernameTemplate, "state", state, sessionId);
            const stateProxy = { host, port, username: stateUsername, password, protocol: type, label: `state-${state}` };
            if (zipWorks) fallbackProxy = stateProxy;
            else primaryProxy = stateProxy;
        } else {
            console.warn(`[proxy] State proxy NOT working/available for ${state}`);
        }
    }

    // 3. Try County proxy (Fallback if others fail)
    let countyWorks = false;
    if (county && countyUsernameTemplate) {
        const cacheKey = `county:${county}:${countyUsernameTemplate}`;
        const cached = zipCache.get(cacheKey);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            countyWorks = cached.working;
        } else {
            const testSession = `test-${sessionId}`;
            const countyUsernameTest = buildGeoUsername(countyUsernameTemplate, "county", county, testSession);
            console.log(`[proxy] Testing County proxy for ${county}: ${countyUsernameTest}`);
            countyWorks = await testProxy(host, port, countyUsernameTest, password, type);
            zipCache.set(cacheKey, { working: countyWorks, expiresAt: now + CACHE_TTL });
        }

        if (countyWorks) {
            const countyUsername = buildGeoUsername(countyUsernameTemplate, "county", county, sessionId);
            const countyProxy = { host, port, username: countyUsername, password, protocol: type, label: `county-${county}` };
            if (!primaryProxy) primaryProxy = countyProxy;
            else if (!fallbackProxy) fallbackProxy = countyProxy;
        } else {
            console.warn(`[proxy] County proxy NOT working/available for ${county}`);
        }
    }

    // 4. Finalize Primary and Fallback
    if (zipWorks && primaryProxy && primaryProxy.label?.startsWith("zip")) {
        // ZIP worked. Return ZIP as primary.
        return { primary: primaryProxy, fallback: (stateWorks || countyWorks ? fallbackProxy : null), method: "zip" };
    }

    if (stateWorks && primaryProxy && primaryProxy.label?.startsWith("state")) {
        // ZIP didn't work/exist, but State worked.
        return { primary: primaryProxy, fallback: (countyWorks ? fallbackProxy : null), method: "state" };
    }

    if (countyWorks && primaryProxy && primaryProxy.label?.startsWith("county")) {
        // Only County worked.
        return { primary: primaryProxy, fallback: null, method: "county" };
    }

    // 4. Final Fallback: Try a non-geo-targeted proxy (Best Effort)
    // If all geo-targeting attempts failed, we try the base proxy template
    // as it might still work or the provider might handle routing.
    const baseUsername = buildGeoUsername(zipUsernameTemplate, "zip", "any", sessionId);
    console.log(`[proxy] Geo-targeting failed. Attempting base proxy fallback: ${baseUsername}`);
    const baseWorks = await testProxy(host, port, baseUsername, password, type);

    if (baseWorks) {
        return {
            primary: { host, port, username: baseUsername, password, protocol: type, label: "fallback-base" },
            fallback: null,
            method: "none"
        };
    }

    // No targeting possible or all attempts failed including base fallback
    throw new Error(
        `Proxy resolution failed: ` +
        (zip ? `ZIP "${zip}" failed testing. ` : `No ZIP targeted proxy configured. `) +
        (state ? `State "${state}" failed testing. ` : `No State targeted proxy configured. `) +
        (county ? `County "${county}" failed testing.` : `No County targeted proxy configured.`)
    );
}

async function testProxy(host: string, port: number, user: string, pass: string, protocol: string): Promise<boolean> {
    const urls = [
        "https://api.ipify.org?format=json",
        "http://api.ipify.org?format=json"
    ];

    for (const url of urls) {
        try {
            await axios.get(url, {
                proxy: {
                    host,
                    port,
                    auth: { username: user, password: pass },
                    protocol: protocol || "http",
                },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                timeout: 15000,
            });
            console.log(`[proxy-tester] Proxy test SUCCEEDED for ${user} via ${url}`);
            return true;
        } catch (err: any) {
            console.warn(`[proxy-tester] Proxy test failed for ${user} via ${url}: ${err.message}${err.response ? ` (${err.response.status})` : ""}`);
        }
    }
    return false;
}

/** Clear the in-memory ZIP proxy cache (useful for testing) */
export function clearProxyCache() {
    zipCache.clear();
}
