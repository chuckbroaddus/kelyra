# Kelyra

Hybrid school app. Setup guide: docs/setup.md.

## Setup

1. Create Supabase project.
2. Turn off email confirm.
3. Apply every sql file under supabase/migrations in filename order.
4. First login claims superintendent via school_claim_superintendent (not join codes).
5. Provisioned student parent logins. Join route redirects to sign-in.

Typecheck with the project script.

## Folder map

docs, src/app, src/lib/ai, supabase/migrations (not empty).

## Rules

Model keys on server. Nothing is a grade until Approve. Teachers do not create classes.
