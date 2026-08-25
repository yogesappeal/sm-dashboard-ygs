# Changelog

## Unreleased

### Contract detail navigation
- Home page and global search now navigate to the new 3-panel `/contract-preview/[id]` detail view instead of the old `/contract/[id]` page.
- `/contract-preview` converted from a static prototype route (hardcoded `STATIC_CONTRACT_ID`) to a dynamic `[id]` route reading the contract id from the URL.
- Added `ContractIdProvider`/`useContractId` context so nested panels (center, right) resolve the current contract id without prop drilling.

### SM Toolbox header
- Removed the external-link icon shown at the bottom of each SM Toolbox button.

### Right panel — scope & planned PO date
- Added a per-trade "planned PO date" control (popover with date picker, save/clear) so a reminder date can be set before a PO needs to be raised.
- Added an "Edit PO dates" batch mode: edit multiple trades' planned PO dates inline, review all pending changes in a summary bar, then save them together in a single API call.
- Added `updateScopeItems` API call (`POST /functions/v1/update-scope-items`) and `planned_po_date` field on `ScopeTrade`.

### Contract top bar — planned start date impact preview
- Setting a new "Planned Start" date now previews its impact before saving: shows how many trade PO dates will shift and how many would become overdue, with a review step before confirming.
- On confirm, the new planned start date and the shifted trade PO dates are saved together.
- Added `updateContractPlannedStart` API call and `planned_start_date` field on the contract type (backend endpoint not live yet — implemented ahead of the API per product decision, endpoint path may need adjustment once available).

### Contract top bar — project switcher
- The contract/project name next to the back button is now clickable, opening a dropdown to switch between other projects under the same contract, using the new `project_list` field from the contract-details response. Label truncates with ellipsis.
- Selecting a project currently only updates the `project` URL query param (no re-fetch yet) since the backend doesn't support a contract id + project id scoped fetch yet.
- Added `projects` (current project) and `project_list` (switchable projects) fields to the contract-details response type.

### Notes
- `updateContractPlannedStart` (`/functions/v1/update-contract`) and the `projects`/`project_list`/`planned_start_date` response fields are frontend-first additions — backend support is pending; adjust endpoint/field names once implemented.
