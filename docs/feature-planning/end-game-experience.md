# Feature: Immersive End of Game Experience
Status: **Implemented (v1.0)**

## Overview
The End Game Experience replaces the simple "Victory/Defeat" modal with a rich, immersive summary that celebrates the player's journey. This includes:
1.  **Visuals**: High-impact text and artwork.
2.  **History Replay**: A time-lapse of the game showing the map being explored and key events (city founding, battles, etc.) unfolding.
3.  **Statistics**: A post-replay summary screen with rankings and data graphs.

## User Review Required
> [!IMPORTANT]
> **Performance Consideration**: Tracking per-turn statistics and fog-of-war history can increase memory usage. We will optimize by storing only "deltas" (newly revealed tiles) rather than full snapshots.
>
> **Art Generation**: The "generated image" feature will utilize the `generate_image` tool. We need to decide *when* this generates—ideally in the background as the game ends, though there may be a slight delay.

### Performance Analysis
We ran a simulation script (`scripts/estimate_history.ts`) to calculate the memory footprint for recording a full 500-turn game on the largest map setting ("Huge", 34x25 tiles).

**Simulation Results (Huge Map, 500 Turns - Worst Case):**
- **Fog of War (Deltas):** ~240 KB (assuming mostly full map revealed)
- **Stats History:** ~32 KB
- **Events (High Activity):** ~8 KB
- **Total JSON Size:** ~280 KB
- **Runtime Memory Impact:** ~1.2 MB

**Conclusion:** The performance impact is negligible. Even on strict mobile environments (like Safari on older iOS devices which typically allow >500MB heap), an extra ~1.2MB of data is trivial.
-   **Memory**: usage contributes <0.2% to the total game state.
-   **CPU**: Recording is O(1) per turn.
-   **Rendering**: The Replay visualization will use the existing optimized Canvas/SVG renderers which handle ~850 tiles at 60fps easily.

**Optimization Strategy:**
We will store fog updates as "Deltas" (only new tiles revealed this turn) rather than snapshots. This is already factored into the calculation above. If we stored snapshots, the size would be ~100MB, which *would* be a problem. The Delta approach is essential and effectively solves the scale issue.

## Proposed Changes

### 1. Engine: History Tracking System
We need to start recording the game's story as it happens.

#### `engine/src/core/types.ts`
Add new types for history tracking.

```typescript
export enum HistoryEventType {
    CityFounded = "CityFounded",
    CityCaptured = "CityCaptured",
    CityRazed = "CityRazed",
    WonderBuilt = "WonderBuilt",
    EraEntered = "EraEntered",
    TechResearched = "TechResearched",
    WarDeclared = "WarDeclared",
    PeaceMade = "PeaceMade",
    CivContact = "CivContact",
    UnitPromoted = "UnitPromoted", // Maybe for Titans?
}

export interface HistoryEvent {
    turn: number;
    type: HistoryEventType;
    playerId: string;
    data: any; // Flexible payload (e.g., coords, name, targetId)
}

export interface TurnStats {
    turn: number;
    playerId: string;
    stats: {
        science: number;
        production: number;
        military: number;
        gold?: number;
        territory: number; // Number of tiles
        score: number;
    };
}

export interface PlayerHistory {
    events: HistoryEvent[];
    stats: TurnStats[];
    fogHistory: Record<number, HexCoord[]>; // Turn -> List of newly revealed tiles
}

// Add to GameState or Player object? 
// Likely GameState.history (global events) vs Player.history.
// A global `history: GameHistory` in GameState is best.
export interface GameHistory {
    events: HistoryEvent[]; // Global chronological list
    playerStats: Record<string, TurnStats[]>; // Keyed by PlayerID
    playerFog: Record<string, Record<number, HexCoord[]>>; // PlayerID -> Turn -> Tiles[]
}
```

#### `engine/src/game/history.ts` (NEW)
Create a helper module to easily log events.
-   `logEvent(state, eventType, ...)`
-   `recordTurnStats(state)`: Called at `EndTurn` or `StartOfTurn`.
-   `recordFogReveal(state, playerId, tiles)`: Called whenever `revealed` set changes.

#### Hooking into Gameplay
We will need to inject calls to `logEvent` in:
-   `actions/city.ts` (Founding)
-   `turn-lifecycle.ts` (Era, Techs, Stats recording)
-   `combat.ts` (City Capture)
-   `diplomacy.ts` (War/Peace)

### 2. Client: New End Game Screen
Replace `VictoryLossScreen.tsx` with a multi-stage component `EndGameExperience.tsx`.

#### Stages
1.  **Splash Stage**:
    -   Big "VICTORY" or "DEFEAT" text (animated).
    -   Background: High-quality generated image based on Civ (e.g., "Cyberpunk city" for Engine era winner, "Lush gardens" for Jade Covenant).
    -   "Continue" button or auto-transition after 5s.

