# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Реал Холат" (Real Holat) — a civic monitoring platform for tracking school infrastructure promises in Tashkent. Citizens verify whether government/contractor promises (from tenders or crowdsourced reports) have been fulfilled, using gamified territory capture mechanics. The full technical specification is in `tech_req.md` (in Russian).

## Key Domain Concepts

- **Schools** — map entities with capture status (0-100%), color coding, attached cameras
- **Promises (Обещания)** — commitments tied to schools (from etender.uzex.uz or crowdsourced), each with a checklist and status funnel
- **Inspections (Проверки)** — citizen-submitted photo reports with checklist answers, validated against camera feeds
- **Territorial Capture** — gamification layer: fractional school capture, degradation timers, streak multipliers, seasonal leaderboards

## Core Pipelines (from tech_req.md)

1. **Promise ingestion** — auto-parse etender + crowdsourced submissions
2. **Citizen inspection** — photo + checklist submission, EXIF stripping, delayed publication (12-72h)
3. **Camera validation** — cross-reference inspection geo/timestamp with school camera feeds
4. **Scoring & capture** — density multiplier, streak multiplier, degradation (3d consumables / 30d capital)
5. **Status funnel & escalation** — promise lifecycle with auto-escalation at 14d/30d
6. **Public dashboard** — map view, district rankings, aggregated (anonymous) reports, weekly Telegram digest
7. **Gamification** — daily/weekly/seasonal cycles, battle pass, badges, streak freezes

## Status

Project is in early stage — technical requirements defined, no application code yet.
