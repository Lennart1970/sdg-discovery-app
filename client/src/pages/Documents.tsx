import { useMemo, useState } from "react";
import { Link } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Documents() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";

  const [filter, setFilter] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const docsQuery = trpc.documents.list.useQuery({ limit: 200 });
  const downloadMutation = trpc.documents.downloadAndExtract.useMutation({
    onSuccess: () => docsQuery.refetch(),
  });

  const extractedQuery = trpc.documents.getExtractedText.useQuery(
    { id: selectedDocId ?? 0, maxChars: 50000 },
    { enabled: dialogOpen && selectedDocId != null && isAdmin }
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = docsQuery.data ?? [];
    if (!q) return rows;
    return rows.filter((d) => {
      const hay = [
        d.title ?? "",
        d.url,
        d.status,
        d.contentType ?? "",
        d.sha256Bytes ?? "",
        d.sourceId ? String(d.sourceId) : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [docsQuery.data, filter]);

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
            <CardDescription>Please sign in to view documents</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Discovered + downloaded documents. Run “Download + extract” to store extracted text.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/sources">
              <Button variant="outline">Sources</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document list</CardTitle>
            <CardDescription>Tip: click “Download + extract” for discovered items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {docsQuery.isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Loading…
                  </span>
                ) : (
                  <span>
                    Showing <span className="font-medium text-foreground">{filtered.length}</span> documents
                  </span>
                )}
              </div>
              <div className="w-full md:w-[420px]">
                <Input
                  placeholder="Search documents (title, url, status)…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="size-4" />
                        Loading…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No documents yet. Go to Sources → Discover to populate.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === "extracted"
                              ? "default"
                              : d.status === "failed"
                                ? "destructive"
                                : d.status === "downloaded"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal">
                        {d.title ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[420px] whitespace-normal">
                        <a className="underline" href={d.url} target="_blank" rel="noreferrer">
                          {d.url}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">{d.contentType ?? "—"}</TableCell>
                      <TableCell className="text-xs">{d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadMutation.isPending}
                          onClick={async () => {
                            await downloadMutation.mutateAsync({ id: d.id });
                          }}
                        >
                          {downloadMutation.isPending ? "Working…" : "Download + extract"}
                        </Button>
                        {isAdmin && d.extractedText ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedDocId(d.id);
                              setDialogOpen(true);
                            }}
                          >
                            View text
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedDocId(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Extracted text</DialogTitle>
            <DialogDescription>Admin-only. First 50k chars.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded-md border bg-muted/30">
            <pre className="p-3 text-xs whitespace-pre-wrap">
              {extractedQuery.data?.text ?? (extractedQuery.isLoading ? "Loading…" : "No text")}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

