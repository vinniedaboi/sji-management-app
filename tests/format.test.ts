import assert from "node:assert/strict";
import test from "node:test";
import { markdownSnippet, markdownToPlainText } from "../lib/format";

test("notice previews remove Markdown formatting and table syntax", () => {
  const markdown = [
    "## Today's cover arrangements",
    "Please check the **Cover Board** before the period begins.",
    "",
    "| Period | Absent colleague | Class | Room | Cover |",
    "| --- | --- | --- | --- | --- |",
    "| 1 | Ms Morgan | 7A | B12 | Mr Lee |",
  ].join("\n");

  assert.equal(
    markdownToPlainText(markdown),
    "Today's cover arrangements Please check the Cover Board before the period begins. Period · Absent colleague · Class · Room · Cover 1 · Ms Morgan · 7A · B12 · Mr Lee",
  );
});

test("notice previews preserve labels while removing links, lists, and inline markers", () => {
  assert.equal(
    markdownToPlainText("- Read [the policy](https://school.test/policy) and `confirm` it.\n> ~~Old guidance~~"),
    "Read the policy and confirm it. Old guidance",
  );
});

test("notice previews truncate after Markdown has been removed", () => {
  assert.equal(markdownSnippet("## **Hello** world", 11), "Hello world");
});
