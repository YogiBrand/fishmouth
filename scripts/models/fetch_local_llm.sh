#!/usr/bin/env bash
set -euo pipefail

DEST=${1:-/opt/fishmouth-models}
MODEL_REPO=${MODEL_REPO:-Qwen/Qwen2.5-7B-Instruct}

mkdir -p "$DEST"
echo "Downloading model $MODEL_REPO to $DEST (requires HF_TOKEN if gated)"
python - <<'PY'
import os, sys
from huggingface_hub import snapshot_download

dest = os.environ.get('DEST', sys.argv[1] if len(sys.argv) > 1 else '/opt/fishmouth-models')
repo = os.environ.get('MODEL_REPO', 'Qwen/Qwen2.5-7B-Instruct')
token = os.environ.get('HF_TOKEN')
snapshot_download(repo_id=repo, local_dir=os.path.join(dest, repo.split('/')[-1]), token=token, local_dir_use_symlinks=False)
print('✅ Model downloaded')
PY

echo "Done. Mount $DEST into docker-compose vllm:/models"


