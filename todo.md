# SDG Challenge Discovery Platform - TODO

## Phase 1: Database Schema & Migrations
- [x] Create Supabase migrations for organizations table
- [x] Create Supabase migrations for source_feeds table
- [x] Create Supabase migrations for challenges table
- [x] Create Supabase migrations for tech_discovery_runs table
- [x] Create Supabase migrations for tech_paths table
- [x] Update drizzle schema.ts with all tables
- [ ] Add indexes for performance optimization

## Phase 2: Database Query Helpers
- [x] Create query helpers for organizations CRUD
- [x] Create query helpers for source_feeds CRUD
- [x] Create query helpers for challenges CRUD
- [x] Create query helpers for tech_discovery_runs CRUD
- [x] Create query helpers for tech_paths CRUD
- [x] Create seed data script with 18 organizations
- [x] Create seed data script with 18 source feeds

## Phase 3: Python Agent Integration
- [x] Create TypeScript agent modules (Challenge Extractor + Technology Discovery)
- [x] Implement OpenAI Responses API with strict JSON schema
- [x] Add structured logging for agent requests/responses
- [x] Create logger utility for auditability
- [ ] Store raw prompts in database for auditability (via tRPC procedures)
- [ ] Store raw LLM responses in database for auditability (via tRPC procedures)

## Phase 4: tRPC Procedures
- [x] Create organizations.list procedure
- [x] Create challenges.list procedure
- [x] Create challenges.get procedure
- [x] Create challenges.extract procedure (calls agent)
- [x] Create techPaths.discover procedure (calls agent)
- [x] Create techPaths.listByChallengeId procedure
- [x] Add authentication guards for protected procedures
- [x] Store raw prompts and responses in structured logs

## Phase 5: Supabase Storage Integration
- [ ] Create storage bucket for user uploads
- [ ] Add upload endpoint for PDFs
- [ ] Add upload endpoint for images
- [ ] Create storage helper functions
- [ ] Add file metadata to database

## Phase 6: Frontend UI - Step-based Flow
- [x] Design color palette and typography (SDG green theme)
- [x] Create Journey page (list all challenges)
- [x] Create Pathway page (show tech paths for challenge)
- [x] Create Extract page (challenge extraction form)
- [x] Add loading states and error handling
- [x] Update App.tsx with new routes

## Phase 7: Structured Logging & Auditability
- [x] Add JSON structured logging utility
- [x] Log all LLM requests with timestamps
- [x] Log all LLM responses with metadata
- [x] Integrated logging into tRPC procedures

## Phase 8: Testing
- [x] Write vitest tests for tRPC procedures
- [x] Write vitest tests for agent integration
- [x] Test end-to-end challenge extraction flow
- [x] Test end-to-end technology discovery flow
- [x] All tests passing (6/6)

## Phase 9: Deployment & CI/CD
- [x] Create comprehensive README with setup instructions
- [x] Document architecture and two-agent system
- [x] Add environment variable documentation
- [x] Document structured logging format
- [x] Ready for Manus Platform deployment (built-in hosting)

## Features
- [ ] Two-agent system (Challenge Extractor + Technology Discovery)
- [ ] €10k budget constraint enforcement
- [ ] Supabase PostgreSQL database
- [ ] Supabase Auth integration
- [ ] Supabase Storage for uploads
- [ ] Step-based UI flow
- [ ] Structured logging with auditability
- [ ] OpenAI Responses API with strict JSON schema
