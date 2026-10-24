# Akira isolated API foundation

This is a **non-production foundation**, not a live voice-chat backend. It does not provide login, persistence, coins, gifts, voice, payments or an admin panel.

## Local test
```sh
cd server
npm test
npm start
curl http://127.0.0.1:4301/health
```

## Deployment (only after inspecting the existing Sovera server)
```sh
cd server
docker compose up -d --build
curl http://127.0.0.1:4301/health
```

- Isolated Akira service; no Sovera code, routes, or databases touched.
- Binds only to loopback port 4301, not exposed to the public internet.
- Do not deploy until memory/disk/port availability, firewall, backups, and reverse proxy are checked.
- Before production, add a separate PostgreSQL database, auth with hashed passwords, RBAC, server-authoritative wallet ledger, rate limiting, TLS, monitoring and a real RTC provider.
- Never store production passwords or money balances in browser localStorage.
