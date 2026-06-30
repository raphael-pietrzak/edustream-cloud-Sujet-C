#!/usr/bin/env bash
set -euo pipefail

# Installe les CLI nécessaires au cluster EduStream :
# docker, kubectl, k3d, helm, terraform, argocd, trivy, k9s, rpk (redpanda)
#
# Supporte : macOS (brew), Linux Debian/Ubuntu (apt + binaires),
#            Linux Fedora/RHEL (dnf + binaires).

have() { command -v "$1" >/dev/null 2>&1; }
log()  { printf "\033[36m==>\033[0m %s\n" "$*"; }
skip() { printf "\033[33m--\033[0m %s déjà installé, skip\n" "$1"; }

detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)
      if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "${ID:-}${ID_LIKE:-}" in
          *debian*|*ubuntu*) echo "debian" ;;
          *fedora*|*rhel*|*centos*) echo "fedora" ;;
          *) echo "linux-other" ;;
        esac
      else
        echo "linux-other"
      fi
      ;;
    *) echo "unsupported" ;;
  esac
}

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Architecture non supportée: $ARCH"; exit 1 ;;
esac

OS="$(detect_os)"
log "OS détecté: $OS ($ARCH)"

# ---------- Binaires Linux (Debian + Fedora partagent ça) ----------
install_linux_binaries() {
  if ! have docker; then
    log "Docker"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER" || true
  else skip docker; fi

  if ! have kubectl; then
    log "kubectl"
    curl -fsSLO "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/${ARCH}/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm kubectl
  else skip kubectl; fi

  if ! have k3d; then
    log "k3d"
    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
  else skip k3d; fi

  if ! have helm; then
    log "helm"
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  else skip helm; fi

  if ! have argocd; then
    log "argocd CLI"
    curl -fsSL -o /tmp/argocd "https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-${ARCH}"
    sudo install -m 555 /tmp/argocd /usr/local/bin/argocd
    rm /tmp/argocd
  else skip argocd; fi

  if ! have k9s; then
    log "k9s"
    K9S_VER="$(curl -fsSL https://api.github.com/repos/derailed/k9s/releases/latest | grep tag_name | cut -d '"' -f 4)"
    curl -fsSL "https://github.com/derailed/k9s/releases/download/${K9S_VER}/k9s_Linux_${ARCH}.tar.gz" | sudo tar xz -C /usr/local/bin k9s
  else skip k9s; fi

  if ! have rpk; then
    log "rpk (redpanda)"
    curl -fsSLO "https://github.com/redpanda-data/redpanda/releases/latest/download/rpk-linux-${ARCH}.zip"
    mkdir -p "$HOME/.local/bin"
    unzip -o "rpk-linux-${ARCH}.zip" -d "$HOME/.local/bin"
    rm "rpk-linux-${ARCH}.zip"
    echo "→ Ajouter \$HOME/.local/bin au PATH si nécessaire"
  else skip rpk; fi
}

install_macos() {
  if ! have brew; then
    echo "Homebrew requis. Installer via https://brew.sh puis relancer."
    exit 1
  fi
  brew tap hashicorp/tap
  have terraform || brew install hashicorp/tap/terraform
  for pkg in docker kubectl k3d helm argocd trivy k9s; do
    if have "$pkg"; then skip "$pkg"; else brew install "$pkg"; fi
  done
  if have rpk; then skip rpk; else brew install redpanda-data/tap/redpanda; fi
}

install_debian() {
  sudo apt-get update
  sudo apt-get install -y curl wget gnupg lsb-release ca-certificates unzip apt-transport-https

  install_linux_binaries

  if ! have terraform; then
    log "terraform"
    wget -qO- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
    sudo apt-get update && sudo apt-get install -y terraform
  else skip terraform; fi

  if ! have trivy; then
    log "trivy"
    wget -qO- https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
    echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
    sudo apt-get update && sudo apt-get install -y trivy
  else skip trivy; fi
}

install_fedora() {
  sudo dnf install -y curl wget unzip

  install_linux_binaries

  if ! have terraform; then
    log "terraform"
    sudo dnf install -y dnf-plugins-core
    sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/fedora/hashicorp.repo
    sudo dnf install -y terraform
  else skip terraform; fi

  if ! have trivy; then
    log "trivy"
    cat <<EOF | sudo tee /etc/yum.repos.d/trivy.repo
[trivy]
name=Trivy repository
baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/\$basearch/
gpgcheck=0
enabled=1
EOF
    sudo dnf install -y trivy
  else skip trivy; fi
}

case "$OS" in
  macos)  install_macos ;;
  debian) install_debian ;;
  fedora) install_fedora ;;
  *) echo "OS non supporté automatiquement. Voir SETUP.md pour les commandes manuelles."; exit 1 ;;
esac

log "Vérification"
docker version --format '{{.Client.Version}}' 2>/dev/null || true
kubectl version --client --output=yaml 2>/dev/null | head -3 || true
k3d version 2>/dev/null || true
helm version --short 2>/dev/null || true
terraform version 2>/dev/null | head -1 || true

log "Prérequis installés."