2.  **Replay Stage**:
    -   **Visual**: A large, central Minimap.
    -   **Mechanism**: A scrubber/timeline at the bottom.
    -   **Playback**:
        -   Starts at Turn 0 (black map).
        -   Fast-forwards through turns.
        -   Updates Fog of War mask based on `playerFog` history.
        -   Pops up "Event Cards" or "Toast Notifications" when key events trigger (e.g., "Turn 45: Founded Capital", "Turn 98: War with Iron Legion").
    -   **Controls**: Pause, Play, Speed (1x, 2x, 4x), Skip.

3.  **Stats Stage**:
    -   Tabbed interface:
        -   **Rankings**: Simple table of "Most Science", "Largest Army", etc.
        -   **Graphs**: Line charts showing Science/Turn, Military Strength over time for all known civs. (Use a lightweight charting lib or custom SVG lines).

### 3. Implementation Plan
1.  **Backend (Engine)**:
    -   Define Types.
    -   Implement `History` module.
    -   Add hooks to `TurnLifecycle` and Actions.
    -   *Migration*: Handle potential issues with loading old saves (init empty history).
2.  **Frontend (Client)**:
    -   Create `EndGame/` directory.
    -   Implement `ReplayMap` (optimized Minimap).
    -   Implement `StatsGraphs` (SVG-based line charts).
    -   Implement `EndGameExperience` main container.
    -   Integrate `generate_image` call (mocked for now, or real via agent tool if possible—actually in runtime, the *game* can't call agent tools. We will pre-generate generic victory images for each Civ/Era combo and bundle them, OR use a static set of high-quality assets. *Correction*: The user request says "generate this". Since the agent can't generate images at runtime for the user, I (the agent) should generate a set of assets *now* and put them in `assets/victory/`.)

### 4. Visual Implementation Strategy
To ensure a "visually stunning" premium feel, we will strictly adhere to the following design system:

**Theme & Atmosphere:**
-   **Backgrounds**: The generated victory image will serve as the full-screen background.
    -   *Look & Feel*: It will have a slow "Ken Burns" pan/zoom effect to feel alive.
    -   *Overlay*: A heavy glassmorphism layer (`backdrop-filter: blur(20px) saturate(180%)`) will sit behind text/UI elements to ensure readability while maintaining depth.
-   **Typography**:
    -   Headers: "Victory" / "Defeat" will be massive (`6rem+`), using a metallic gradient fill (Gold for victory, Steel for defeat) with a drop shadow/glow.
    -   Font: Use the game's display font (if available) or a strong serif for headers to feel "epic".

**Animations (CSS / Framer Motion):**
-   **Entrance**: All elements must cascade in (`staggerChildren`). No abrupt appearances.
    -   Use `spring` physics for the replay modal popping up.
-   **Replay Map**:
    -   The Minimap will not just be flat; it will have an outer "glow" matching the winner's civ color.
    -   Fog reveal events will cross-fade, not flicker.
-   **Event Cards**:
    -   As history plays, events (e.g., "City Founded") won't just list text. They will appear as floating "toast" cards sliding in from the right.
    -   Style: Semi-transparent black glass with a thin border matching the Civ color.

**Charts & Data:**
-   **Style**: We will NOT use default library styles.
-   **Line Charts**:
    -   **Stroke**: Thick, smooth bezier curves (`tension: 0.4`).
    -   **Fill**: Gradient fill under the line fading to 0 opacity.
    -   **Points**: Hidden by default, visible on hover.
    -   **Grid**: Extremely subtle or removed entirely; let the data shape speak.

**Interactions:**
-   **Buttons**: "Restart" / "Main Menu" will be highly stylized, likely pill-shaped with a glowing border on hover (`box-shadow`), avoiding default HTML look.
-   **Timeline Scrubber**: Custom styled input range—thin track, large glowing thumb.

**Layout Constraints (CRITICAL):**
-   **Viewport Only**: The entire experience must fit within `100vh` / `100vw`.
    -   Container style: `position: fixed; inset: 0; overflow: hidden;`
-   **No Page Scroll**: There shall be **ZERO** document-level scrolling.
    -   If content (like stats logs) exceeds space, it must be handled via **Tabs** or **Pagination** to keep information density high but within bounds.
    -   *Exception*: A specific, clearly demarcated list container (e.g., "Event Log" sidebar) may have internal scrolling (`overflow-y: auto`) if absolutely necessary, but it must be styled with a custom thin scrollbar to match the UI. It enters/exits as a unit; the page never moves.

### 5. Verification Plan
### Automated Tests
-   **Engine**:
    -   `history.test.ts`: Verify events are logged correctly.
    -   `stats.test.ts`: Verify turn stats are recorded and accurate.
-   **Client**:
    -   Jest snapshot tests for `ReplayMap` rendering.

### Manual Verification
1.  Start a game (can use dev tools to `force_victory`).
2.  Verify the "Splash" screen appears.
3.  Watch the "Replay". Check if:
    -   Fog reveals correctly matching gameplay.
    -   Events pop up at correct turns.
4.  Check "Stats" screen:
    -   Verify data matches the game flow.
    -   Check graph rendering.
