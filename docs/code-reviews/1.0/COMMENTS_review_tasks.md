# Code Comment Review Tasks

This document outlines the tasks for reviewing code comments across the Simple-Civ codebase for AI and human usage best practices.

## 1. Define Best Practices
- [x] Create `COMMENTS_best_practices.md` defining the standards for the review.

## 2. Engine Codebase Review (`engine/src`)
- [x] Review `engine/src/core` (constants, hex).
- [x] Review `engine/src/game` (rules, turn-lifecycle, ai-decisions).
- [x] Review `engine/src/map` (map-generator, rivers).
- [x] Report findings in `COMMENTS_engine_comment_review.md`.

## 3. Client Codebase Review (`client/src`)
- [x] Review `client/src/components` (App, GameMap).
- [x] Review `client/src/hooks` (useGameSession, useMapController).
- [x] Report findings in `COMMENTS_client_comment_review.md`.

## 4. Documentation & Final Report
- [x] Consolidate findings in `COMMENTS_summary_recommendations.md`.
- [x] Identify high-priority fixes (TSDoc adoption).
