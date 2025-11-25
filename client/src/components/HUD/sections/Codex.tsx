import React from "react";

type CodexEntry = {
    title: string;
    content: string;
    slug: string;
};

type RulebookBundle = {
    content: string;
    version: string;
    title: string;
};

const rulebooks = import.meta.glob<string>("../../../../../docs/rules/*rulebook.md", {
    query: "?raw",
    import: "default",
    eager: true,
}) as Record<string, string>;

function compareVersions(a: string, b: string): number {
    const parse = (v: string) => v.split(".").map(part => Number(part) || 0);
    const aParts = parse(a);
    const bParts = parse(b);
    const max = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < max; i++) {
        const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function pickLatestRulebook(): RulebookBundle | null {
    const entries = Object.entries(rulebooks);
    if (!entries.length) return null;

    let best: RulebookBundle | null = null;
    for (const [path, content] of entries) {
        const versionMatch = path.match(/_v(\d+(?:\.\d+)+)_rulebook/i);
        const version = versionMatch ? versionMatch[1] : "0.0";
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : "Rulebook";

        if (!best || compareVersions(version, best.version) > 0) {
            best = { content, version, title };
        }
    }
    return best;
}

function stripCodexSkippedContent(markdown: string): string {
    // Remove explicit skip blocks
    let sanitized = markdown.replace(/<!--\s*CODEX_SKIP_START\s*-->[\s\S]*?<!--\s*CODEX_SKIP_END\s*-->/gi, "");

    const lines = sanitized.split("\n");
    const result: string[] = [];
    const devHeadingRegex = /^(#{1,6}\s*)?\[DEV-ONLY\]/i;
    const headingStartRegex = /^(#{1,6}\s+|\d+\.)/;

    let skipping = false;
    for (const line of lines) {
        if (skipping) {
            if (headingStartRegex.test(line) && !devHeadingRegex.test(line)) {
                skipping = false;
            } else {
                continue;
            }
        }

        if (devHeadingRegex.test(line)) {
            skipping = true;
            continue;
        }

        result.push(line);
    }

    return result.join("\n");
}

function slugify(title: string): string {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    return base || "section";
}

function parseCodexEntries(markdown: string): CodexEntry[] {
    const rawEntries: Array<{ title: string; content: string }> = [];
    const docTitleMatch = markdown.match(/^#\s+(.+)$/m);
    const docTitle = docTitleMatch ? docTitleMatch[1].trim() : "Overview";

    const mdHeadingRegex = /^#{2,5}\s+(.+)$/gm;
    const numberHeadingRegex = /^(?!#)(\d+(?:\.\d+)*)\s+(.+)$/gm;

    type HeadingMatch = { title: string; index: number; length: number };
    const headingMatches: HeadingMatch[] = [];

    for (const match of markdown.matchAll(mdHeadingRegex)) {
        if (match.index === undefined) continue;
        headingMatches.push({ title: match[1].trim(), index: match.index, length: match[0].length });
    }

    for (const match of markdown.matchAll(numberHeadingRegex)) {
        if (match.index === undefined) continue;
        const title = `${match[1]} ${match[2].trim()}`;
        headingMatches.push({ title, index: match.index, length: match[0].length });
    }

    headingMatches.sort((a, b) => a.index - b.index);

    if (headingMatches.length === 0) {
        const slug = slugify(docTitle);
        return [{ title: docTitle, content: markdown.trim(), slug }];
    }

    const addEntry = (title: string, body: string) => {
        const trimmed = body.trim();
        if (trimmed.length === 0) return;
        rawEntries.push({ title, content: trimmed });
    };

    const firstHeadingIndex = headingMatches[0]?.index ?? 0;
    const intro = markdown.slice(0, firstHeadingIndex);
    addEntry(docTitle, intro);

    headingMatches.forEach((match, idx) => {
        const start = match.index + match.length;
        const end = idx === headingMatches.length - 1 ? markdown.length : headingMatches[idx + 1].index;
        const body = markdown.slice(start, end);
        addEntry(match.title, body);
    });

    const slugCounts = new Map<string, number>();
    return rawEntries.map(entry => {
        const base = slugify(entry.title);
        const count = slugCounts.get(base) ?? 0;
        slugCounts.set(base, count + 1);
        const slug = count === 0 ? base : `${base}-${count + 1}`;
        return { ...entry, slug };
    });
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatInline(text: string): string {
    const escaped = escapeHtml(text);
    return escaped
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderContent(content: string, keyPrefix: string): React.ReactNode[] {
    const blocks = content.trim().split(/\n\s*\n/);
    const nodes: React.ReactNode[] = [];

    blocks.forEach((block, blockIdx) => {
        const lines = block
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
        if (lines.length === 0) return;

        const isBulleted = lines.every(line => /^[-*]\s+/.test(line));
        const isNumbered = lines.every(line => /^\d+\.\s+/.test(line));

        if (isBulleted || isNumbered) {
            const Tag = isNumbered ? "ol" : "ul";
            nodes.push(
                React.createElement(
                    Tag,
                    { key: `${keyPrefix}-list-${blockIdx}`, className: "hud-list" },
                    lines.map((line, i) => {
                        const cleaned = isNumbered ? line.replace(/^\d+\.\s+/, "") : line.replace(/^[-*]\s+/, "");
                        return (
                            <li key={`${keyPrefix}-li-${blockIdx}-${i}`} dangerouslySetInnerHTML={{ __html: formatInline(cleaned) }} />
                        );
                    }),
                ),
            );
            return;
        }

        nodes.push(
            <p
                key={`${keyPrefix}-p-${blockIdx}`}
                className="hud-paragraph"
                dangerouslySetInnerHTML={{ __html: formatInline(lines.join(" ")) }}
            />,
        );
    });

    return nodes;
}

export const Codex: React.FC = () => {
    const bundle = React.useMemo(() => pickLatestRulebook(), []);
    const [query, setQuery] = React.useState("");
    const normalized = query.trim().toLowerCase();

    const codexContent = React.useMemo(() => {
        if (!bundle) return "";
        return stripCodexSkippedContent(bundle.content);
    }, [bundle]);

    const entries = React.useMemo(() => {
        if (!codexContent) return [];
        return parseCodexEntries(codexContent);
    }, [codexContent]);

    const visibleEntries = React.useMemo(() => {
        if (!normalized) return entries;
        return entries.filter(entry =>
            entry.title.toLowerCase().includes(normalized) || entry.content.toLowerCase().includes(normalized),
        );
    }, [entries, normalized]);

    if (!bundle) {
        return <div className="hud-subtext warn">Rulebook not found in docs/rules.</div>;
    }

    return (
        <div>
            <div className="hud-menu-header" style={{ marginBottom: 6 }}>
                <div>
                    <div className="hud-section-title">Codex</div>
                    <p className="hud-title-sm" style={{ margin: 0 }}>{bundle.title}</p>
                    <div className="hud-subtext" style={{ marginTop: 0 }}>Version {bundle.version}</div>
                </div>
                <span className="hud-pill" style={{ whiteSpace: "nowrap" }}>Auto-synced from docs/rules</span>
            </div>
            <input
                className="hud-search"
                placeholder="Search rules..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search codex"
            />
            <div className="hud-menu-scroll" style={{ marginTop: 8 }}>
                {visibleEntries.length === 0 && <div className="hud-subtext warn">No entries match that search.</div>}
                {visibleEntries.map(entry => (
                    <div key={entry.title} id={entry.slug} style={{ marginBottom: 10 }}>
                        <p className="hud-title-sm" style={{ margin: "0 0 4px 0" }}>{entry.title}</p>
                        <div className="hud-subtext" style={{ marginTop: 0, whiteSpace: "normal" }}>
                            {renderContent(entry.content, entry.title)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
