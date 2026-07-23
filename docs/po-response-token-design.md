# PO Response Token — Design Spec

## Context

The public PO response pages (`/po-response/[action]/[token]`, see [`app/(public)/po-response`](../app/(public)/po-response)) let a supplier/subcontractor accept, reject, or request a reschedule for a PO **without logging in** — they reach the page via a link in an emailed PO notification.

This repo only *consumes* the token as an opaque URL path segment (see `lib/api/po-response.ts`, currently a dummy implementation). Token **generation, storage, and validation live in the backend** — this document exists to give a clear, concrete spec of what a correct implementation looks like, so it can be checked against what the backend already has, or handed to the backend team if it still needs building.

## Recommended shape: an opaque, random, single-use token — not a JWT

### Generation

- When a PO is submitted/sent, generate **one token per PO per email-send** — e.g. `crypto.randomUUID()` or a 32+ byte random string, base64url-encoded. Long enough to be unguessable by brute force.
- Do **not** encode the PO id, action, or any other data into the token itself. See "Why not a JWT" below for why this should stay opaque.
- The same token is shared across all 3 email buttons for the same PO — the **action comes from the URL path** (`/po-response/accept/<token>`, `/po-response/reject/<token>`, `/po-response/reschedule/<token>`), not from anything encoded in the token. This means accepting via one link naturally invalidates the other two for the same PO, since they all resolve to the same now-used token.

### Storage

A server-side table, e.g.:

```
po_response_tokens
  token        text PRIMARY KEY
  po_id        uuid REFERENCES purchase_orders(id)
  created_at   timestamptz
  expires_at   timestamptz
  used_at      timestamptz NULL
  used_action  text NULL   -- 'accept' | 'reject' | 'reschedule'
```

### Validation endpoint (`validatePoResponseToken` in the frontend dummy layer)

Look up the token row:

| Condition | `linkStatus` |
|---|---|
| Token not found | `invalid` |
| `used_at` is set | `used` (also return the PO's current status so the UI can show what it was responded with) |
| `expires_at` is in the past | `expired` |
| Otherwise | `valid` (return the PO summary) |

### Expiry

A reasonable default is **7–14 days** from send, matching typical PO response windows. This is a backend/business decision, not a frontend one — flag for confirmation.

### Action endpoints (`accept` / `reject` / `reschedule`)

Each must, atomically (single transaction/RPC):

1. **Re-validate the token server-side** — not-found/expired/used → reject with an error the frontend surfaces as the same invalid/expired/used state. Never trust that the frontend already checked; the frontend's check is only for UX, not security.
2. **Apply the PO status change** (see status mapping below).
3. **Set `used_at` / `used_action`** on the token row so it can never be replayed.

This atomic re-validate-then-mark-used step is the *actual* safeguard against replay — not just email-scanner pre-fetches, but also double-clicks, retried requests, or someone reusing an old email. The frontend's "explicit confirm button, never auto-fire on page load" (already implemented) stops *accidental* triggering by a GET — it does not by itself stop a *replayed* POST. Only the backend enforcing single-use atomically does that.

## Status mapping (assumed — confirm with backend)

| Action | New PO status | Extra fields set |
|---|---|---|
| Accept | `PO Confirmed` | — |
| Reject | `PO Rejected` | `external_notes` = reason |
| Reschedule | `PO Rescheduled` | `new_requested_date`, `external_notes` = reason |

The `PO Rescheduled` status already has an existing consumer: the SM-side PO detail pages (`app/(dashboard)/purchase-orders/{supplier,subcontractor}/[id]/page.tsx`) render a "Reschedule requested" banner with Approve/Decline actions (`respondNewDateRequest`, see `lib/api/purchase-orders.ts`) whenever `status === 'PO Rescheduled'`. A reschedule request submitted through this new public flow should feed directly into that existing SM-side review flow — no new SM-side UI needed.

## Why not a JWT for this

A signed JWT containing `{po_id, action, exp}` is tempting — statelessly verifiable, no DB lookup needed — but has two problems here:

1. **Revocation still needs a DB row anyway.** A JWT can't be marked "used" without a server-side record of which JWTs have already been redeemed, so you end up needing the same token table regardless.
2. **Action would need to be re-validated independently of the JWT claim.** If the action were encoded as a JWT claim, whoever holds the link could in principle attempt to hit a different action's endpoint with the same JWT unless the backend independently checks "does this PO already have a response" rather than trusting the claim — at which point the JWT's self-describing property isn't buying anything over an opaque token + path-based action.

Simplest and safest: keep the token opaque, let the URL path segment carry the action, and have the backend's own state (`used_at`) be the single source of truth for "has this PO already been responded to" — never derived from anything inside the token.

## Open question for backend confirmation

Does the existing implementation perform the **atomic re-validate-then-mark-used** step inside the action endpoints themselves (not just in the separate validate endpoint)? This check-then-act race is easy to get wrong and isn't visible from the outside (e.g. from a curl example alone) — worth asking explicitly rather than assuming.

## Frontend contract this repo depends on

Regardless of how the above is implemented internally, `lib/api/po-response.ts` needs the backend to expose, at minimum:

```
GET/POST  validate(token)              -> { linkStatus: 'valid'|'expired'|'used'|'invalid', po: {...} | null }
POST      accept(token)                -> { success, message, newStatus }
POST      reject(token, reason)        -> { success, message, newStatus }
POST      reschedule(token, newDate, reason) -> { success, message, newStatus }
```

Once the real endpoint URLs/param names are confirmed, only `lib/api/po-response.ts` and `lib/types/po-response.ts` need to change — see those files' header comments.
