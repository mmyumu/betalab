# Repository Guidelines

## Project Structure & Module Organization

This repository is split into two apps plus project docs:

- `backend/`: FastAPI simulation API and LC-MS/MS domain logic.
- `backend/app/domain/`: core simulation models.
- `backend/app/services/`: experiment orchestration and signal generation.
- `backend/app/api/`: HTTP routes.
- `backend/tests/`: backend unit tests.
- `frontend/`: Next.js UI for the lab workbench.
- `frontend/src/components/`: UI building blocks.
- `frontend/src/lib/`: API client and mock data.
- `frontend/src/types/`: shared frontend types.
- `docs/`: architecture notes.

Top-level `.md` files describe product direction; read `README.md`, `docs/CHROMATO_V1_DIRECTION.md`, and `docs/CHROMATO_GUI_CONCEPT.md` first. For backend layering and request flow, read `docs/BACKEND_ARCHITECTURE.md`.

## Build, Test, and Development Commands

Backend:

- `cd backend && uv sync`: create/update the backend environment with default dev dependencies.
- `cd backend && uv run uvicorn app.main:app --reload`: run the API locally.
- `cd backend && uv run pytest`: run backend unit tests.
- `cd backend && uv run pytest --cov=app --cov-report=term-missing tests`: run tests with coverage.

Frontend:

- `cd frontend && pnpm install`: install frontend deps.
- `cd frontend && pnpm dev`: start the Next.js dev server.
- `cd frontend && pnpm build`: production build check.

## Coding Style & Naming Conventions

Use TypeScript for frontend code and Python 3.11+ for backend code. Prefer 2-space indentation in frontend files and 4 spaces in Python. Use `snake_case` for Python modules/functions, `PascalCase` for React components, and `kebab-case` for component filenames (for example `flask-card.tsx`). Keep domain logic out of React components; put workflow orchestration in `backend/app/services/`, domain concepts in `backend/app/domain/`, and API contracts in `backend/app/schemas/`.

### Physical Simulation Architecture

- Treat time-based lab physics as a single backend subsystem rooted in `PhysicalSimulationService`.
- `PhysicalSimulationService` is the public simulation façade. Keep specialized logic as internal blocks or helpers such as cryogenics, container pressure, evaporation, or thermal transfer instead of creating parallel top-level services too early.
- The authoritative simulation clock is `ExperimentService._advance_experiment_to_now()`.
- Time-based physical consequences must advance from ticks triggered by `_advance_experiment_to_now()`, which currently runs continuously while a websocket client is connected and catches up elapsed time on the next read if no client was connected.
- Action handlers such as `close_workbench_tool` or `open_workbench_tool` may change the configuration state of entities, but they should not hardcode delayed physical outcomes that belong to the ticked simulation.
- In practice: `close` should mark a container sealed, and pressure buildup / bulging / pop should be computed by simulation ticks, not decided immediately inside the close handler.
- Persist intermediate physical state on domain entities when needed. Example: a sealed container may carry `internal_pressure_bar` and `trapped_co2_mass_g` so the next tick or open action can continue from the current physical state.
- When adding a new physical phenomenon, prefer extending `PhysicalSimulationService` and the tick path before adding ad hoc event-only checks in command handlers.

### Reusable UI Primitives

- When the same visual pattern appears in multiple widgets or panels, extract it into a shared component instead of copying Tailwind class strings.
- This applies especially to small status affordances such as count bubbles, badges, chips, and markers.
- If multiple components show a count of contained entities, they must use the same shared primitive unless the user explicitly asks for a distinct visual treatment.
- Prefer a neutral reusable primitive first, then compose positioning outside the primitive with `className`.

### Equipment Widget Layout

- For equipment cards, distinguish clearly between the illustration itself, the illustration frame, and the outer widget width.
- If the goal is to make an equipment card take less horizontal space, prefer reducing the widget/container width first. Do not assume that changing the SVG `viewBox` or trimming the illustration canvas will make the card more compact; that often just zooms the illustration inside the same card.
- Only recrop an illustration when the goal is specifically to remove empty space inside the illustration frame. When doing that, verify that rounded surface corners still render correctly after the crop.
- When multiple equipment widgets should feel visually aligned, prefer converging them on the same shared widget structure and width logic rather than stacking one-off padding and margin fixes.

## Testing Guidelines

TDD is the default workflow: write the failing test first, then implement. Backend tests use `pytest`; name files `test_*.py` and test functions `test_*`. Keep coverage at or above the current backend baseline and add coverage for API routes when features touch HTTP behavior.

### Trash Retention

- Treat trash as retaining discarded entities by default.
- If a discarded entity is sent to trash, preserve a reference to it in the trash state unless the user explicitly asks for permanent deletion or non-retention for that entity.
- Do not assume some entity types should bypass trash just because restore is not implemented yet. Retention is still the default.

### Drag-and-Drop Invariants

