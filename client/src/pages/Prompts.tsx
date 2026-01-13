import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

type SelectedTemplate = { key: string; version: number; sha256?: string };

export default function Prompts() {
  const { loading, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const templatesQuery = trpc.prompts.listTemplates.useQuery();
  const usedQuery = trpc.prompts.listUsed.useQuery({ limit: 200 });

  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("");
  const [usageFilter, setUsageFilter] = useState("");

  const contentQuery = trpc.prompts.getTemplateContent.useQuery(
    selected ? { key: selected.key, version: selected.version } : { key: "", version: 0 },
    { enabled: dialogOpen && Boolean(selected) && isAdmin }
  );

  const filteredTemplates = useMemo(() => {
    const q = templateFilter.trim().toLowerCase();
    const rows = templatesQuery.data ?? [];
    const sorted = [...rows].sort((a, b) => {
      if (a.key !== b.key) return a.key.localeCompare(b.key);
      return b.version - a.version;
    });
    if (!q) return sorted;
    return sorted.filter((t) => {
      const hay = [
        t.publicTitle,
        t.publicDescription,
        t.agent,
        t.operation,
        t.key,
        String(t.version),
        t.sha256,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [templateFilter, templatesQuery.data]);

  const filteredUsage = useMemo(() => {
    const q = usageFilter.trim().toLowerCase();
    const rows = usedQuery.data ?? [];
    const sorted = [...rows].sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
    if (!q) return sorted;
    return sorted.filter((r) => {
      const hay = [
        r.runType,
        String(r.id),
        r.modelUsed,
        r.status,
        r.promptKey ?? "",
        String(r.promptVersion ?? ""),
        r.promptSha256 ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [usageFilter, usedQuery.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view prompts</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
          <p className="text-sm text-muted-foreground">
            This page shows prompt templates and which ones were used in runs. Full prompt text is hidden by default.
            {isAdmin ? " (You are an admin: you can reveal full prompts.)" : ""}
          </p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="used">Used in runs</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Prompt templates</CardTitle>
                <CardDescription>Public descriptions are safe for UI display.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {templatesQuery.isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="size-4" />
                        Loading templates…
                      </span>
                    ) : (
                      <span>
                        Showing <span className="font-medium text-foreground">{filteredTemplates.length}</span>{" "}
                        templates
                      </span>
                    )}
                  </div>
                  <div className="w-full md:w-[420px]">
                    <Input
                      placeholder="Search templates (title, key, agent, sha…)…"
                      value={templateFilter}
                      onChange={(e) => setTemplateFilter(e.target.value)}
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Agent / Op</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>SHA</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templatesQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Loading…
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : filteredTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          No templates found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTemplates.map((t) => (
                      <TableRow key={`${t.key}@${t.version}`}>
                        <TableCell className="font-medium">{t.publicTitle}</TableCell>
                        <TableCell className="whitespace-normal max-w-[520px]">{t.publicDescription}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{t.agent}</Badge>
                            <Badge variant="outline">{t.operation}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.key}</TableCell>
                        <TableCell>{t.version}</TableCell>
                        <TableCell className="font-mono text-xs">{t.sha256.slice(0, 10)}…</TableCell>
                        <TableCell className="text-xs">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelected({ key: t.key, version: t.version, sha256: t.sha256 });
                                setDialogOpen(true);
                              }}
                            >
                              Reveal full prompt
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Hidden</span>
                          )}
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="used" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Used in runs</CardTitle>
                <CardDescription>Recent prompt usage from extraction and discovery runs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {usedQuery.isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="size-4" />
                        Loading usage…
                      </span>
                    ) : (
                      <span>
                        Showing <span className="font-medium text-foreground">{filteredUsage.length}</span> runs
                      </span>
                    )}
                  </div>
                  <div className="w-full md:w-[420px]">
                    <Input
                      placeholder="Search runs (key, sha, model, status…)…"
                      value={usageFilter}
                      onChange={(e) => setUsageFilter(e.target.value)}
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Run ID</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>SHA</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usedQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Loading…
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          No runs found yet. Run one extraction and one tech discovery to populate this table.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsage.map((r) => (
                      <TableRow key={`${r.runType}-${r.id}`}>
                        <TableCell>
                          <Badge variant="secondary">{r.runType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell>{r.modelUsed}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "outline"}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.promptKey ? `${r.promptKey}@${r.promptVersion ?? "?"}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.promptSha256 ? `${r.promptSha256.slice(0, 10)}…` : "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Full prompt</DialogTitle>
            <DialogDescription>
              Visible to admins only. Key: {selected?.key} v{selected?.version}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selected?.sha256 ? <>SHA: <span className="font-mono">{selected.sha256.slice(0, 12)}…</span></> : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!contentQuery.data?.content}
              onClick={async () => {
                if (!contentQuery.data?.content) return;
                await navigator.clipboard.writeText(contentQuery.data.content);
              }}
            >
              Copy
            </Button>
          </div>
          <ScrollArea className="h-[60vh] rounded-md border bg-muted/30">
            <pre className="p-3 text-xs whitespace-pre-wrap">
              {contentQuery.data?.content ?? (contentQuery.isLoading ? "Loading…" : "No content")}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

