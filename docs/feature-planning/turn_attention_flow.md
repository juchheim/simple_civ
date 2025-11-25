# Guided Turn Flow & End-Turn Gating Plan

## Overview
Players frequently miss mandatory follow-ups (new research, city production) and sometimes abandon important but optional tasks (idle units). This plan introduces a guided turn flow that funnels the current player through all outstanding tasks before "End Turn" becomes clickable.

## Goals
- Prevent turn submission while mandatory tasks are unresolved.
- Present a single, ordered queue of tasks with quick navigation (jump to city/unit, open tech tree).
- Allow players to explicitly skip/acknowledge non-mandatory items so they do not block the turn.
- Keep the system resilient: recompute tasks whenever state changes (new city, production completes, research cleared).

## Non-Goals
- No AI or rules changes; this is UX/state coordination only.
- No persistence changes (save/load) in this pass.

## Task Taxonomy
- **Blocking (required before End Turn unlocks):**
    - Research selection required (no active tech after completion or after clearing/canceling).
    - City production selection required (city queue empty after completion, after founding/capture, or after canceling/finishing a queue item).
    - Critical modal decisions that pause processing (e.g., forced choice dialogs if added later).
- **Attention (advisory; optional to acknowledge):**
    - Units with moves left and no orders (idling). Player can act, fortify/skip, or ignore; no forced click-through.
    - Builders/settlers with available charges and no assignment (same options as above).
    - City assignment reminders (population > worked tiles) if we keep manual assignment; player can auto-assign or ignore.
    - Optional alerts (housing/amenities, low health garrisons) are informational; allow "dismiss for this turn" but never gate.

Each task carries metadata: `type`, `severity` (blocking/attention), `entityIds` (cityId/unitId), `description`, and `createdAtTurn`.

## Engine/Data Plan
- Add a derived per-player `TurnAttentionQueue` stored in game state (or computed on demand) so the client receives an authoritative list.
- Build/rebuild the queue at:
    - Start-of-turn after processing research/production completions.
    - Whenever actions change the prerequisites (selecting research, changing city queue, founding/capturing cities, canceling production, clearing research).
    - When player issues a skip/acknowledge action for attention tasks (purely for UX cleanliness, not gating).
- Provide helper selectors:
    - `getBlockingTasks(playerId): TurnTask[]`
    - `getAttentionTasks(playerId): TurnTask[]`
- Define resolver actions:
    - `ResolveTask` for attention items (records "resolved" with reason `completed|skipped|auto-assigned`) but does not gate turns.
- Blocking tasks auto-resolve when their underlying condition is fixed (e.g., `setActiveResearch`, `setCityProduction`).

## Client/UI Plan
- Add a "Turn Tasks" panel/pill in the HUD showing counts (`Blocking | Attention`). Clicking opens a stack/queue view.
- When it becomes the player's turn, auto-open the first blocking task and focus the relevant UI:
    - **Research:** open TechTree modal; after selection, re-check queue.
    - **City production:** open City panel pre-focused on the city; allow "repeat last" shortcut if desired.
    - **Unit orders:** camera centers on the unit; provide actions for move/skip/fortify; "Skip for turn" resolves the attention item.
- "End Turn" button state:
    - Disabled while `blockingTasks.length > 0`.
    - Attention tasks never block; they are reminders only.
    - Enabled once blocking queue is empty; button can show `All blocking tasks done` state and still list attention items for optional handling.
- Show inline badges on cities/units on the map/HUD to mirror the queue entries for faster navigation.
- Add a toast/indicator if new blocking tasks appear mid-turn (e.g., player finishes production via rush-buy).

### UI Layout & Visuals
- **Placement:** docked near bottom-right, offset left of the End Turn card so it never overlaps the End Turn button. Z-index matches other HUD cards.
- **Collapsed state:** compact pill (`Turn Tasks · ⏳ Blocking: N | 👀 Attention: M`). Lives about 16px above the End Turn card's top or 12px to its left depending on viewport; click to expand. Pointer-events enabled; minimal footprint to avoid map occlusion.
- **Expanded state:** small card that "fans up and left" from the pill. Shows two sections:
    - **Blocking list:** numbered, red-accent badge (`Blocking`), items clickable to focus (TechTree, city card, unit camera).
    - **Attention list:** grey/blue accent (`Attention`), optional "Skip for turn" buttons; no gating.
- **Motion:** 150–180ms ease slide/fade from collapsed pill; chevron rotates to indicate state.
- **Badges:** matching dots on the End Turn card edge indicating blocking count; when zero, show a muted checkmark.
- **Responsiveness:** On narrow screens, the pill sits above the End Turn card and the expanded card grows upward; on wider screens it sits to the left and expands leftward to avoid covering the End Turn button.
- **Auto-collapse:** If both blocking and attention lists are empty, the panel auto-collapses; it auto-expands when new blocking tasks appear.

## Flow Walkthrough
1. **Start of Turn (current player):**
    - Engine resolves end-of-round effects, then builds `TurnAttentionQueue`.
    - Client receives updated state; blocking tasks trigger guided UI (e.g., auto-open TechTree).
2. **Resolve Blocking Tasks Sequentially:**
    - Player completes each blocking item via its contextual UI.
    - After each resolution, queue recomputes; UI advances to the next blocking task automatically.
3. **Attention Tasks (non-blocking):**
    - Visible in the panel; player can act, skip, or ignore without impacting "End Turn."
4. **Mid-Turn Changes:**
    - Actions that create new blockers (found city, clear research, finish a queue item via rush) rebuild the queue and re-disable "End Turn."
    - New attention items appear as optional reminders; no gating.
5. **End-Turn Availability:**
    - When blocking queue is empty, "End Turn" is active regardless of attention items.
    - If multiplayer/hotseat, passing the turn to the next player rebuilds their queue from their perspective.

## Implementation Steps (high level)
1. Define `TurnAttentionTask` type and builder functions in the engine (research, city production, unit idle detectors).
2. Expose queue data to the client in the turn state payload; wire rebuild triggers to relevant actions.
3. Add HUD "Turn Tasks" UI with navigation controls and per-task handlers.
4. Gate "End Turn" button only on blocking queue emptiness; add visual state for "waiting on blocking tasks."
5. Add optional skip/auto-assign paths for attention tasks; ensure ignoring them does not block.
6. QA: test flows covering research completion, city production completion, founding/capture, rush-buy completion mid-turn, idle units (ignored/acted/skipped), and skip/ack paths.
