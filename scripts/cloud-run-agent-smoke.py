import json
import os
import urllib.parse
import urllib.request


def main() -> None:
    base = os.environ.get("AGENTS_BASE", "https://garageai-agents-l7qqdpqo6a-ew.a.run.app").strip().rstrip("/")
    audience = urllib.parse.quote(base, safe="")
    metadata_request = urllib.request.Request(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience="
        + audience,
        headers={"Metadata-Flavor": "Google"},
    )
    identity_token = urllib.request.urlopen(metadata_request, timeout=15).read().decode().strip()
    application_token = os.environ["AGENTS_API_TOKEN"].strip()
    payload = json.dumps({"task": "Return a one-word health acknowledgement", "agents": ["qa"]}).encode()
    request = urllib.request.Request(
        base + "/agents/run",
        data=payload,
        headers={
            "Authorization": "Bearer " + identity_token,
            "X-Agents-Token": application_token,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.loads(response.read().decode())
    keys = sorted((result.get("results") or {}).keys())
    if response.status != 200 or keys != ["qa"]:
        raise RuntimeError("Unexpected private agent response")
    print("AGENT_E2E_SMOKE=passed")
    print("RESULT_KEYS=" + ",".join(keys))


if __name__ == "__main__":
    main()
