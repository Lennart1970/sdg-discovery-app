import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { seedDatabase } from "./seed";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("organizations router", () => {
  beforeAll(async () => {
    // Seed database with test data
    await seedDatabase();
  });

  it("lists organizations", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const organizations = await caller.organizations.list();

    expect(organizations).toBeDefined();
    expect(Array.isArray(organizations)).toBe(true);
    expect(organizations.length).toBeGreaterThan(0);
    expect(organizations[0]).toHaveProperty("orgName");
  });
});

describe("challenges router", () => {
  it("lists challenges for public users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const challenges = await caller.challenges.list();

    expect(challenges).toBeDefined();
    expect(Array.isArray(challenges)).toBe(true);
  });

  it("lists challenges for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const challenges = await caller.challenges.list();

    expect(challenges).toBeDefined();
    expect(Array.isArray(challenges)).toBe(true);
  });

  it("extracts challenges from text", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sampleText = `
      Challenge: Access to clean water in rural communities
      Many rural communities in Sub-Saharan Africa lack access to safe drinking water.
      Contaminated water sources lead to waterborne diseases affecting children and families.
      Current infrastructure is inadequate and maintenance is challenging.
    `;

    const result = await caller.challenges.extract({
      text: sampleText,
      sourceOrg: "Test Organization",
      sourceUrl: "https://example.com/test",
    });

    expect(result.success).toBe(true);
    expect(result.challenges).toBeDefined();
    expect(Array.isArray(result.challenges)).toBe(true);
    expect(result.insertedIds).toBeDefined();
  }, 30000); // 30s timeout for LLM call
});

describe("techPaths router", () => {
  it("discovers technology paths for a challenge", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a challenge
    const extractResult = await caller.challenges.extract({
      text: "Challenge: Affordable water filtration for rural households. Need low-cost solution under €10k.",
      sourceOrg: "Test Org",
    });

    expect(extractResult.success).toBe(true);
    expect(extractResult.challenges.length).toBeGreaterThan(0);

    // Get the first challenge ID from the database
    const allChallenges = await caller.challenges.list();
    const lastChallenge = allChallenges[allChallenges.length - 1];
    if (!lastChallenge) {
      throw new Error("No challenge found after extraction");
    }
    const challengeId = lastChallenge.id;

    // Discover technology paths
    const discoverResult = await caller.techPaths.discover({
      challengeId,
      budgetConstraintEur: 10000,
    });

    expect(discoverResult.success).toBe(true);
    expect(discoverResult.result).toBeDefined();
    expect(discoverResult.result.technology_paths).toBeDefined();
    expect(Array.isArray(discoverResult.result.technology_paths)).toBe(true);
    expect(discoverResult.result.technology_paths.length).toBeGreaterThan(0);

    // Verify path structure
    const firstPath = discoverResult.result.technology_paths[0];
    expect(firstPath).toHaveProperty("path_name");
    expect(firstPath).toHaveProperty("technology_classes");
    expect(firstPath).toHaveProperty("estimated_cost_band_eur");
    expect(firstPath).toHaveProperty("why_plausible");
  }, 60000); // 60s timeout for LLM calls
});
