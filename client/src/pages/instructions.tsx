import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Network, Zap, Info, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InstructionsPage() {
    const { toast } = useToast();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to clipboard",
            description: `Copied: ${text}`,
        });
    };

    const examples = [
        {
            title: "Residential Proxy (Rotating)",
            template: "username-zip-{zip}-session-{session}",
            description: "Standard rotating residential proxy with ZIP targeting and unique session for every request.",
            badge: "Recommended"
        },
        {
            title: "State Targeting (Fallback)",
            template: "username-state-{state}-session-{session}",
            description: "Used when ZIP isn't available. Targets the state specifically.",
            badge: "Fallback"
        },
        {
            title: "County Targeting (Fallback)",
            template: "username-county-{county}-session-{session}",
            description: "Used when both ZIP and State aren't available. Targets the county.",
            badge: "Fallback"
        },
        {
            title: "Datacenter / ISP",
            template: "username-session-{session}",
            description: "Simple session rotation. Note: This will only work if neither ZIP nor State targeting is required.",
            badge: "Basic"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Proxy Configuration Guide
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Learn how to set up geo-targeted proxy routing for maximum success.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Zap className="w-5 h-5" />
                            Core Concepts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm leading-relaxed">
                            Our system uses <strong>Dynamic Routing</strong>. When an agent submits a form, we extract the ZIP and State from the submitted data and inject them into your proxy username template.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-background">Prio 1: ZIP</Badge>
                            <Badge variant="outline" className="bg-background">Prio 2: State</Badge>
                            <Badge variant="outline" className="bg-background">Prio 3: County</Badge>
                            <Badge variant="outline" className="bg-background border-destructive/30 text-destructive">Prio 4: Fail</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                            Placeholders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                                <code className="text-primary font-bold">{`{zip}`}</code>
                                <span>Replaced by the 5-digit ZIP code from the form.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <code className="text-primary font-bold">{`{state}`}</code>
                                <span>Replaced by the 2-letter State code (e.g., CA, NY).</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <code className="text-primary font-bold">{`{county}`}</code>
                                <span>Replaced by the County name (e.g., orange, cook).</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <code className="text-primary font-bold">{`{session}`}</code>
                                <span>Replaced by a unique random string for EVERY submission to force IP rotation.</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Network className="w-5 h-5 text-primary" />
                    Username Template Examples
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {examples.map((example) => (
                        <Card key={example.title} className="hover:border-primary/50 transition-colors group">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm">{example.title}</h3>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{example.badge}</Badge>
                                </div>
                                <div
                                    className="bg-muted p-2 rounded text-[11px] font-mono break-all cursor-pointer hover:bg-muted/80 flex items-center justify-between"
                                    onClick={() => copyToClipboard(example.template)}
                                >
                                    <span className="truncate mr-2">{example.template}</span>
                                    <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[12px] text-muted-foreground leading-snug">
                                    {example.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Network className="w-5 h-5" />
                        Understanding IP Rotation (The {`{session}`} tag)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <p className="text-sm leading-relaxed">
                            Most residential proxy providers use <strong>Sticky Sessions</strong>. If you use the same username twice, they give you the same IP address. To get a <strong>Fresh IP</strong> for every form, you must change your session ID.
                        </p>
                        <div className="bg-background rounded-lg border p-4 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Example: 2 Parallel Submissions for ZIP 90210</h4>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Badge variant="outline" className="text-[10px]">Submission #1</Badge>
                                    <div className="p-2 bg-muted rounded font-mono text-[11px] space-y-1">
                                        <p className="text-muted-foreground opacity-50 line-through">Template: user-zip-{"{zip}"}-sess-{"{session}"}</p>
                                        <p className="text-primary font-bold">Result: user-zip-90210-sess-a1b2c3d4</p>
                                        <p className="text-emerald-500 font-bold border-t pt-1">✅ assigned IP: 192.168.1.5</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Badge variant="outline" className="text-[10px]">Submission #2</Badge>
                                    <div className="p-2 bg-muted rounded font-mono text-[11px] space-y-1">
                                        <p className="text-muted-foreground opacity-50 line-through">Template: user-zip-{"{zip}"}-sess-{"{session}"}</p>
                                        <p className="text-primary font-bold">Result: user-zip-90210-sess-e5f6g7h8</p>
                                        <p className="text-emerald-500 font-bold border-t pt-1">✅ assigned IP: 203.0.113.42</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">
                                * Because the session ID changed from <code>a1b2c3d4</code> to <code>e5f6g7h8</code>, the provider rotated the IP automatically.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-2">
                            <h4 className="font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Without Session Tag
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                If you only use <code>user-zip-{"{zip}"}</code>, every submission for ZIP <code>90210</code> will use the exact same username, and your provider will likely keep giving you the <strong>same flagged IP</strong>.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                With Session Tag
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Including <code>{"{session}"}</code> ensures our system generates a random key for every single browser instance, forcing a <strong>100% fresh connection</strong>.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-amber-600 flex items-center gap-2 text-lg">
                        <AlertCircle className="w-5 h-5" />
                        Additional Necessary Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h4 className="font-bold">1. Proxy Testing</h4>
                            <p className="text-muted-foreground leading-relaxed">
                                Use the <strong>"Test Proxy"</strong> button in your Proxy Settings. It will simulate a submission with a test ZIP/State to verify that your provider accepts the username format.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold">2. Strict Priority Flow</h4>
                            <p className="text-muted-foreground leading-relaxed">
                                Our system enforces a strict priority: <strong>ZIP</strong> (1) &gt; <strong>State</strong> (2) &gt; <strong>County</strong> (3). If none of these satisfy connectivity tests or aren't provided, the submission will <strong>Fail</strong>.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold">3. Form Field Mapping</h4>
                            <p className="text-muted-foreground leading-relaxed">
                                Ensure your sites have fields correctly labeled or with the "Geo Role" (ZIP/State) assigned. The system uses these roles to extract data for your proxy templates.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold">4. Proxy Type</h4>
                            <p className="text-muted-foreground leading-relaxed">
                                We support HTTP, HTTPS, and SOCKS5. Residential proxies work best with HTTP/HTTPS for geo-targeting.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/20">
                <div className="text-center space-y-2">
                    <Info className="w-10 h-10 text-primary mx-auto opacity-40" />
                    <h3 className="font-semibold">Need help with your proxy provider?</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Most providers (like Bright Data, Oxylabs, or Smartproxy) use the semicolon <code>:</code> or dash <code>-</code> to separate parameters in the username. Check their documentation for specific string formats.
                    </p>
                </div>
            </div>
        </div>
    );
}
