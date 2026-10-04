#!/usr/bin/env bash
set -euo pipefail
umask 077
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cd "$source_dir"
artifacts="$HOME/services/shiftproof/artifacts"
install -d -m 700 "$artifacts"
config=$(mktemp)
result=$(mktemp "$artifacts/verification.XXXXXX")
cleanup() {
  rm -f "$config" "$result"
  playwright-cli -s=shiftproof-proof close >/dev/null 2>&1 || true
}
trap cleanup EXIT
python3 - "$config" <<'PY'
from pathlib import Path
import json, sys
browsers = sorted((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux64/chrome'), key=lambda p: int(p.parents[1].name.split('-')[1]), reverse=True)
if not browsers:
    raise SystemExit('Install a Playwright Chromium browser before verifying')
Path(sys.argv[1]).write_text(json.dumps({'browser':{'browserName':'chromium','isolated':True,'launchOptions':{'executablePath':str(browsers[0]),'headless':True},'contextOptions':{'viewport':{'width':1440,'height':1080},'reducedMotion':'reduce'}}}))
PY
playwright-cli -s=shiftproof-proof open http://127.0.0.1:8211/ --config="$config"
if ! playwright-cli -s=shiftproof-proof --raw run-code --filename=verify.js > "$result"; then
  cp "$result" "$artifacts/verification-failed.log"
  cat "$result"
  exit 1
fi
cp "$result" "$artifacts/verification-raw.log"
# Navigation/media operations can suppress run-code's return in this CLI build.
# Retrieve only the evidence object written after every browser check passed.
playwright-cli -s=shiftproof-proof --raw eval 'window.shiftproofVerificationResult' > "$result"
python3 - "$result" <<'PY'
import json,pathlib,sys
r=json.loads(pathlib.Path(sys.argv[1]).read_text())
if r.get('result') != 'passed' or not r.get('checks'):
    raise SystemExit('Browser verification did not pass')
print(json.dumps(r,indent=2))
PY
mv "$result" "$artifacts/verification.json"
rm -f "$artifacts/verification-failed.log" "$artifacts/verification-raw.log"
