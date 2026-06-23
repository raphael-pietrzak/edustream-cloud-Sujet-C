# Architecture Decision Records

## ADR-001 — Messaging : Redpanda

**Contexte.** Le sujet impose ≥ 1 topic + 1 souscription async. Trois candidats : Redpanda (Kafka-compatible), RabbitMQ, NATS JetStream.

**Décision.** Redpanda en single-broker (`statefulset.replicas=1`).

**Conséquences.**
- ➕ API Kafka standard → librairie `kafkajs` mature.
- ➕ Un seul binaire, pas de ZooKeeper, RAM raisonnable (~400 Mo idle).
- ➕ Ordonnancement par partition utile pour les réponses séquentielles d'un même étudiant.
- ➖ Pas de gestion fine des messages individuels comme RabbitMQ ; OK pour notre cas (volume > latence unitaire).
- DLQ implémentée via topic dédié `quiz.answers.dlq`.

---

## ADR-002 — Persistance : PostgreSQL + MongoDB

**Contexte.** Données structurées (cours, quiz, utilisateurs) + données semi-structurées avec fenêtres glissantes (stats par session/question).

**Décision.** PostgreSQL StatefulSet pour `courses-api`, MongoDB StatefulSet pour `stats-aggregator` / `teacher-api`.

**Conséquences.**
- ➕ Postgres = source de vérité relationnelle, contraintes FK utiles entre cours/quiz/questions.
- ➕ Mongo = écritures upsert efficaces sur des documents stats agrégés par session.
- ➖ Deux systèmes à opérer ; acceptable car solo, scope contenu.
- Alternative écartée : ClickHouse — plus aligné analytique mais surcoût RAM trop élevé sur portable 8 Go.

---

## ADR-003 — Runtime : k3d + Knative Serving sur `answers-ingest`

**Contexte.** Portable Mac M1 8 Go. Profil "Limite" du guide recommande k3d 1 node sans service mesh.

**Décision.** k3d 1 server + 1 agent, Knative Serving uniquement sur `answers-ingest`.

**Conséquences.**
- ➕ k3d plus léger que kind, démarre vite, k3s embarqué.
- ➕ Knative démontre le pattern serverless (scale-to-zero entre cours, scale-up sur pic de réponses) — coche l'exigence "Knative Serving accepté pour 1 service".
- ➖ Linkerd/Istio impossible (RAM insuffisante) → mTLS limité à NGINX Ingress + cert-manager pour la passerelle. NetworkPolicies couvrent l'isolation intra-cluster.
- ➖ Tempo et Chaos Mesh tentés uniquement si RAM le permet en fin de projet.

---

## ADR-004 — GitOps : ArgoCD App of Apps + canary sur stats-aggregator

**Contexte.** Exigence GitOps + déploiement progressif sur ≥ 1 service.

**Décision.** ArgoCD App of Apps (self-heal ON), Argo Rollouts canary sur `stats-aggregator` (20 % → 50 % → 100 % avec AnalysisTemplate `success-rate`).

**Conséquences.**
- ➕ Pattern pull-based : la CI ne touche pas le cluster, simplifie l'auth.
- ➕ `stats-aggregator` est le service où une régression devient visible immédiatement dans Grafana (taux d'agrégation, latence) → AnalysisTemplate exploitable en live.
- ➖ Le repo gitops vit dans le même monorepo (`gitops/`) au lieu d'un repo séparé — choix pragmatique solo, à scinder si l'équipe grossit.
