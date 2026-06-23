#!/usr/bin/env bash
# Install all platform components in dependency order.
# Profile: Mac M1 8 Go RAM (k3d, no service mesh, lightweight monitoring).
set -euo pipefail

repo() { helm repo add "$1" "$2" >/dev/null 2>&1 || true; }

repo ingress-nginx https://kubernetes.github.io/ingress-nginx
repo jetstack https://charts.jetstack.io
repo prometheus-community https://prometheus-community.github.io/helm-charts
repo grafana https://grafana.github.io/helm-charts
repo redpanda https://charts.redpanda.com
repo hashicorp https://helm.releases.hashicorp.com
repo external-secrets https://charts.external-secrets.io
repo kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

step "ingress-nginx"
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.resources.requests.memory=128Mi \
  --set controller.resources.limits.memory=256Mi \
  --wait --timeout 5m

step "cert-manager"
helm upgrade --install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace --set crds.enabled=true --wait --timeout 5m

step "ArgoCD"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deploy/argocd-server --timeout=5m
kubectl -n argocd patch svc argocd-server -p '{"spec":{"type":"NodePort","ports":[{"port":443,"nodePort":30080}]}}' || true

step "Argo Rollouts"
kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

step "kube-prometheus-stack (light)"
helm upgrade --install kps prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --set grafana.service.type=NodePort --set grafana.service.nodePort=30090 \
  --set prometheus.prometheusSpec.retention=2d \
  --set prometheus.prometheusSpec.resources.requests.memory=512Mi \
  --set prometheus.prometheusSpec.resources.limits.memory=1Gi \
  --set alertmanager.alertmanagerSpec.resources.requests.memory=64Mi \
  --wait --timeout 10m

step "Loki + Promtail (single binary)"
helm upgrade --install loki grafana/loki -n monitoring \
  --set deploymentMode=SingleBinary \
  --set loki.commonConfig.replication_factor=1 \
  --set loki.storage.type=filesystem \
  --set singleBinary.replicas=1 \
  --set chunksCache.enabled=false --set resultsCache.enabled=false
helm upgrade --install promtail grafana/promtail -n monitoring \
  --set "config.clients[0].url=http://loki:3100/loki/api/v1/push"

step "Redpanda"
helm upgrade --install redpanda redpanda/redpanda \
  -n messaging --create-namespace \
  --set statefulset.replicas=1 \
  --set resources.cpu.cores=1 \
  --set resources.memory.container.max=1Gi \
  --set tls.enabled=false --set external.enabled=false --wait --timeout 5m

step "Vault (dev-mode) + External Secrets"
helm upgrade --install vault hashicorp/vault \
  -n vault --create-namespace \
  --set server.dev.enabled=true --set server.dev.devRootToken=root --wait --timeout 5m
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace --set installCRDs=true --wait --timeout 5m

step "Kubecost (light)"
helm upgrade --install kubecost kubecost/cost-analyzer \
  -n kubecost --create-namespace \
  --set kubecostToken="aGVsbS1jaGFydEBrdWJlY29zdC5jb20=xm343yadf98" \
  --set prometheus.kube-state-metrics.disabled=true \
  --set prometheus.nodeExporter.enabled=false

step "MailHog"
kubectl create namespace mail --dry-run=client -o yaml | kubectl apply -f -
kubectl -n mail apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata: { name: mailhog }
spec:
  replicas: 1
  selector: { matchLabels: { app: mailhog } }
  template:
    metadata: { labels: { app: mailhog } }
    spec:
      containers:
        - name: mailhog
          image: mailhog/mailhog:latest
          resources: { requests: { memory: 32Mi }, limits: { memory: 96Mi } }
          ports:
            - { containerPort: 1025 }
            - { containerPort: 8025 }
---
apiVersion: v1
kind: Service
metadata: { name: mailhog }
spec:
  selector: { app: mailhog }
  ports:
    - { name: smtp, port: 1025, targetPort: 1025 }
    - { name: http, port: 8025, targetPort: 8025 }
EOF

echo
echo "✅ Platform installed. Next: ./scripts/seed-vault.sh && make gitops-bootstrap"
echo "   ArgoCD UI:    https://localhost:30080  (admin / \$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d))"
echo "   Grafana UI:   http://localhost:30090   (admin / \$(kubectl -n monitoring get secret kps-grafana -o jsonpath='{.data.admin-password}' | base64 -d))"
