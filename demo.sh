#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname -- "$0")"
shiftproof_artifacts="$HOME/services/shiftproof/artifacts"
install -d -m 700 "$shiftproof_artifacts"
shiftproof_config=$(mktemp)
trap 'rm -f "$shiftproof_config"; playwright-cli -s=shiftproof-demo close >/dev/null 2>&1 || true' EXIT
python3 - "$shiftproof_config" <<'PY'
import json,sys
from pathlib import Path
browsers=sorted((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux64/chrome'),key=lambda p:int(p.parents[1].name.split('-')[1]),reverse=True)
Path(sys.argv[1]).write_text(json.dumps({'browser':{'browserName':'chromium','isolated':True,'launchOptions':{'executablePath':str(browsers[0]),'headless':True},'contextOptions':{'viewport':{'width':1440,'height':960},'reducedMotion':'reduce'}}}))
PY
playwright-cli -s=shiftproof-demo open http://127.0.0.1:8211/ --config="$shiftproof_config" >/dev/null
playwright-cli -s=shiftproof-demo video-start "$shiftproof_artifacts/demo.webm" >/dev/null
playwright-cli -s=shiftproof-demo --raw run-code --filename=demo.js > "$shiftproof_artifacts/demo.json"
playwright-cli -s=shiftproof-demo video-stop >/dev/null
python3 - "$shiftproof_artifacts/demo.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert 120 <= d['duration_seconds'] <= 180
print(json.dumps(d,indent=2))
PY
