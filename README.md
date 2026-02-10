# Network Reactor

Minimal, modern internet diagnostics suite:
- Page Load Lab (Core Web Vitals + “why slow?”)
- My IP (server-observed metadata + enrichment)
- BGP Explorer (IP/prefix/ASN lookups)
- Speed Test (download/upload/latency/jitter)

See `plan.md` for the roadmap and design notes.

## Getting Started

Install deps and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local Smoke Checks

- Page Load Lab: run a test against a public URL.
- My IP: open `/my-ip` and verify the “server observed” block renders.
- BGP Explorer: search an ASN like `15169` or an IP like `8.8.8.8`.
- Speed Test: run a short test; verify download/upload move.

## Build

```bash
npm run lint
npm run build
```

## Deploy

Vercel works well for the UI. Some tools (especially future real-browser page load runs) may require a dedicated runner.

## Notes

- External enrichment sources are treated as best-effort and are clearly labeled in the UI.
- Privacy-first defaults: avoid persistent logging of user IPs; show approximations with labels.
