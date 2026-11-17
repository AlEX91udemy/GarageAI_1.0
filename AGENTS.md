# GarageAI workspace instructions

This repository is the GarageAI production web application. Work from this repository root for all project tasks.

## Before changing code

- Read the relevant source and tests first.
- Keep guest/local mode separate from authenticated per-user garages.
- Preserve tenant scoping, CSRF checks, rate limits, size limits, and production fail-closed storage guards.
- Never log API keys, session material, VINs, license plates, email codes, or garage payloads.

## Validation

- Typecheck: `npm run lint`
- Tests: `npm test`
- Production build: `npm run build`
- Environment contract: `npm run config:check`

Use focused checks during iteration, then run the relevant final checks after the last change.

## Delivery

Keep changes small and reviewable. Report files changed, checks run, and any external production gate that cannot be verified from this workstation.
