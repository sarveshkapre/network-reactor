import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <div className="inline-flex items-center gap-2 text-xs text-white/60">
          <span className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/15">
            internet diagnostics
          </span>
          <span className="font-mono">fast</span>
          <span className="font-mono">evidence-first</span>
          <span className="font-mono">privacy-minded</span>
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
          A clean UI for the network rabbit hole.
        </h1>
        <p className="max-w-2xl text-pretty text-base leading-7 text-white/65">
          Network Reactor is a suite of tools for understanding performance, identity, and routing:
          page load analysis, IP metadata, BGP/ASN exploration, and a browser speed test.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ToolCard
          href="/page-load"
          title="Page Load Lab"
          desc="URL in -> Core Web Vitals + a ranked “why slow?” list with evidence."
          tag="perf"
        />
        <ToolCard
          href="/my-ip"
          title="My IP"
          desc="What the server sees + ASN/prefix/rDNS enrichment. Export JSON."
          tag="identity"
        />
        <ToolCard
          href="/bgp"
          title="BGP Explorer"
          desc="Search IP/prefix/ASN and see who owns it, how it’s routed, and what’s suspicious."
          tag="routing"
        />
        <ToolCard
          href="/speedtest"
          title="Speed Test"
          desc="Download/upload/latency/jitter with a stability-first view."
          tag="throughput"
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/65 ring-1 ring-white/10">
        <div className="font-medium text-white/85">Nerd mode rules</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Claims should show timestamps and sources.</li>
          <li>External enrichment is best-effort and can be wrong.</li>
          <li>No persistent logging of user IPs by default.</li>
        </ul>
      </section>
    </div>
  );
}

function ToolCard({
  href,
  title,
  desc,
  tag,
}: {
  href: string;
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="text-lg font-semibold tracking-tight text-white/90 group-hover:text-white">
            {title}
          </div>
          <div className="text-sm leading-6 text-white/65">{desc}</div>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white/70 ring-1 ring-white/15">
          {tag}
        </span>
      </div>
      <div className="mt-4 text-xs text-white/55">
        Open tool <span className="font-mono">→</span>
      </div>
    </Link>
  );
}
