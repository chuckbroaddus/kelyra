import { test } from "node:test";
import assert from "node:assert/strict";
import { add } from "./qa-loop-test.ts";

test("add returns the sum of two numbers", () => {
  assert.equal(add(2, 3), 5);
});

test("add handles negative numbers", () => {
  assert.equal(add(-2, 3), 1);
});
