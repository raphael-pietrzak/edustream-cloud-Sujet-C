variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}

variable "kube_context" {
  type    = string
  default = "k3d-edustream"
}

variable "gitops_repo_url" {
  type    = string
  default = "https://github.com/raphaelpietrzak/edustream"
}
