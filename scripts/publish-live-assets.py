import json
import os
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
generated = root.parent / "Wohnungsplaner_Generated" / "reports" / "cloudbuild"
asset_root = root / "public" / "planner-assets"
bucket = os.environ["PLANNER_LIVE_ASSET_BUCKET"]
signer = os.environ["PLANNER_LIVE_ASSET_SIGNER"]
release = os.environ.get("PLANNER_LIVE_ASSET_RELEASE") or os.environ.get("BUILD_ID") or "manual"


def run(args):
    return subprocess.run(args, cwd=root, check=True, text=True, capture_output=True).stdout.strip()


manifest = json.loads((asset_root / "manifest.json").read_text(encoding="utf-8"))
assets = []
for asset in manifest["assets"]:
    relative = asset["path"].removeprefix("/planner-assets/")
    source = asset_root / relative
    destination = f"gs://{bucket}/{release}/{relative}"
    run(["gcloud", "storage", "cp", str(source), destination])
    signed = json.loads(run([
        "gcloud", "storage", "sign-url", destination,
        "--duration=1h",
        f"--impersonate-service-account={signer}",
        "--format=json",
    ]))
    entry = signed[0] if isinstance(signed, list) else signed
    url = entry.get("signed_url") or entry.get("url")
    if not url:
        raise RuntimeError(f"Keine signierte URL für {relative}")
    assets.append({**asset, "url": url})

generated.mkdir(parents=True, exist_ok=True)
output = generated / "live-manifest.json"
output.write_text(json.dumps({**manifest, "release": release, "assets": assets}, indent=2) + "\n", encoding="utf-8")
run(["gcloud", "storage", "cp", str(output), f"gs://{bucket}/current.json"])
print(json.dumps({"release": release, "assets": len(assets), "bucket": bucket}))
