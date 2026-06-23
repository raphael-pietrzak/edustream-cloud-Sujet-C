output "service_name" {
  value = kubernetes_service.this.metadata[0].name
}

output "service_dns" {
  value = "${kubernetes_service.this.metadata[0].name}.${var.namespace}.svc.cluster.local"
}
