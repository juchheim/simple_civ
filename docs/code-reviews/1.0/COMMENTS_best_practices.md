# Code Comment Best Practices for AI & Human Collaboration

This document defines the standards used for reviewing code comments in the Simple-Civ codebase. These practices aim to enhance readability for human developers and context understanding for AI agents.

## 1. Intent Over Implementation
- **Rule**: Comments should explain *why* something is done, not *what* is being done.
- **Why**: The code itself explains the "what". AI and humans need to understand the reasoning, edge cases, or business logic behind the implementation.
- **Bad**: `i++ // increment i`
- **Good**: `// Increment retry counter to prevent infinite loops in network requests`

## 2. Structured Documentation (TSDoc/JSDoc)
- **Rule**: Use TSDoc/JSDoc format for all exported functions, classes, and interfaces.
- **Why**: Structured comments are easily parsed by IDEs and AI tools. They provide a standard way to describe parameters, return values, and side effects.
- **Example**:
  ```typescript
  /**
   * Calculates the pathfinding cost between two tiles.
   * @param start - The starting tile coordinates.
   * @param end - The target tile coordinates.
   * @returns The movement cost, or Infinity if unreachable.
   */
  ```

## 3. Contextual Markers
- **Rule**: Use standard markers for technical debt or future work.
- **Why**: Helps AI agents identify areas needing attention or known issues.
- **Keywords**:
  - `TODO`: Pending work.
  - `FIXME`: Broken or buggy code needing immediate attention.
  - `NOTE`: Important context or warnings.
  - `HACK`: Suboptimal solutions that should be refactored.

## 4. Accuracy and Freshness
- **Rule**: Comments must be up-to-date with the code.
- **Why**: Outdated comments are worse than no comments. They cause "hallucinations" in AI reasoning and confusion for humans.
- **Action**: Delete or update comments that contradict the code.

## 5. High-Level Summaries
- **Rule**: Complex modules or files should have a top-level comment explaining their purpose.
- **Why**: Provides immediate context for AI agents entering a file, saving token usage on analyzing the entire file to guess its purpose.

## 6. Avoid "Ghost" Comments
- **Rule**: Remove commented-out code.
- **Why**: It clutters the codebase and is handled better by version control (Git). It confuses AI agents about whether the code is active or reference.
