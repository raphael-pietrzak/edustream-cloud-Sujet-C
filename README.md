# EduStream

LMS cloud-native avec quiz temps réel. Projet final YNOV M2 — Développer pour le Cloud (v3 local-first).

## Architecture

4 microservices Node.js (Fastify), communication async via Redpanda, persistance PostgreSQL + MongoDB, déployés sur cluster Kubernetes local (k3d).

```
┌──────────────┐                              ┌────────────┐
│  courses-api │ ◄── HTTP CRUD ─────────────► │ PostgreSQL │
└──────────────┘                              └────────────┘
       ▲
       │ HTTP
┌──────┴────────┐                             ┌──────────┐
│ answers-ingest│ ── publish quiz.answers ──► │          │
│ (Knative)     │                             │ Redpanda │
└───────────────┘                             │          │
                                              └────┬─────┘
                                                   │ consume
                                                   ▼
                                          ┌──────────────────┐
                                          │ stats-aggregator │
                                          │ (sliding window) │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
┌──────────────┐                              ┌─────────┐
│ teacher-api  │ ◄── SSE / HTTP ──────────────┤ MongoDB │
└──────────────┘                              └─────────┘
```

Voir [`docs/architecture.md`](docs/architecture.md) pour le diagramme Mermaid détaillé.

## Quick start

```bash
# Cluster local (k3d, profil 8 Go)
make cluster-up

# Plateforme (ArgoCD, Redpanda, monitoring)
make platform-install

# Apps via GitOps
make gitops-bootstrap

# Démo charge
make load-test
```

Détails dans [`SETUP.md`](SETUP.md).

## Services

| Service | Rôle | Port | Stack |
|---|---|---|---|
| courses-api | CRUD cours / quiz / sessions | 3001 | Fastify + PostgreSQL |
| answers-ingest | Ingestion haute fréquence des réponses | 3002 | Fastify + Redpanda producer (Knative scale-to-zero) |
| stats-aggregator | Agrégation fenêtres glissantes 10 s | 3003 | Node + Redpanda consumer + MongoDB |
| teacher-api | Dashboard prof temps réel (SSE) | 3004 | Fastify + MongoDB |

## Documentation

- [`SETUP.md`](SETUP.md) — installation cluster + plateforme
- [`ADR.md`](ADR.md) — décisions architecturales
- [`docs/architecture.md`](docs/architecture.md) — diagrammes
- [`RAPPORT_TECHNIQUE.md`](RAPPORT_TECHNIQUE.md) — rapport final (à compléter)
