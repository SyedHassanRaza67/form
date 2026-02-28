import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, Star, Send, Loader2, FileText, Clock
} from "lucide-react";
import type { FormField, Site, Submission } from "@shared/schema";

export default function AgentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const sitesQuery = useQuery<Site[]>({ queryKey: ["/api/agent/sites"] });
  const submissionsQuery = useQuery<Submission[]>({ queryKey: ["/api/agent/submissions"] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/submissions", {
        siteId: selectedSite?.id,
        formData,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/submissions"] });
      setFormData({});
      toast({ title: "Form submitted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const sites = sitesQuery.data || [];
  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];
  const fields = (selectedSite?.fields as FormField[]) || [];

  const isZipField = (name: string) => {
    const lower = name.toLowerCase();
    return ["zip", "zipcode", "zip_code", "postal", "postalcode", "postal_code"].includes(lower);
  };

  if (sitesQuery.isLoading) {
    return (
      <div className="space-y-4 p-6" data-testid="agent-dashboard">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
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
          Fill and submit forms for your assigned sites
        </p>
      </div>

      {sites.length > 1 && (
        <div className="space-y-2">
          <Label>Select Site</Label>
          <Select
            value={selectedSite?.id || ""}
            onValueChange={(v) => {
              setSelectedSiteId(v);
              setFormData({});
            }}
          >
            <SelectTrigger className="max-w-md" data-testid="select-site">
              <SelectValue placeholder="Choose a site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name} - {site.url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedSite && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {selectedSite.name}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {fields.length} fields
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedSite.url}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <div key={field.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">
                      {field.label || field.name}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {isZipField(field.name) && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Star className="w-3 h-3" />
                        PROXY TRIGGER
                      </Badge>
                    )}
                  </div>
                  {field.type === "select" && field.options ? (
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

            <Button
              className="w-full mt-4"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              data-testid="button-submit-form"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Form
            </Button>
          </CardContent>
        </Card>
      )}

      {submissionsQuery.data && submissionsQuery.data.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Submissions</h3>
          <div className="space-y-2">
            {submissionsQuery.data.slice(0, 5).map((sub) => (
              <Card key={sub.id} className="hover-elevate" data-testid={`card-submission-${sub.id}`}>
                <CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {sub.duration ? `${sub.duration}ms` : "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={sub.status === "success" ? "default" : sub.status === "failed" ? "destructive" : "secondary"}>
                    {sub.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
