export type MessageBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

export function messageBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  let paragraph: string[] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) { flushParagraph(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { flushParagraph(); blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] }); continue; }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph(); const items = [bullet[1]];
      while (index + 1 < lines.length) { const next = /^\s*[-*]\s+(.+)$/.exec(lines[index + 1]); if (!next) break; items.push(next[1]); index += 1; }
      blocks.push({ type: "unordered-list", items }); continue;
    }
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph(); const items = [ordered[1]];
      while (index + 1 < lines.length) { const next = /^\s*\d+[.)]\s+(.+)$/.exec(lines[index + 1]); if (!next) break; items.push(next[1]); index += 1; }
      blocks.push({ type: "ordered-list", items }); continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}
