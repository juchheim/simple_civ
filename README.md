# Simple Civ v0.95

A digital board game / light 4X strategy game built with TypeScript.

## Architecture

This project is a monorepo with the following workspaces:

- **`engine`**: Pure TypeScript game logic. Contains all rules, state management, and world generation. Rendering-agnostic.
- **`client`**: React + Vite frontend. Renders the game using the `engine` package. Deploys to Vercel.
- **`server`**: Node/Express backend. Handles game persistence (MongoDB) and optional multiplayer features. Deploys to Koyeb.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- MongoDB (local or Atlas)

### Installation

```bash
npm install
```

### Development

To start both the client and server in development mode:

```bash
npm run dev
```

### Testing

To run unit tests for the engine:

```bash
npm test -w engine
```

## Documentation

- **[Implementation Status](docs/IMPLEMENTATION_STATUS.md)** - Track what's implemented, in progress, and planned
- **[Changelog](docs/development/CHANGELOG-2025-11-20.md)** - Recent changes and updates
- **[Game Rules](docs/rules/simple-civ_v0.93_rulebook.md)** - Official v0.93 rulebook
- **[Dev Spec](docs/dev-spec/v0.9/README.md)** - Technical specifications

## Deployment

- **Frontend**: Connect the `client` directory to Vercel.
- **Backend**: Connect the `server` directory to Koyeb.
