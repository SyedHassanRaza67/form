import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Star, Send, Loader2, FileText, Clock, MapPin, Shield,
  Monitor, Camera, CheckCircle2, XCircle, Timer, Eye, EyeOff
} from "lucide-react";
import type { FormField, Site, Submission } from "@shared/schema";

const ZIP_FIELDS = ["zip", "zipcode", "zip_code", "postal", "postalcode", "postal_code"];
const STATE_FIELDS = ["state", "state_name"];

interface AutoFillProgress {
  step: string;
  detail: string;
  percent: number;
  timestamp: number;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<AutoFillProgress[]>([]);
  const [currentProgress, setCurrentProgress] = useState<AutoFillProgress | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  const sitesQuery = useQuery<Site[]>({ queryKey: ["/api/agent/sites"] });
  const submissionsQuery = useQuery<Submission[]>({ queryKey: ["/api/agent/submissions"] });

  const connectSSE = useCallback((submissionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem("proxyform_token");
    if (!token) return;
    const es = new EventSource(`/api/agent/submissions/${submissionId}/progress?token=${token}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const progress: AutoFillProgress = JSON.parse(event.data);
        setCurrentProgress(progress);
        setProgressUpdates((prev) => [...prev, progress]);

        if (progress.step === "complete" || progress.step === "error") {
          es.close();
          eventSourceRef.current = null;
          queryClient.invalidateQueries({ queryKey: ["/api/agent/submissions"] });

          if (progress.step === "complete") {
            toast({ title: "Auto-fill complete", description: progress.detail });
          } else {
            toast({ title: "Auto-fill failed", description: progress.detail, variant: "destructive" });
          }
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [toast]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (progressContainerRef.current) {
      progressContainerRef.current.scrollTop = progressContainerRef.current.scrollHeight;
    }
  }, [progressUpdates]);

  const sites = sitesQuery.data || [];
  const expandedSite = sites.find((s) => s.id === expandedSiteId) || null;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/submissions", {
        siteId: expandedSite?.id,
        formData,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setActiveSubmissionId(data.id);
      setProgressUpdates([]);
      setCurrentProgress(null);
      setFormData({});
      connectSSE(data.id);

      const locationMsg = data.proxyLocation
        ? ` | Geo: ${data.proxyLocation}`
        : "";
      toast({ title: `Submission started${locationMsg}` });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const isZipField = (name: string) => ZIP_FIELDS.includes(name.toLowerCase());
  const isStateField = (name: string) => STATE_FIELDS.includes(name.toLowerCase());
  const isGeoField = (name: string) => isZipField(name) || isStateField(name);

  const expandedFields = expandedSite ? ((expandedSite.fields as FormField[]) || []) : [];

  const geoPreview = useMemo(() => {
    for (const key of Object.keys(formData)) {
      if (isZipField(key) && formData[key]?.trim()) {
        return { type: "zip" as const, value: formData[key].trim(), field: key };
      }
    }
    for (const key of Object.keys(formData)) {
      if (isStateField(key) && formData[key]?.trim()) {
        return { type: "state" as const, value: formData[key].trim().toLowerCase().replace(/\s+/g, "_"), field: key };
      }
    }
    return null;
  }, [formData]);

  const hasGeoFields = expandedFields.some((f) => isGeoField(f.name));
  const isRunning = activeSubmissionId && currentProgress && currentProgress.step !== "complete" && currentProgress.step !== "error";

  const handleToggleSite = (siteId: string) => {
    if (expandedSiteId === siteId) {
      setExpandedSiteId(null);
      setFormData({});
    } else {
      setExpandedSiteId(siteId);
      setFormData({});
    }
  };

  if (sitesQuery.isLoading) {
    return (
      <div className="space-y-4 p-6" data-testid="agent-dashboard">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="agent-dashboard">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h3 className="font-semibold text-lg text-foreground mb-2">No Sites Assigned</h3>
            <p className="text-sm">Contact your account manager to get sites assigned to you</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="agent-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a site to fill and submit its form
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Assigned Sites</h3>
        {sites.map((site) => {
          const siteFields = (site.fields as FormField[]) || [];
          const isExpanded = expandedSiteId === site.id;

          return (
            <Card key={site.id} data-testid={`card-site-${site.id}`}>
              <CardContent className="p-0">
                <button
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
                  onClick={() => handleToggleSite(site.id)}
                  data-testid={`button-toggle-site-${site.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{siteFields.length} fields</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {isExpanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                      {isExpanded ? "Close" : "View Form"}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-4 space-y-4">
                    <p className="text-xs text-muted-foreground">{site.url}</p>

                    {siteFields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <div key={field.name} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">
                              {field.label || field.name}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            {isZipField(field.name) && (
                              <Badge variant="default" className="text-xs gap-1" data-testid={`badge-geo-${field.name}`}>
                                <Star className="w-3 h-3" />
                                PROXY TRIGGER
                              </Badge>
                            )}
                            {isStateField(field.name) && (
                              <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-geo-${field.name}`}>
                                <MapPin className="w-3 h-3" />
                                GEO TRIGGER
                              </Badge>
                            )}
                          </div>

                          {field.type === "checkbox" ? (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={formData[field.name] === (field.options?.[0] || "true")}
                                onCheckedChange={(checked) =>
                                  setFormData({
                                    ...formData,
                                    [field.name]: checked ? (field.options?.[0] || "true") : "",
                                  })
                                }
                                data-testid={`checkbox-field-${field.name}`}
                              />
                              <span className="text-sm text-muted-foreground">{field.label || field.name}</span>
                            </div>
                          ) : field.type === "radio" && field.options ? (
                            <div className="flex flex-wrap gap-3">
                              {field.options.map((opt) => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={field.name}
                                    value={opt}
                                    checked={formData[field.name] === opt}
                                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    className="accent-primary"
                                    data-testid={`radio-field-${field.name}-${opt}`}
                                  />
                                  <span className="text-sm">{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === "select" && field.options ? (
                            <Select
                              value={formData[field.name] || ""}
                              onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
                            >
                              <SelectTrigger data-testid={`select-field-${field.name}`}>
                                <SelectValue placeholder={`Select ${field.label || field.name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder={field.label || field.name}
                              value={formData[field.name] || ""}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              data-testid={`textarea-field-${field.name}`}
                            />
                          ) : (
                            <Input
                              type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                              placeholder={field.label || field.name}
                              value={formData[field.name] || ""}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              data-testid={`input-field-${field.name}`}
                            />
                          )}
                        </div>
                      ))}

                    {siteFields.some((f) => isGeoField(f.name)) && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-2" data-testid="proxy-preview-card">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Proxy Preview</p>
                        </div>
                        {geoPreview ? (
                          <div className="space-y-1">
                            <p className="font-mono text-sm text-primary" data-testid="text-proxy-preview">
                              username-{geoPreview.type}-{geoPreview.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Detected from <span className="font-mono">{geoPreview.field}</span> field ({geoPreview.type === "zip" ? "priority 1" : "priority 2 — fallback"})
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Enter a zip code or state value to see the geo-targeted proxy username
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full mt-2"
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending || !!isRunning}
                      data-testid="button-submit-form"
                    >
                      {submitMutation.isPending || isRunning ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {isRunning ? "Auto-Fill Running..." : "Submit & Auto-Fill"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeSubmissionId && progressUpdates.length > 0 && (
        <Card data-testid="card-autofill-progress">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Auto-Fill Progress
              {isRunning && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {currentProgress?.step === "complete" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {currentProgress?.step === "error" && <XCircle className="w-4 h-4 text-destructive" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={currentProgress?.percent || 0} className="h-2" data-testid="progress-autofill" />
            <p className="text-sm font-medium" data-testid="text-progress-detail">
              {currentProgress?.detail || "Initializing..."}
            </p>

            <div ref={progressContainerRef} className="max-h-48 overflow-y-auto rounded-md bg-muted p-3 space-y-1">
              {progressUpdates.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground font-mono shrink-0 w-12">
                    {Math.round((p.timestamp - progressUpdates[0].timestamp) / 1000)}s
                  </span>
                  <span className={
                    p.step === "error" || p.step === "field_warning" || p.step === "submit_warning"
                      ? "text-destructive"
                      : p.step === "complete"
                      ? "text-emerald-500"
                      : "text-foreground"
                  }>
                    {p.detail}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {submissionsQuery.data && submissionsQuery.data.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Submissions</h3>
          <div className="space-y-2">
            {submissionsQuery.data.slice(0, 10).map((sub) => (
              <Card key={sub.id} className="hover-elevate" data-testid={`card-submission-${sub.id}`}>
                <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {sub.proxyLocation && (
                          <span className="text-xs font-mono text-primary flex items-center gap-1" data-testid={`text-proxy-location-${sub.id}`}>
                            <MapPin className="w-3 h-3" />
                            {sub.proxyLocation}
                          </span>
                        )}
                        {sub.proxyHost && (
                          <span className="text-xs text-muted-foreground">
                            via {sub.proxyHost}
                          </span>
                        )}
                        {sub.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {(sub.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.screenshot && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setScreenshotUrl(sub.screenshot)}
                        data-testid={`button-screenshot-${sub.id}`}
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" />
                        Screenshot
                      </Button>
                    )}
                    <Badge variant={
                      sub.status === "success" ? "default"
                        : sub.status === "failed" ? "destructive"
                        : sub.status === "running" ? "secondary"
                        : "secondary"
                    }>
                      {sub.status === "running" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {sub.status}
                    </Badge>
                  </div>
                </CardContent>
                {sub.errorMessage && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-destructive bg-destructive/10 rounded p-2" data-testid={`text-error-${sub.id}`}>
                      {sub.errorMessage}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!screenshotUrl} onOpenChange={() => setScreenshotUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Submission Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotUrl && (
            <img
              src={screenshotUrl}
              alt="Form submission screenshot"
              className="w-full rounded-md border"
              data-testid="img-screenshot"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
