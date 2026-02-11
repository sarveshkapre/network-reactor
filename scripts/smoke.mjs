function mustGetEnv(name, fallback) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts) {
  const res = await fetch(url, { ...opts, headers: { accept: "application/json", ...(opts?.headers ?? {}) } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { res, json, text };
}

async function expectStatus(url, expected, opts) {
  const { res, json, text } = await fetchJson(url, opts);
  if (res.status !== expected) {
    throw new Error(`expected ${expected} for ${url}, got ${res.status} body=${text.slice(0, 240)}`);
  }
  return { res, json, text };
}

async function main() {
  const base = mustGetEnv("BASE_URL", "http://localhost:3000").replace(/\/+$/, "");
  console.log(`BASE_URL=${base}`);

  // 1) Ping
  {
    const { res, json } = await fetchJson(`${base}/api/speed/ping`, { cache: "no-store" });
    if (!res.ok) throw new Error(`ping status ${res.status}`);
    if (!json || json.ok !== true) throw new Error(`ping unexpected body`);
    console.log("ping: ok");
  }

  // 2) Download: read one chunk and cancel.
  {
    const res = await fetch(`${base}/api/speed/download?mb=1`, { cache: "no-store" });
    if (!res.ok) throw new Error(`download status ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("download missing body");
    const { value } = await reader.read();
    await reader.cancel();
    console.log(`download: ok (read ${value?.byteLength ?? 0} bytes then cancelled)`);
  }

  // 3) Upload: 1 MiB
  {
    const payload = new Uint8Array(1024 * 1024);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    const { res, json } = await fetchJson(`${base}/api/speed/upload`, {
      method: "POST",
      body: payload,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upload status ${res.status}`);
    if (!json || json.ok !== true) throw new Error("upload unexpected body");
    console.log(`upload: ok (bytesReceived=${json.bytesReceived ?? "?"})`);
  }

  // 4) WhoAmI in privacy mode: should not require any external calls.
  {
    const { res, json } = await fetchJson(`${base}/api/whoami?privacy=1`, { cache: "no-store" });
    if (!res.ok) throw new Error(`whoami status ${res.status}`);
    if (!json || !json.serverObserved) throw new Error("whoami missing serverObserved");
    if (!json.privacyMode || json.privacyMode.enabled !== true) throw new Error("whoami privacyMode not enabled");
    console.log("whoami: ok (privacy=1)");
  }

  // 5) BGP lookup: may fail if RIPEstat is unreachable; validate shape either way.
  {
    const { res, json } = await fetchJson(`${base}/api/bgp/lookup?q=8.8.8.8`, { cache: "no-store" });
    if (!json || json.kind !== "ip" || typeof json.source !== "string") {
      throw new Error(`bgp lookup unexpected body (status=${res.status})`);
    }
    if (!res.ok && typeof json.error !== "string") {
      throw new Error(`bgp lookup error missing error string (status=${res.status})`);
    }
    console.log(`bgp lookup: ${res.ok ? "ok" : `non-200(${res.status})`}`);
  }

  // 6) Negative paths: input validation.
  {
    await expectStatus(`${base}/api/pageload`, 400, { cache: "no-store" });
    await expectStatus(`${base}/api/bgp/lookup`, 400, { cache: "no-store" });
    await expectStatus(`${base}/api/bgp/lookup?q=not-a-query`, 400, { cache: "no-store" });
    console.log("validation paths: ok");
  }

  // 7) Security headers on app route.
  {
    const res = await fetch(`${base}/`, { cache: "no-store" });
    const xfo = res.headers.get("x-frame-options");
    const nosniff = res.headers.get("x-content-type-options");
    const referrer = res.headers.get("referrer-policy");
    if (!xfo || !nosniff || !referrer) {
      throw new Error("missing expected global security headers");
    }
    console.log("security headers: ok");
  }

  // 8) Rate limits: hit low-cost routes repeatedly and expect 429.
  {
    let whoami429 = false;
    for (let i = 0; i < 70; i++) {
      const { res } = await fetchJson(`${base}/api/whoami?privacy=1`, { cache: "no-store" });
      if (res.status === 429) {
        whoami429 = true;
        break;
      }
    }
    if (!whoami429) throw new Error("whoami rate-limit did not trigger");

    let bgp429 = false;
    for (let i = 0; i < 55; i++) {
      const { res } = await fetchJson(`${base}/api/bgp/lookup?q=invalid`, { cache: "no-store" });
      if (res.status === 429) {
        bgp429 = true;
        break;
      }
    }
    if (!bgp429) throw new Error("bgp lookup rate-limit did not trigger");
    console.log("rate-limit paths: ok");
  }

  if (process.env.RUN_PSI === "1") {
    // PSI can be rate-limited; this is optional.
    const { res, json } = await fetchJson(`${base}/api/pageload?url=${encodeURIComponent("https://example.com")}`, {
      cache: "no-store",
    });
    if (!json || typeof json.source !== "string") throw new Error("pageload missing source");
    console.log(`pageload: ${res.ok ? "ok" : `non-200(${res.status})`}`);
  } else {
    console.log("pageload: skipped (set RUN_PSI=1 to enable)");
  }

  console.log("smoke: pass");
  await sleep(10);
}

main().catch((err) => {
  console.error(`smoke: fail: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
