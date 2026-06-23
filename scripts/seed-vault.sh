#!/usr/bin/env bash
# Seed Vault dev-mode with secrets and register the token for ESO.
set -euo pipefail

echo "▸ Writing secrets to Vault dev-mode"
kubectl -n vault exec vault-0 -- vault kv put secret/postgresql pg_password="$(openssl rand -hex 16)"
kubectl -n vault exec vault-0 -- vault kv put secret/courses-api pg_password="$(kubectl -n vault exec vault-0 -- vault kv get -field=pg_password secret/postgresql)"

echo "▸ Provisioning vault-token in external-secrets namespace"
kubectl -n external-secrets create secret generic vault-token --from-literal=token=root --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Vault seeded."
