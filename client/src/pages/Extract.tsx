import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";

/**
 * Extract page - Form for extracting challenges from SDG documents
 */
export default function Extract() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const [sourceOrg, setSourceOrg] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const extractMutation = trpc.challenges.extract.useMutation({
    onSuccess: (data) => {
      toast.success(`Extracted ${data.challenges.length} challenges successfully!`);
      setText("");
      setSourceOrg("");
      setSourceUrl("");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(`Extraction failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Please enter document text");
      return;
    }
    extractMutation.mutate({
      text,
      sourceOrg: sourceOrg || undefined,
      sourceUrl: sourceUrl || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to extract challenges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Journey
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold">Extract Challenges</h1>
        </div>
      </header>

      {/* Form */}
      <section className="container py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Challenge Extraction</CardTitle>
                  <CardDescription>
                    Paste SDG-related document text to extract solution-free challenges
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Document Text */}
                <div className="space-y-2">
                  <Label htmlFor="text">Document Text *</Label>
                  <Textarea
                    id="text"
                    placeholder="Paste SDG document text here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={12}
                    required
                    className="resize-y"
                  />
                  <p className="text-sm text-muted-foreground">
                    The agent will extract clear, actionable challenges without solutions
                  </p>
                </div>

                {/* Source Organization */}
                <div className="space-y-2">
                  <Label htmlFor="sourceOrg">Source Organization (Optional)</Label>
                  <Input
                    id="sourceOrg"
                    placeholder="e.g., UN, World Bank, UNDP"
                    value={sourceOrg}
                    onChange={(e) => setSourceOrg(e.target.value)}
                  />
                </div>

                {/* Source URL */}
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL (Optional)</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    placeholder="https://..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={extractMutation.isPending || !text.trim()}
                    className="flex-1"
                  >
                    {extractMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Extracting Challenges...
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 mr-2" />
                        Extract Challenges
                      </>
                    )}
                  </Button>
                  <Link href="/">
                    <Button type="button" variant="outline" size="lg">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. The Challenge Extractor Agent analyzes your document text</p>
              <p>2. It identifies solution-free sustainability challenges</p>
              <p>3. Each challenge is scored for clarity and actionability</p>
              <p>4. Challenges with confidence ≥60% are saved to the database</p>
              <p>5. You can then discover technology paths for each challenge</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
