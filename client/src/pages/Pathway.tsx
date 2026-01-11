import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Sparkles, AlertCircle, TrendingUp } from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Pathway page - Shows technology paths for a specific challenge
 * Second step in the discovery flow: Journey → Pathway → Micro-challenges
 */
export default function Pathway() {
  const { id } = useParams<{ id: string }>();
  const challengeId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();

  const { data: challenge, isLoading: challengeLoading } = trpc.challenges.get.useQuery({
    id: challengeId,
  });

  const { data: techPaths, isLoading: pathsLoading } = trpc.techPaths.listByChallengeId.useQuery({
    challengeId,
  });

  const discoverMutation = trpc.techPaths.discover.useMutation({
    onSuccess: () => {
      toast.success("Technology paths discovered successfully!");
      // Invalidate to refetch
      trpc.useUtils().techPaths.listByChallengeId.invalidate({ challengeId });
    },
    onError: (error) => {
      toast.error(`Discovery failed: ${error.message}`);
    },
  });

  const handleDiscover = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to discover technology paths");
      return;
    }
    discoverMutation.mutate({ challengeId });
  };

  if (challengeLoading || pathsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Challenge Not Found</CardTitle>
            <CardDescription>The requested challenge does not exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Journey
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parseTechClasses = (json: string | null) => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  const parseRisks = (json: string | null) => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Technology Pathways</h1>
        </div>
      </header>

      {/* Challenge Details */}
      <section className="container py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{challenge.title}</CardTitle>
                <CardDescription className="text-base">{challenge.statement}</CardDescription>
              </div>
              {challenge.confidence && (
                <Badge variant={challenge.confidence >= 80 ? "default" : "secondary"} className="ml-4">
                  {challenge.confidence}% confidence
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {challenge.geography && (
                <div>
                  <p className="text-sm font-medium mb-1">Geography</p>
                  <p className="text-sm text-muted-foreground">{challenge.geography}</p>
                </div>
              )}
              {challenge.targetGroups && (
                <div>
                  <p className="text-sm font-medium mb-1">Target Groups</p>
                  <p className="text-sm text-muted-foreground">{challenge.targetGroups}</p>
                </div>
              )}
              {challenge.sectors && (
                <div>
                  <p className="text-sm font-medium mb-1">Sectors</p>
                  <p className="text-sm text-muted-foreground">{challenge.sectors}</p>
                </div>
              )}
            </div>
            {challenge.sdgGoals && (
              <div className="flex flex-wrap gap-2 mt-4">
                {challenge.sdgGoals.split(",").map((goal) => (
                  <Badge key={goal} variant="outline">
                    SDG {goal.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discovery Action */}
        {(!techPaths || techPaths.length === 0) && (
          <Alert className="mb-8">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              No technology paths discovered yet. Click below to discover plausible technology
              pathways under €10,000 budget constraint.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center mb-8">
          <Button
            size="lg"
            onClick={handleDiscover}
            disabled={discoverMutation.isPending}
          >
            {discoverMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Discovering Paths...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Discover Technology Paths
              </>
            )}
          </Button>
        </div>

        {/* Technology Paths */}
        {techPaths && techPaths.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Discovered Technology Paths ({techPaths.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {techPaths.map((path) => {
                const techClasses = parseTechClasses(path.technologyClasses);
                const risks = parseRisks(path.risksAndUnknowns);

                return (
                  <Card key={path.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{path.pathName}</CardTitle>
                        <Badge variant="secondary">{path.estimatedCostBandEur}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Technology Classes */}
                      <div>
                        <p className="text-sm font-medium mb-2">Technology Classes</p>
                        <div className="flex flex-wrap gap-2">
                          {techClasses.map((tech: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Why Plausible */}
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Why Plausible
                        </p>
                        <p className="text-sm text-muted-foreground">{path.whyPlausible}</p>
                      </div>

                      {/* Risks */}
                      {risks.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Risks & Unknowns
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {risks.map((risk: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-muted-foreground mt-1">•</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
