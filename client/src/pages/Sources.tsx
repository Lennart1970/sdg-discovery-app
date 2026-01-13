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

export default function Sources() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";

  const sourcesQuery = trpc.sources.list.useQuery();
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const endpointsQuery = trpc.sources.listEndpoints.useQuery(
    { sourceId: selectedSourceId ?? 0 },
    { enabled: selectedSourceId != null }
  );

  const discoverMutation = trpc.sources.discoverFromEndpoint.useMutation();

  const [filter, setFilter] = useState("");
  const filteredSources = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = sourcesQuery.data ?? [];
    if (!q) return rows;
    return rows.filter((s) => {
      const hay = [s.name, s.orgType, s.trustLevel, s.baseUrl].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [filter, sourcesQuery.data]);

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
            <CardDescription>Please sign in to view sources</CardDescription>
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
            <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
            <p className="text-sm text-muted-foreground">
              Curated Europe-first sources for SDG project reports (UN, EU, government, foundations, corporates).
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/documents">
              <Button variant="outline">Documents</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Source list</CardTitle>
            <CardDescription>
              Select a source to see its endpoints and run discovery (sitemap/RSS). Seeded with OCW (NL).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {sourcesQuery.isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" /> Loading…
                  </span>
                ) : (
                  <span>
                    Showing <span className="font-medium text-foreground">{filteredSources.length}</span> sources
                  </span>
                )}
              </div>
              <div className="w-full md:w-[420px]">
                <Input
                  placeholder="Search sources (name, type, url)…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Crawl</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="size-4" />
                        Loading…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : filteredSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No sources found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSources.map((s) => {
                    const isSelected = selectedSourceId === s.id;
                    return (
                      <TableRow
                        key={s.id}
                        className={isSelected ? "bg-muted/40" : ""}
                        onClick={() => setSelectedSourceId(s.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{s.orgType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.trustLevel === "high" ? "default" : s.trustLevel === "low" ? "outline" : "secondary"}>
                            {s.trustLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <a className="underline" href={s.baseUrl} target="_blank" rel="noreferrer">
                            {s.baseUrl}
                          </a>
                        </TableCell>
                        <TableCell>{s.crawlEnabled ? "Enabled" : "Off"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedSourceId != null ? (
          <Card>
            <CardHeader>
              <CardTitle>Endpoints</CardTitle>
              <CardDescription>Discovery entrypoints (sitemap, RSS, list pages). Click “Discover” to add documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpointsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="size-4" />
                          Loading…
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (endpointsQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        No endpoints found for this source.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (endpointsQuery.data ?? []).map((ep) => (
                      <TableRow key={ep.id}>
                        <TableCell>
                          <Badge variant="outline">{ep.endpointType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <a className="underline" href={ep.endpointUrl} target="_blank" rel="noreferrer">
                            {ep.endpointUrl}
                          </a>
                        </TableCell>
                        <TableCell>{ep.priority}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={discoverMutation.isPending}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await discoverMutation.mutateAsync({ endpointId: ep.id });
                            }}
                          >
                            {discoverMutation.isPending ? "Discovering…" : "Discover"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {!isAdmin ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Tip: Admin-only editing of sources/endpoints can be added next. For now, seed sync covers OCW.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

