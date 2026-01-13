import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Organizations
  organizations: router({
    list: publicProcedure.query(async () => {
      const { listOrganizations } = await import("./db");
      return listOrganizations();
    }),
  }),

  // Challenges
  challenges: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const { listChallenges } = await import("./db");
      return listChallenges(ctx.user?.id);
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getChallengeById } = await import("./db");
      return getChallengeById(input.id);
    }),
    extract: protectedProcedure
      .input(
        z.object({
          text: z.string(),
          sourceOrg: z.string().optional(),
          sourceUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { extractChallenges } = await import("./agents/challengeExtractorAgent");
        const { insertChallenge, insertChallengeExtractionRun } = await import("./db");
        const { logAgentInteraction, createSuccessLog, createErrorLog } = await import(
          "./agents/logger"
        );

        try {
          const { result, rawPrompt, rawResponse, promptKey, promptVersion, promptSha256 } =
            await extractChallenges(input.text, {
            sourceOrg: input.sourceOrg,
            sourceUrl: input.sourceUrl,
          });

          const runId = await insertChallengeExtractionRun({
            userId: ctx.user.id,
            modelUsed: "gpt-4o-mini",
            sourceOrg: input.sourceOrg,
            sourceUrl: input.sourceUrl,
            promptKey,
            promptVersion,
            promptSha256,
            rawPrompt,
            rawResponse,
            status: "completed",
          });

          // Log successful extraction
          logAgentInteraction(
            createSuccessLog(
              "challenge_extractor",
              "extract_challenges",
              "gpt-4o-mini",
              rawPrompt,
              rawResponse,
              {
                userId: ctx.user.id,
                sourceOrg: input.sourceOrg,
                challengeCount: result.challenges.length,
              }
            )
          );

          // Store challenges in database
          const insertedIds = [];
          for (const challenge of result.challenges) {
            const insertResult = await insertChallenge({
              userId: ctx.user.id,
              title: challenge.title,
              statement: challenge.statement,
              sdgGoals: challenge.sdg_goals,
              geography: challenge.geography,
              targetGroups: challenge.target_groups,
              sectors: challenge.sectors,
              sourceUrl: input.sourceUrl,
              sourceOrg: input.sourceOrg,
              confidence: challenge.confidence,
            });
            insertedIds.push(insertResult);
          }

          return {
            success: true,
            runId,
            challenges: result.challenges,
            insertedIds,
          };
        } catch (error) {
          // Log error
          logAgentInteraction(
            createErrorLog(
              "challenge_extractor",
              "extract_challenges",
              "gpt-4o-mini",
              input.text.substring(0, 500),
              error instanceof Error ? error.message : "Unknown error",
              { userId: ctx.user.id }
            )
          );
          throw error;
        }
      }),
  }),

  // Technology Paths
  techPaths: router({
    discover: protectedProcedure
      .input(
        z.object({
          challengeId: z.number(),
          budgetConstraintEur: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { discoverTechnologyPaths } = await import("./agents/techDiscoveryAgent");
        const {
          getChallengeById,
          insertTechDiscoveryRun,
          insertTechPath,
          updateTechDiscoveryRunStatus,
          updateTechDiscoveryRunResult,
        } =
          await import("./db");
        const { logAgentInteraction, createSuccessLog, createErrorLog } = await import(
          "./agents/logger"
        );

        // Get challenge
        const challenge = await getChallengeById(input.challengeId);
        if (!challenge) {
          throw new Error("Challenge not found");
        }

        // Create discovery run record
        const runId = await insertTechDiscoveryRun({
          challengeId: input.challengeId,
          userId: ctx.user.id,
          modelUsed: "gpt-4o-mini",
          budgetConstraintEur: input.budgetConstraintEur || 10000,
          status: "in_progress",
        });

        try {
          const { result, rawPrompt, rawResponse, promptKey, promptVersion, promptSha256 } =
            await discoverTechnologyPaths(challenge, {
            budgetConstraintEur: input.budgetConstraintEur,
          });

          // Log successful discovery
          logAgentInteraction(
            createSuccessLog(
              "technology_discovery",
              "discover_paths",
              "gpt-4o-mini",
              rawPrompt,
              rawResponse,
              {
                userId: ctx.user.id,
                challengeId: input.challengeId,
                pathCount: result.technology_paths.length,
              }
            )
          );

          // Update run with results (store prompt + full response for auditability)
          await updateTechDiscoveryRunResult(runId, {
            promptKey,
            promptVersion,
            promptSha256,
            rawPrompt,
            fullResponse: rawResponse,
            status: "completed",
          });

          // Store technology paths
          for (let i = 0; i < result.technology_paths.length; i++) {
            const path = result.technology_paths[i]!;
            await insertTechPath({
              runId,
              challengeId: input.challengeId,
              pathName: path.path_name,
              pathOrder: i + 1,
              principlesUsed: JSON.stringify(path.principles_used),
              technologyClasses: JSON.stringify(path.technology_classes),
              whyPlausible: path.why_plausible,
              estimatedCostBandEur: path.estimated_cost_band_eur,
              risksAndUnknowns: JSON.stringify(path.risks_and_unknowns),
            });
          }

          return {
            success: true,
            runId,
            result,
          };
        } catch (error) {
          // Log error and update run status
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await updateTechDiscoveryRunStatus(runId, "failed", errorMessage);

          logAgentInteraction(
            createErrorLog(
              "technology_discovery",
              "discover_paths",
              "gpt-4o-mini",
              `Challenge: ${challenge.title}`,
              errorMessage,
              { userId: ctx.user.id, challengeId: input.challengeId }
            )
          );
          throw error;
        }
      }),
    listByChallengeId: publicProcedure
      .input(z.object({ challengeId: z.number() }))
      .query(async ({ input }) => {
        const { getTechPathsByChallengeId } = await import("./db");
        return getTechPathsByChallengeId(input.challengeId);
      }),
  }),

  prompts: router({
    listTemplates: protectedProcedure.query(async () => {
      const { listPromptTemplates } = await import("./db");
      const templates = await listPromptTemplates();
      return templates.map((t) => ({
        id: t.id,
        key: t.key,
        version: t.version,
        agent: t.agent,
        operation: t.operation,
        publicTitle: t.publicTitle,
        publicDescription: t.publicDescription,
        sha256: t.sha256,
        source: t.source,
        createdAt: t.createdAt,
      }));
    }),
    listUsed: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        const { listPromptUsage } = await import("./db");
        return listPromptUsage(input?.limit ?? 100);
      }),
    getTemplateContent: adminProcedure
      .input(z.object({ key: z.string(), version: z.number() }))
      .query(async ({ input }) => {
        const { getPromptTemplateByKeyVersion } = await import("./db");
        const template = await getPromptTemplateByKeyVersion(input.key, input.version);
        if (!template) return null;
        return {
          key: template.key,
          version: template.version,
          sha256: template.sha256,
          content: template.content,
        };
      }),
  }),

  // Sources + Documents (Europe-first SDG project report harvesting)
  sources: router({
    list: protectedProcedure.query(async () => {
      const { listSources } = await import("./db");
      return listSources();
    }),
    upsert: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          orgType: z.enum([
            "un",
            "eu",
            "gov",
            "ministry",
            "foundation",
            "corporate",
            "ngo",
            "bank",
            "academic",
          ]),
          trustLevel: z.enum(["high", "medium", "low"]).optional(),
          baseUrl: z.string().url(),
          regionFocus: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          crawlEnabled: z.boolean().optional(),
          rateLimitMs: z.number().min(0).max(60000).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { upsertSource } = await import("./db");
        await upsertSource({
          name: input.name,
          orgType: input.orgType,
          trustLevel: input.trustLevel ?? "medium",
          baseUrl: input.baseUrl,
          regionFocus: input.regionFocus ? JSON.stringify(input.regionFocus) : null,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          crawlEnabled: input.crawlEnabled ?? false,
          rateLimitMs: input.rateLimitMs ?? 1500,
          notes: input.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
        return { success: true } as const;
      }),
    listEndpoints: protectedProcedure
      .input(z.object({ sourceId: z.number() }))
      .query(async ({ input }) => {
        const { listSourceEndpoints } = await import("./db");
        return listSourceEndpoints(input.sourceId);
      }),
    upsertEndpoint: protectedProcedure
      .input(
        z.object({
          sourceId: z.number(),
          endpointUrl: z.string().url(),
          endpointType: z.enum(["rss", "sitemap", "html_list", "api", "manual_seed"]),
          parserHint: z.string().optional(),
          enabled: z.boolean().optional(),
          priority: z.number().min(0).max(10000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { upsertSourceEndpoint } = await import("./db");
        await upsertSourceEndpoint({
          sourceId: input.sourceId,
          endpointUrl: input.endpointUrl,
          endpointType: input.endpointType,
          parserHint: input.parserHint ?? null,
          enabled: input.enabled ?? true,
          priority: input.priority ?? 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
        return { success: true } as const;
      }),
    discoverFromEndpoint: protectedProcedure
      .input(z.object({ endpointId: z.number() }))
      .mutation(async ({ input }) => {
        const { discoverDocumentsFromEndpoint } = await import("./_core/sources/discovery");
        return discoverDocumentsFromEndpoint(input.endpointId);
      }),
  }),

  documents: router({
    list: protectedProcedure
      .input(
        z
          .object({
            sourceId: z.number().optional(),
            status: z.string().optional(),
            limit: z.number().min(1).max(1000).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { listDocuments } = await import("./db");
        return listDocuments(input);
      }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getDocumentById } = await import("./db");
      return getDocumentById(input.id);
    }),
    downloadAndExtract: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { downloadAndExtractDocument } = await import("./_core/sources/discovery");
        return downloadAndExtractDocument(input.id);
      }),
    getExtractedText: adminProcedure
      .input(z.object({ id: z.number(), maxChars: z.number().min(1000).max(200000).optional() }))
      .query(async ({ input }) => {
        const { getDocumentById } = await import("./db");
        const doc = await getDocumentById(input.id);
        if (!doc) return null;
        const max = input.maxChars ?? 50000;
        const text = doc.extractedText ?? "";
        return {
          id: doc.id,
          chars: text.length,
          text: text.slice(0, max),
          truncated: text.length > max,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
