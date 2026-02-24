# Simple Civ v1.0

**A digital board game / light 4X strategy game built with TypeScript.**

Simple Civ is a turn-based strategy game that distills the core "4X" experience (Explore, Expand, Exploit, Exterminate) into a streamlined, browser-based format. Players lead unique civilizations, found cities, research technologies, and compete for dominance on a procedurally generated hex map.

---

## 🎮 Gameplay Features

*   **4X Strategy Core**: Scout the unknown, settle new lands, build a powerful economy, and conquer your rivals.
*   **Unique Civilizations**: Play as distinct factions like the industrial **Forge Clans**, the scientific **Scholar Kingdoms**, the expansionist **Jade Covenant**, and more. Each has unique traits, units, and playstyles.
*   **Tactical Combat**: Turn-based hex combat with diverse units (Spear Guard, Bow Guard, Riders, Titans). Utilize terrain, and combined arms to win.
*   **City Management**: Manage population, production, and tile assignments. Construct buildings and wonders to boost your empire.
*   **Tech Tree**: Research technologies through different eras (Hearth, Banner, Engine) to unlock new units and abilities.
*   **Procedural Worlds**: Every game features a new map with varied terrain (Plains, Forests, Mountains, Rivers) and strategic resources.
*   **Smart AI**: Challenge AI opponents capable of planning wars, managing economies, and pursuing different victory conditions.
*   **Persistence**: Game state is automatically saved to your browser's local storage (`localStorage`), allowing you to resume later.
*   **Era-Based Music**: In-game loop music changes automatically by era (Primitive, Hearth, Banner, Engine, Aether).

## 🏗️ Architecture

This project is a **TypeScript Monorepo** managed with npm workspaces. It is designed for separation of concerns between game logic, presentation, and persistence.

### Workspaces

*   **`engine`** (`@simple-civ/engine`)
    *   **Role**: The "Brain". Contains 100% of the game rules, state management, AI logic, and map generation.
    *   **Tech**: Pure TypeScript, zero dependencies on React or DOM.
    *   **Testing**: Heavily unit-tested with Vitest to ensure rule integrity.

*   **`client`** (`@simple-civ/client`)
    *   **Role**: The "Face". A modern React application that renders the game state and handles user input.
    *   **Tech**: React, Vite, CSS Modules.
    *   **Deployment**: Optimized for Vercel.

*   **`server`** (`@simple-civ/server`)
    *   **Role**: The "Backbone". Handles API requests, game persistence, and multiplayer sessions.
    *   **Tech**: Node.js, Express, MongoDB, Mongoose.
    *   **Deployment**: Optimized for Koyeb / Docker containers.
    *   **Status**: *Incomplete / Not in use. The game currently runs entirely via the Client and Engine.*

## 🛠️ Technology Stack

*   **Languages**: TypeScript (Strict Mode)
*   **Frontend**: React 18, Vite, Vitest
*   **Backend**: Node.js, Express
*   **Database**: MongoDB
*   **Tooling**: ESLint, Prettier, npm Workspaces

## 🚀 Getting Started

### Prerequisites

*   **Node.js**: v18 or higher
*   **npm**: v9 or higher
*   **MongoDB**: A local instance or a connection string to MongoDB Atlas.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/juchheim/simple_civ.git
    cd simple_civ
    ```

2.  **Install dependencies** (from the root directory):
    ```bash
    npm install
    ```

### Running Locally

To start the entire stack (Client + Server) in development mode:

```bash
npm run dev
```

*   **Client**: http://localhost:5173
*   **Server**: http://localhost:3000

*Note: Ensure your MongoDB instance is running. You may need to configure a `.env` file in `server/` if using a custom DB URI.*

## 🧪 Development & Testing

The project emphasizes test-driven development for the game engine.

**Run Engine Tests:**
```bash
npm test -w engine
```

**Run Linting:**
```bash
npm run lint
```

**Generate Era Music Tracks (Stable Audio Open pipeline):**
```bash
npm run music:generate:dry-run
npm run music:generate
```

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

*   **[Game Rules](docs/rules/simple-civ_v1.0_rulebook.md)**: The official rulebook for v1.0.
*   **[Implementation Status](docs/IMPLEMENTATION_STATUS.md)**: Current feature completion tracking.
*   **[AI Status](docs/doc_ai_status.md)**: Overview of AI behaviors and logic.
*   **[Dev Spec](docs/dev-spec/v0.9/README.md)**: Technical specifications and architecture notes.
*   **[Changelog](docs/development/CHANGELOG-2025-11-20.md)**: History of recent updates.

## 📄 License

**Private / Proprietary**
&copy; 2025 Simple Civ Team. All rights reserved.
