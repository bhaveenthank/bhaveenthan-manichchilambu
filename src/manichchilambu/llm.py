"""
Small wrapper around the `claude -p` command line, with a disk cache.

Every prompt and answer gets saved under data/llm_cache, keyed by a hash of
(model, prompt, sample number). So a rerun of any experiment costs nothing and
gives the same answer, and anyone can audit exactly what the model was told.
"""
import hashlib
import json
import subprocess
import time
from pathlib import Path

CACHE = Path(__file__).resolve().parents[2] / "data" / "llm_cache"
OFFLINE_WAIT, OFFLINE_TRIES = 60, 20  # up to 20 minutes of waiting for the network per call


def ask(prompt, model="claude-sonnet-5-5", sample=0, timeout=240, retries=2):
    """Return the model's text. `sample` only changes the cache slot, so sample=1 and 2 are fresh draws."""
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(f"{model}|{sample}|{prompt}".encode()).hexdigest()[:24]
    path = CACHE / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))["answer"]
    last = None
    offline = 0
    attempt = 0
    while attempt <= retries:
        try:
            # Run from the cache folder so the CLI doesn't pick up project context.
            # With --tools "" the model can only read the prompt, it can't go and look at files.
            done = subprocess.run(
                ["claude", "-p", "--model", model, "--tools", "", "--output-format", "text"],
                input=prompt, capture_output=True, text=True, timeout=timeout, cwd=CACHE,
            )
            if done.returncode == 0 and done.stdout.strip():
                answer = done.stdout.strip()
                path.write_text(json.dumps(
                    {"model": model, "sample": sample, "when": time.strftime("%Y-%m-%d %H:%M"),
                     "prompt": prompt, "answer": answer}, ensure_ascii=False, indent=1), encoding="utf-8")
                return answer
            last = done.stderr[:300] or done.stdout[:300]
            # A dropped connection usually comes back by itself, so give it a few minutes before giving up.
            if any(word in last for word in ("Unable to connect", "FailedToOpenSocket", "ConnectionRefused", "ECONNRESET", "ETIMEDOUT")):
                offline += 1
                if offline <= OFFLINE_TRIES:
                    print(f"no connection, trying again in {OFFLINE_WAIT}s ({offline}/{OFFLINE_TRIES})", flush=True)
                    time.sleep(OFFLINE_WAIT)
                    continue
            # Retrying can't fix a bad login, so stop straight away and say what to do.
            if "authenticat" in last.lower():
                raise RuntimeError("login rejected. Run: claude auth logout, then claude auth login, then try again. "
                                   f"Answers already saved are kept. Details: {last}")
            # Same for the usage limit. Waiting a few seconds won't help, it needs hours.
            if "hit your limit" in last.lower():
                raise RuntimeError(f"usage limit reached. {last.strip()}")
        except subprocess.TimeoutExpired:
            last = "timeout"
        attempt += 1
        time.sleep(5 * attempt)
    raise RuntimeError(f"llm call failed: {last}")
