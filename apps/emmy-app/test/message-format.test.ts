import test from "node:test";
import assert from "node:assert/strict";
import { messageBlocks } from "../src/message-format.ts";

test("message formatting preserves paragraphs, headings, and grouped lists", () => {
  assert.deepEqual(messageBlocks("## Plan\n\nIntro text.\n\n- First\n- Second\n\n1. Start\n2. Measure"), [
    { type: "heading", level: 2, text: "Plan" },
    { type: "paragraph", text: "Intro text." },
    { type: "unordered-list", items: ["First", "Second"] },
    { type: "ordered-list", items: ["Start", "Measure"] },
  ]);
});

test("plain streamed text remains a readable paragraph", () => {
  assert.deepEqual(messageBlocks("A response that is still arriving"), [{ type: "paragraph", text: "A response that is still arriving" }]);
});
