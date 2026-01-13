import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Globe, Users, Target } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

/**
 * Journey page - Lists all sustainability challenges
 * First step in the discovery flow: Journey → Pathway → Micro-challenges
 */
export default function Journey() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: challenges, isLoading } = trpc.challenges.list.useQuery();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">SDG Challenge Discovery</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user?.name || user?.email}
                </span>
                <Link href="/prompts">
                  <Button size="sm" variant="outline">
                    Prompts
                  </Button>
                </Link>
                <Link href="/extract">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Extract Challenge
                  </Button>
                </Link>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a href={getLoginUrl(window.location.pathname)}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-12">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Discover Affordable Technology Solutions
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Explore sustainability challenges and discover plausible technology pathways under
            €10,000 budget constraint. Each challenge connects to existing, widely available
            technology classes.
          </p>
          <div className="flex gap-4">
            <Link href="/extract">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Extract New Challenge
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link href="/prompts">
                <Button size="lg" variant="outline">
                  Prompts
                </Button>
              </Link>
            ) : null}
            <Link href="/about">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Challenges List */}
      <section className="container pb-12">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold mb-2">All Challenges</h3>
          <p className="text-muted-foreground">
            {challenges?.length || 0} challenges available for technology discovery
          </p>
        </div>

        {!challenges || challenges.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">No challenges yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Start by extracting challenges from SDG documents
              </p>
              <Link href="/extract">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Extract Challenge
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <Link key={challenge.id} href={`/pathway/${challenge.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg line-clamp-2">{challenge.title}</CardTitle>
                      {challenge.confidence && (
                        <Badge variant={challenge.confidence >= 80 ? "default" : "secondary"}>
                          {challenge.confidence}%
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-3">
                      {challenge.statement}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {challenge.geography && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>{challenge.geography}</span>
                        </div>
                      )}
                      {challenge.targetGroups && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="line-clamp-1">{challenge.targetGroups}</span>
                        </div>
                      )}
                      {challenge.sdgGoals && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {challenge.sdgGoals.split(",").map((goal) => (
                            <Badge key={goal} variant="outline" className="text-xs">
                              SDG {goal.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
