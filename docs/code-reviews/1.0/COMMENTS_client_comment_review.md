# Client Code Comment Review Findings

## Root (`client/src`)

### `App.tsx`
- **Strengths**: Good comments for specific behaviors (e.g., auto-clearing errors, map size constraints).
- **Weaknesses**: Missing TSDoc for the main `App` component.
- **Action**: Add TSDoc.

## Hooks (`client/src/hooks`)

### `useGameSession.ts`
- **Strengths**: Critical logic like autosave frequency and AI turn skipping is well-commented.
- **Weaknesses**: Missing TSDoc for the hook's return values and options.
- **Action**: Add TSDoc.

### `useMapController.ts`
- **Strengths**: Clear section markers (`// --- Helpers ---`). Good explanation of fallback logic.
- **Weaknesses**: Missing TSDoc for the hook and its parameters.
- **Action**: Add TSDoc.

## Components (`client/src/components`)

### `GameMap.tsx`
- **Strengths**: Clear effect documentation.
- **Weaknesses**: Missing TSDoc for component props.
- **Action**: Add TSDoc to `GameMapProps` and the component itself.

### `HUD.tsx`
*(Pending review - assumed similar pattern of missing TSDoc based on other components)*
