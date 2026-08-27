import assert from "node:assert/strict";
import test from "node:test";
import { convert } from "../lib/db";

test("positional placeholders become numbered Postgres parameters", () => {
  assert.equal(convert("SELECT * FROM users WHERE id=? AND active=?"), "SELECT * FROM users WHERE id=$1 AND active=$2");
});

test("placeholders inside string literals are not renumbered", () => {
  assert.equal(convert("SELECT '?' , id FROM t WHERE id=?"), "SELECT '?' , id FROM t WHERE id=$1");
});

test("empty-string and escaped quotes are handled", () => {
  assert.equal(convert("WHERE (?='' OR name=?)"), "WHERE ($1='' OR name=$2)");
  assert.equal(convert("SELECT 'O''Brien' WHERE id=?"), "SELECT 'O''Brien' WHERE id=$1");
});

test("camelCase aliases are double-quoted, snake_case columns are left alone", () => {
  assert.equal(
    convert("SELECT u.full_name as fullName, u.job_title as jobTitle, u.email FROM users u"),
    'SELECT u.full_name as "fullName", u.job_title as "jobTitle", u.email FROM users u',
  );
});

test("aliases on subquery/count expressions are quoted", () => {
  assert.equal(
    convert("SELECT (SELECT count(*) FROM r) as replyCount FROM p"),
    'SELECT (SELECT count(*) FROM r) as "replyCount" FROM p',
  );
});

test("the substring 'as' inside identifiers is not treated as an alias keyword", () => {
  assert.equal(convert("SELECT class_name, has_access FROM t"), "SELECT class_name, has_access FROM t");
});

test("existing casts survive placeholder translation", () => {
  assert.equal(convert("WHERE (?::int=1 OR dept=?)"), "WHERE ($1::int=1 OR dept=$2)");
});
