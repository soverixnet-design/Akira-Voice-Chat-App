# Akira dedicated server target (not deployed)

Akira and Sovera are **different applications**. Never migrate or change Sovera while deploying Akira.

## Verified DigitalOcean droplet

- Droplet ID: `611960023`
- Public IPv4: `139.59.73.98`
- Private IPv4: `10.122.0.2` (only for authorized private-network traffic)
- Region: `blr1` (Bangalore)
- OS: Ubuntu 24.04 LTS
- Capacity: 2 vCPU, 2 GiB RAM, 90 GiB disk
- Target app: **Akira only**
- Sovera remains on its existing separate droplet, `610273705` / `206.189.238.27`.

## Safe deployment checklist

1. Verify SSH access, OS patching, existing processes, firewall rules, available disk/RAM, and backup/snapshot policy. Control-plane droplet status alone does not verify application health.
2. Configure a DNS hostname dedicated to Akira; issue HTTPS/TLS certificate. **Do not put `http://139.59.73.98:4301` in production APKs.**
3. Deploy Akira API container on loopback `127.0.0.1:4301` behind a TLS reverse proxy. Keep API and database ports closed to public traffic.
4. Set `AKIRA_ALLOWED_ORIGINS` to the exact HTTPS origin(s) of Akira's web app, separated by commas. Do not allow wildcard origins.
5. Provision a separate Akira database, secrets and least-privilege account; never reuse Sovera credentials.
6. After authentication and data APIs are implemented, configure the Akira client API base URL to the dedicated HTTPS endpoint. Preserve the existing Akira UI/artwork.
7. Run health checks and integration tests, then release a new APK only after verifying the real endpoints and Android device behavior.

## Current state

Only the isolated API foundation and health/status endpoints exist on the GitHub feature branch. No SSH, installation, reverse-proxy setup, database provisioning or production deployment has been performed on the droplet.
