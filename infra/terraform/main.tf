# Cluster bootstrap is done out-of-band via `make cluster-up` (k3d CLI),
# since the k3d Terraform provider is fragile on Mac M1.
# Terraform handles: namespaces, Helm releases, ArgoCD root app.

resource "kubernetes_namespace" "app" {
  metadata { name = "app"
    labels = { team = "edustream", env = "dev" }
  }
}

resource "kubernetes_namespace" "data" {
  metadata { name = "data" }
}

resource "kubernetes_namespace" "messaging" {
  metadata { name = "messaging" }
}

resource "kubernetes_namespace" "monitoring" {
  metadata { name = "monitoring" }
}

resource "kubernetes_namespace" "argocd" {
  metadata { name = "argocd" }
}

resource "kubernetes_namespace" "vault" {
  metadata { name = "vault" }
}

resource "kubernetes_namespace" "external_secrets" {
  metadata { name = "external-secrets" }
}

# Example reusable module — instantiate one microservice via Terraform.
# Used here as a smoke test for the module. ArgoCD owns the rest.
module "answers_ingest_demo" {
  source = "./modules/microservice"

  name        = "answers-ingest-demo"
  namespace   = kubernetes_namespace.app.metadata[0].name
  image       = "ghcr.io/raphaelpietrzak/edustream/answers-ingest:latest"
  port        = 3002
  hpa_enabled = true
  hpa_max     = 4
}

resource "helm_release" "argocd" {
  name       = "argocd"
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "7.6.5"
  values = [yamlencode({
    server = {
      service = { type = "NodePort", nodePortHttps = 30080 }
    }
  })]
}

resource "helm_release" "kube_prom_stack" {
  name       = "kps"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "61.7.0"
  values = [yamlencode({
    grafana = {
      service = { type = "NodePort", nodePort = 30090 }
    }
    prometheus = {
      prometheusSpec = {
        retention = "2d"
        resources = { requests = { memory = "512Mi" }, limits = { memory = "1Gi" } }
      }
    }
  })]
}

resource "helm_release" "redpanda" {
  name       = "redpanda"
  namespace  = kubernetes_namespace.messaging.metadata[0].name
  repository = "https://charts.redpanda.com"
  chart      = "redpanda"
  version    = "5.9.5"
  values = [yamlencode({
    statefulset = { replicas = 1 }
    resources = {
      cpu    = { cores = 1 }
      memory = { container = { max = "1Gi" } }
    }
    tls      = { enabled = false }
    external = { enabled = false }
  })]
}