- Sacred rule: provenance selects the command, never the compatibility.
- Drop compatibility must depend on the moved entity itself, not on where it comes from.
- Draggability must also depend on the entity itself, not on where it comes from.
- If the same concrete entity is visible in multiple origins (`palette`, `workbench`, `rack`, `trash`, `basket`), it should keep the same drag behavior and the same `allowedDropTargets` unless its own state has changed.
- The same entity must not gain or lose `allowedDropTargets` just because it is dragged from `palette`, `workbench`, `rack`, `trash`, or `basket`.
- If an entity can go to `trash_bin` from one origin, it must expose `trash_bin` as an allowed target from every other origin where that same entity can appear, unless an explicit entity-state change justifies the difference.
- Do not model drag/drop compatibility around UI flows such as "create from palette", "move from workbench", or "restore from trash". Model compatibility once from entity kind plus entity state, then reuse it everywhere.
- Trash is not a special behavioral state by default. Sending an entity to trash must not silently remove drag/drop compatibility if that entity is still present in the UI.
- Differences in drag/drop compatibility must come from explicit entity state, not from provenance alone. Example: a produce lot may gain different targets once it is ground, extracted, sealed, consumed, or otherwise transformed.
- In practice, `allowedDropTargets` should be derived from the entity kind / tool type, then reused everywhere (`palette`, `workbench`, `rack`, `trash`).
- When richer workflow states are introduced, derive `allowedDropTargets` from entity kind plus entity state, then reuse that result everywhere.
- Source information is still needed, but only to choose the backend command at drop time (`create`, `move`, `restore`).
- Do not duplicate drag compatibility rules in multiple UI components. Prefer one shared helper as the source of truth.
- Every time a new draggable component or drop target is added, add or update a dedicated DnD matrix suite.
- That matrix must test the new component as a drag source against every existing drop target type.
- That matrix must also test the new component as a drop target receiving every existing draggable source type that can appear in the UI.
- In practice, treat this as a cross-product requirement: every concrete draggable UI component must be exercised against every compatible or incompatible concrete drop component that can coexist in the UI.
- Do not stop at one representative item per behavior group if multiple concrete palette items, rack entries, trash entries, or widget variants are visible in the product.
- Do not rely on representative behavior groups alone when a concrete component exists in the UI. If the UI exposes a distinct draggable component, it must appear explicitly in the DnD matrix.
- When adding a new draggable entity, explicitly test the full origin-to-target matrix that matters for that entity. For example, if a `sample_vial` can go to the rack, cover at least `palette -> rack`, `workbench -> rack`, and `trash -> rack`.
- If a new origin is added for an existing entity, update the matrix so that the entity is tested from that origin against every relevant target, with the same compatibility expectations unless entity state intentionally differs.
- Drag-and-drop tests should verify all of these when relevant:
  - highlighted targets during drag
  - `dragover` acceptance / rejection
  - final `drop`
  - the backend command that was sent

### Drag-and-Drop Target Architecture

- This section describes the target architecture to converge toward. It is not a claim that the current codebase is already fully structured this way.
- Treat drag-and-drop as a first-class cross-cutting system, not as ad hoc UI glue inside individual React components.
- As the product grows, assume that many or most visible lab entities will become draggable.
- Each draggable entity kind should eventually expose one shared drag behavior contract.
- Prefer a TypeScript interface plus pure functions or adapters over a React-side class hierarchy.
- The intended shape is a single central drag behavior layer that can answer at least:
  - what the entity kind is
  - whether the entity is draggable in its current state
  - which `allowedDropTargets` it exposes
  - how to build its `DragDescriptor`
- Derive drag behavior from entity kind plus entity state, not from the UI location where the entity is rendered.
- Keep provenance in the drag data, but only so the drop layer can choose the backend command (`create`, `move`, `restore`, `discard`, etc.).
- React components should not each reinvent drag logic for the same entity kind. Components should ask the shared drag behavior layer for drag specs and descriptors.
- When a new draggable entity is introduced, add it to the shared drag behavior layer before or alongside wiring its UI component.
- When a domain entity gains a new workflow state such as ground, extracted, sealed, labeled, consumed, or similar, update the shared drag behavior derivation for that entity-state combination.
- Prefer one central function or module such as `getEntityDragSpec(...)` or `drag-behaviors.ts` over many scattered per-component conditionals.
- The long-term direction is:
  - shared drag behavior resolves compatibility and draggability
  - shared descriptor builder serializes drag state
  - drop handlers map provenance plus target to the backend command

## Commit & Pull Request Guidelines

Git history is minimal (`first commit`), so use short imperative commit messages, for example `Add rack placement command`. Keep commits focused. PRs should include:

- a short problem/solution summary
- test evidence (`pytest` or coverage output)
- screenshots for frontend changes
- linked issue or task when available

## Security & Configuration Tips

Do not commit secrets, `.env` files, or generated artifacts from `.venv/`, `.coverage`, `.next/`, or `node_modules/`. Use `NEXT_PUBLIC_API_BASE_URL` for frontend API configuration.
