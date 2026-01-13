import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const SIMPLE_OPEN_ID = "simple-auth-user";
const SIMPLE_USER_NAME = "SDG User";

export function registerSimpleAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password || password !== ENV.simpleAuthPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    try {
      // Create or update user with fixed openId
      await db.upsertUser({
        openId: SIMPLE_OPEN_ID,
        name: SIMPLE_USER_NAME,
        email: null,
        loginMethod: "password",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(SIMPLE_OPEN_ID, {
        name: SIMPLE_USER_NAME,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { name: SIMPLE_USER_NAME } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}
