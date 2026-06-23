# Setup — reproduire le cluster EduStream

Objectif : un correcteur reproduit le cluster en < 30 min sur Mac/Linux 8 Go RAM.

## 1. Prérequis

```bash
brew install docker kubectl k3d helm terraform argocd trivy k9s
# Optionnel : kafkajs CLI via rpk
brew install redpanda-data/tap/redpanda
```

Vérification :

```bash
docker version && kubectl version --client && k3d version && helm version && terraform version
```

## 2. Cluster k3d

```bash
make cluster-up
# → équivaut à : k3d cluster create --config k3d-config.yaml
```

Vérifier : `kubectl get nodes` doit montrer 1 server + 1 agent en `Ready`.

## 3. Plateforme (ordre obligatoire)

```bash
make platform-install
```

Installe dans l'ordre :
1. `ingress-nginx`
2. `cert-manager`
3. `argocd` (UI sur https://localhost:30080)
4. `kube-prometheus-stack` (Grafana sur http://localhost:30090)
5. `loki` + `promtail`
6. `redpanda` (namespace `messaging`)
7. `vault` (dev-mode) + `external-secrets`
8. `kubecost`
9. `mailhog`

## 4. GitOps bootstrap

```bash
make gitops-bootstrap
# → kubectl apply -f gitops/bootstrap/root-app.yaml
```

ArgoCD pull alors les apps depuis `gitops/apps/`.

## 5. Démo

```bash
# Démo self-heal
kubectl scale deploy/courses-api -n app --replicas=0
# attendre ~90 s → ArgoCD rétablit

# Démo charge
make load-test
# → k6 simule 500 étudiants envoyant des réponses
```

## 6. Mots de passe

```bash
# ArgoCD
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d

# Grafana
kubectl -n monitoring get secret kps-grafana -o jsonpath='{.data.admin-password}' | base64 -d
```

## 7. Nettoyage

```bash
make cluster-down
# → k3d cluster delete edustream
```
