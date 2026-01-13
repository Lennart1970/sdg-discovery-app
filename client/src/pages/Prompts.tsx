import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SelectedTemplate = { key: string; version: number; sha256?: string };

export default function Prompts() {
  const { loading, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const templatesQuery = trpc.prompts.listTemplates.useQuery();
  const usedQuery = trpc.prompts.listUsed.useQuery({ limit: 200 });

  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const contentQuery = trpc.prompts.getTemplateContent.useQuery(
    selected ? { key: selected.key, version: selected.version } : { key: "", version: 0 },
    { enabled: dialogOpen && Boolean(selected) && isAdmin }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
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
          </p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Agent/Op</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>SHA</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(templatesQuery.data ?? []).map((t) => (
                      <TableRow key={`${t.key}@${t.version}`}>
                        <TableCell className="font-medium">{t.publicTitle}</TableCell>
                        <TableCell className="whitespace-normal max-w-[520px]">{t.publicDescription}</TableCell>
                        <TableCell>{t.agent}/{t.operation}</TableCell>
                        <TableCell className="font-mono text-xs">{t.key}</TableCell>
                        <TableCell>{t.version}</TableCell>
                        <TableCell className="font-mono text-xs">{t.sha256.slice(0, 10)}…</TableCell>
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
                    ))}
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
                    {(usedQuery.data ?? []).map((r) => (
                      <TableRow key={`${r.runType}-${r.id}`}>
                        <TableCell>{r.runType}</TableCell>
                        <TableCell>{r.id}</TableCell>
                        <TableCell>{r.modelUsed}</TableCell>
                        <TableCell>{r.status}</TableCell>
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
                    ))}
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
          <div className="rounded-md border bg-muted/30 p-3 max-h-[60vh] overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {contentQuery.data?.content ?? (contentQuery.isLoading ? "Loading…" : "No content")}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

