# Server Hosting Notes

## Why the server needs a full Node host

- `server/src/index.ts` boots Express, loads routes, and immediately establishes a MongoDB connection via Mongoose using the `MONGO_URI` environment variable (`docs/codebase_info/server.md`). That connection stays open for the lifetime of the process so action requests can load and persist `GameState` documents.
- Cloudflare Workers now expose `node:http` so frameworks like Express can run at the edge, but their managed environment still **does not allow direct TCP connections**. All networking goes through `fetch()`-style APIs, so protocols like MongoDB’s binary wire protocol cannot be used directly. ([InfoQ: “Cloudflare Adds Node.js HTTP Servers to Cloudflare Workers”](https://www.infoq.com/news/2025/09/cloudflare-node-http-workers/))
- Because Workers can’t open raw TCP sockets, they can’t talk to MongoDB Atlas or any other standard Mongo server. You would have to rewrite persistence to use Cloudflare’s HTTP-facing storage products (D1, KV, Durable Objects, etc.) before an edge deployment would work.

## Practical implication

Stick with a traditional Node runtime (Koyeb, Fly.io, Render, Railway, self-hosted, etc.) for the Express + Mongo API. Those platforms allow long-lived TCP connections and environment variables, so the existing server can run unchanged. Cloudflare Workers remain an option only after a storage rewrite that removes the Mongo dependency.***

