import { isIP } from "node:net";

function isIPv4(input: string): boolean {
  return isIP(input) === 4;
}

function isIPv6(input: string): boolean {
  return isIP(input) === 6;
}

export function normalizeIp(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;
  // x-forwarded-for may contain a chain: "client, proxy1, proxy2"
  if (s.includes(",")) s = s.split(",")[0]?.trim() ?? s;
  if (s.startsWith("\"") && s.endsWith("\"")) s = s.slice(1, -1).trim();
  // Strip IPv6 brackets: "[::1]" or "[2001:db8::1]"
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  // Remove IPv6 zone IDs (e.g. fe80::1%en0)
  if (s.includes("%")) s = s.split("%", 1)[0] ?? s;
  // Strip port: "1.2.3.4:1234"
  if (s.includes(":") && isIPv4(s.split(":")[0] ?? "")) {
    s = s.split(":")[0] ?? s;
  }
  // Normalize IPv4-mapped IPv6 to plain IPv4 when possible.
  if (s.toLowerCase().startsWith("::ffff:")) {
    const mapped = s.slice("::ffff:".length);
    if (isIPv4(mapped)) return mapped;
  }
  if (isIPv4(s)) return s;
  if (isIPv6(s)) return s.toLowerCase();
  return null;
}

export function ipVersion(ip: string): "ipv4" | "ipv6" | "unknown" {
  if (isIPv4(ip)) return "ipv4";
  if (isIPv6(ip)) return "ipv6";
  return "unknown";
}

export function isPrivateOrSpecialIp(ip: string): boolean {
  const v = ipVersion(ip);
  if (v === "ipv4") {
    const p = ip.split(".").map((x) => Number(x));
    const [a, b] = p;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true;
    if (a === 100 && b != null && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b != null && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && b != null && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  if (v === "ipv6") {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return true;
    if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb")) {
      return true; // fe80::/10 link-local
    }
    if (s.startsWith("fc") || s.startsWith("fd")) return true; // fc00::/7 ULA
    if (s.startsWith("ff")) return true; // multicast
    return false;
  }

  return false;
}
