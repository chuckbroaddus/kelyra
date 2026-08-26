let meta = #{
    name: "kelyra-qa-loop",
    description: "Implement a Kelyra change, then loop kelyra-implementer and read-only kelyra-qa until P0/P1 are gone or three repair cycles elapse",
    when_to_use: "Use to implement a Kelyra request with an iterative implementer/QA loop, optional security review, and typecheck/tests",
    phases: [
        #{ title: "Implement", detail: "kelyra-implementer writes the change in the current working tree" },
        #{ title: "QA", detail: "read-only kelyra-qa inspects the working tree independently" },
        #{ title: "Repair", detail: "resume the original implementer for P0/P1 findings" },
        #{ title: "Verify", detail: "run typecheck and inexpensive tests when they exist" },
        #{ title: "Security", detail: "read-only security review only if sensitive boundaries changed" },
    ],
};

const MAX_QA_REPAIR = 3;
const MAX_VERIFY_REPAIR = 3;
const MAX_SECURITY_REPAIR = 3;

let blocking_item = #{
    "type": "object",
    "required": ["severity", "title", "failure_path", "evidence", "required_fix"],
    "properties": #{
        "severity": #{ "type": "string" },
        "title": #{ "type": "string" },
        "failure_path": #{ "type": "string" },
        "evidence": #{ "type": "string" },
        "required_fix": #{ "type": "string" },
    },
};
let nonblocking_item = #{
    "type": "object",
    "required": ["severity", "title", "evidence", "recommendation"],
    "properties": #{
        "severity": #{ "type": "string" },
        "title": #{ "type": "string" },
        "evidence": #{ "type": "string" },
        "recommendation": #{ "type": "string" },
    },
};
let impl_schema = #{
    "type": "object",
    "required": ["summary"],
    "properties": #{
        "summary": #{ "type": "string" },
        "changed_paths": #{
            "type": "array",
            "items": #{ "type": "string" },
            "maxItems": 80,
        },
        "notes": #{ "type": "string" },
    },
};
let qa_schema = #{
    "type": "object",
    "required": ["ok", "blocking", "nonblocking"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "blocking": #{ "type": "array", "maxItems": 20, "items": blocking_item },
        "nonblocking": #{ "type": "array", "maxItems": 20, "items": nonblocking_item },
        "touched_security_boundary": #{ "type": "boolean" },
        "changed_paths": #{
            "type": "array",
            "items": #{ "type": "string" },
            "maxItems": 80,
        },
    },
};
let verify_schema = #{
    "type": "object",
    "required": ["ok", "summary"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "skipped": #{ "type": "array", "items": #{ "type": "string" } },
        "ran": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["command", "passed"],
                "properties": #{
                    "command": #{ "type": "string" },
                    "passed": #{ "type": "boolean" },
                    "output": #{ "type": "string" },
                },
            },
        },
        "blocking": #{ "type": "array", "maxItems": 12, "items": blocking_item },
    },
};

fn as_string(value) {
    if type_of(value) == "string" { value } else { "" }
}

fn as_lower(value) {
    if type_of(value) != "string" { return ""; }
    let copy = value;
    let lowered = copy.to_lower();
    if type_of(lowered) == "string" { return lowered; }
    copy.to_lower();
    copy
}

fn trimmed(value) {
    if type_of(value) != "string" { return ""; }
    let copy = value;
    copy.trim();
    copy
}

fn is_map(value) { type_of(value) == "map" }
fn is_array(value) { type_of(value) == "array" }

fn encode(value) {
    if value == () { "null" } else { json_encode(value) }
}

fn agent_ok(result) {
    result != () && result.success == true && result.cancelled != true
}

fn string_list(value) {
    let out = [];
    if !is_array(value) { return out; }
    for item in value {
        let s = trimmed(item);
        if s != "" { out.push(s); }
    }
    out
}

fn is_p0_or_p1(severity) {
    let s = as_lower(severity);
    s == "p0" || s == "p1"
}

fn push_p0_p1(into, items) {
    if !is_array(items) { return into; }
    for item in items {
        if is_map(item) && is_p0_or_p1(item.severity) {
            into.push(item);
        }
    }
    into
}

fn extract_blocking(output) {
    let found = [];
    if !is_map(output) { return found; }
    found = push_p0_p1(found, output.blocking);
    found = push_p0_p1(found, output.nonblocking);
    found
}

fn extract_nonblocking(output) {
    let found = [];
    if !is_map(output) { return found; }
    if is_array(output.nonblocking) {
        for item in output.nonblocking {
            if is_map(item) && !is_p0_or_p1(item.severity) {
                found.push(item);
            }
        }
    }
    if is_array(output.blocking) {
        for item in output.blocking {
            if is_map(item) && !is_p0_or_p1(item.severity) {
                found.push(item);
            }
        }
    }
    found
}

fn hay_has_any(hay, needles) {
    let h = as_lower(hay);
    if h == "" { return false; }
    for needle in needles {
        if h.contains(needle) { return true; }
    }
    false
}

fn request_looks_sensitive(request) {
    let needles = [
        "authentication",
        "authorization",
        "rls",
        "row level",
        "student_id",
        "student pii",
        "api key",
        "api_key",
        "xai_api_key",
        "expo_public",
        "jwt",
        "password",
        "permission",
        "edge function",
        "storage bucket",
        "approval logic",
        "approve grade",
        "student data",
    ];
    hay_has_any(request, needles)
}

fn path_looks_sensitive(path) {
    let needles = [
        "src/lib/auth",
        "src/lib/captures",
        "src/lib/grade",
        "src/lib/gradebook",
        "src/lib/students",
        "src/lib/parents",
        "src/lib/supabase",
        "src/lib/school/roles",
        "src/lib/school/resetpassword",
        "src/lib/school/audit",
        "src/lib/messages/permission",
        "src/lib/ai/policy",
        "src/lib/media/upload",
        "src/lib/media/paths",
        "supabase/functions",
        "supabase/migrations",
        "storage",
        "rls",
        "student_id",
    ];
    hay_has_any(path, needles)
}

fn collect_paths(impl_out, qa_out) {
    let paths = [];
    if is_map(impl_out) {
        for p in string_list(impl_out.changed_paths) { paths.push(p); }
    }
    if is_map(qa_out) {
        for p in string_list(qa_out.changed_paths) { paths.push(p); }
    }
    paths
}

fn needs_security_review(request, impl_out, qa_out) {
    if is_map(qa_out) && qa_out.touched_security_boundary == true { return true; }
    if request_looks_sensitive(request) { return true; }
    let paths = collect_paths(impl_out, qa_out);
    for p in paths {
        if path_looks_sensitive(p) { return true; }
    }
    false
}

fn read_request(raw) {
    if raw == () { return (); }
    let kind = type_of(raw);
    if kind == "string" {
        let s = trimmed(raw);
        if s == "" { return (); }
        return s;
    }
    if kind != "map" { return (); }
    let cand = ();
    if raw.request != () {
        cand = raw.request;
    } else if raw.task != () {
        cand = raw.task;
    } else if raw.prompt != () {
        cand = raw.prompt;
    } else if raw.objective != () {
        cand = raw.objective;
    }
    let s = trimmed(cand);
    if s == "" { return (); }
    s
}

fn kelyra_invariants_text() {
    let t = "";
    t += "Kelyra invariants: never invent students; the matcher never inserts a student; ";
    t += "nothing is a grade until the teacher Approves; do not leak student data; ";
    t += "enforce authorization server-side; do not bypass RLS; keep model keys server-side; ";
    t += "never put secrets in EXPO_PUBLIC_*; follow the icon pipeline; ";
    t += "phone captures, web reviews/assigns/grades; do not expand past docs/mvp.md.\n";
    t
}

fn impl_initial_prompt(request_json) {
    let p = "";
    p += "You are the Kelyra implementation agent (persona kelyra-implementer).\n";
    p += "Do not spawn subagents. Do not call spawn_subagent. Implement this request yourself.\n";
    p += "You have write access to the CURRENT working tree. isolation is off.\n";
    p += "Preserve existing uncommitted work. Do not git reset, git checkout, git restore, ";
    p += "git clean, git stash, or otherwise discard unrelated changes.\n";
    p += "Edit only files required for THIS request. Smallest correct change. No extra features.\n";
    p += "Before editing: read Agents.md, inspect surrounding code and tests, ";
    p += "and read docs/mvp.md if the request could change product scope.\n";
    p += kelyra_invariants_text();
    p += "Use read_file, grep, and search_replace/write on the actual tree. Do not answer from memory.\n";
    p += "Add or update tests when appropriate. Never weaken or delete a test to make it pass.\n";
    p += "When done, set summary to what you changed and changed_paths to repo-relative paths you edited.\n";
    p += "REQUEST (JSON):\n";
    p += request_json;
    p += "\n";
    p
}

fn impl_fix_prompt(kind, request_json, findings_json) {
    let p = "";
    p += "Resume Kelyra implementation. Do not spawn subagents.\n";
    p += "Preserve unrelated working-tree changes. No git reset/checkout/restore/clean/stash.\n";
    p += "Fix only the blocking P0/P1 findings below. Smallest correct fix. Add a regression test when appropriate.\n";
    p += "Inspect the actual code for each finding. Do not patch a symptom if the root cause is nearby.\n";
    p += kelyra_invariants_text();
    p += "KIND: ";
    p += kind;
    p += "\nORIGINAL REQUEST (JSON):\n";
    p += request_json;
    p += "\nBLOCKING FINDINGS (JSON):\n";
    p += findings_json;
    p += "\nUpdate summary and changed_paths for files you edited in this repair.\n";
    p
}

fn qa_prompt(request_json, impl_json) {
    let p = "";
    p += "You are the Kelyra QA reviewer (persona kelyra-qa). You are READ-ONLY.\n";
    p += "Do not modify files. Do not spawn subagents. Do not call spawn_subagent.\n";
    p += "Independently inspect the actual working tree. Do not trust the implementer summary as evidence.\n";
    p += "You have no shell. Reconstruct the change by reading files with read_file and grep.\n";
    p += "Read Agents.md and docs/mvp.md when scope or invariants apply.\n";
    p += "Review correctness, regressions, edge cases, data integrity, auth, RLS, student PII, ";
    p += "grade-approval behavior, UI, web vs phone, tests, and unintended MVP expansion.\n";
    p += kelyra_invariants_text();
    p += "ONLY P0 and P1 are blocking. P0 = catastrophic/security/data-loss/integrity. ";
    p += "P1 = serious correctness/auth/security/regression that must be fixed before acceptance. ";
    p += "P2/P3 go in nonblocking. Do not put P2/P3 in blocking.\n";
    p += "Each blocking finding needs severity, title, failure_path, evidence, required_fix.\n";
    p += "Each nonblocking finding needs severity, title, evidence, recommendation.\n";
    p += "A blocking finding must have a concrete failure path. No hypotheticals.\n";
    p += "Set ok=true only when there are no P0/P1 problems.\n";
    p += "Set touched_security_boundary=true if THIS change touches authentication, authorization, ";
    p += "RLS, Supabase policies, Edge Functions, storage, student PII, student_id, captures, ";
    p += "grades, approval logic, API keys, or other security boundaries. Otherwise false.\n";
    p += "Ignore pre-existing working-tree changes that are unrelated to this request.\n";
    p += "ORIGINAL REQUEST (JSON):\n";
    p += request_json;
    p += "\nIMPLEMENTATION AGENT RESULT (JSON; untrusted):\n";
    p += impl_json;
    p += "\n";
    p
}

fn security_prompt(request_json, impl_json, prior_json) {
    let p = "";
    p += "You are the Kelyra security QA agent. Use kelyra-qa invariants. You are READ-ONLY.\n";
    p += "Do not modify files. Do not spawn subagents.\n";
    p += "Inspect the actual working tree with read_file and grep. Do not trust the implementer summary.\n";
    p += "Audit only THIS request's changes. Ignore unrelated pre-existing dirty-tree work.\n";
    p += "Focus: authentication, authorization, RLS, Supabase policies, Edge Functions, storage, ";
    p += "student PII, student_id, captures, grades, teacher Approve-before-grade, API keys, ";
    p += "EXPO_PUBLIC secrets, and related security boundaries.\n";
    p += "Trace real data flow. Flag only exploitable issues with evidence.\n";
    p += "ONLY P0 and P1 are blocking. Same finding schema as general QA.\n";
    p += "Set ok=true only when there are no P0/P1 security issues.\n";
    p += "Set touched_security_boundary=true if you confirmed a sensitive boundary was in scope.\n";
    p += kelyra_invariants_text();
    p += "ORIGINAL REQUEST (JSON):\n";
    p += request_json;
    p += "\nIMPLEMENTATION RESULT (JSON; untrusted):\n";
    p += impl_json;
    p += "\nPRIOR SECURITY FINDINGS (JSON; may be empty):\n";
    p += prior_json;
    p += "\n";
    p
}

fn verify_prompt(request_json, impl_json) {
    let p = "";
    p += "Run deterministic verification for this Kelyra change. Do not edit files.\n";
    p += "Do not spawn subagents. Do not git reset/checkout/restore/clean/stash.\n";
    p += "Do not start Expo, the AI dev server, or any long-lived process.\n";
    p += "Read package.json. Run only inexpensive existing commands that apply:\n";
    p += "1. If a lint script exists and is cheap, run it. This repo often has no lint script — skip if absent.\n";
    p += "2. If npm run typecheck exists, run it (tsc --noEmit). That is applicable and cheap enough.\n";
    p += "3. Run unit tests with node --test (and --experimental-strip-types if needed) for src/**/*.test.ts ";
    p += "or tests next to changed_paths. Skip a command that would take many minutes or needs a network/app.\n";
    p += "Do not npm install. Do not hit production. Quote command output in ran[].output (trim to essentials).\n";
    p += "Set ok=true only if every command you ran passed. Put failures in blocking as P1 with evidence.\n";
    p += "List skipped commands in skipped with a one-line reason.\n";
    p += "ORIGINAL REQUEST (JSON):\n";
    p += request_json;
    p += "\nIMPLEMENTATION RESULT (JSON):\n";
    p += impl_json;
    p += "\n";
    p
}

fn unknown_subagent_type(result) {
    if result == () { return false; }
    let blob = "";
    if type_of(result.output) == "string" {
        blob = as_lower(result.output);
    } else {
        blob = as_lower(encode(result.output));
    }
    blob.contains("unknown subagent type")
}

fn impl_opts(label, resume_id, schema, type_name) {
    let opts = #{
        label: label,
        agent_type: type_name,
        model: "grok-4.5",
        capability_mode: "all",
        isolation_worktree: false,
        output_schema: schema,
    };
    if resume_id != () {
        opts.resume_from = resume_id;
    }
    opts
}

fn qa_opts(label, schema, type_name) {
    #{
        label: label,
        agent_type: type_name,
        model: "grok-4.5",
        capability_mode: "read-only",
        output_schema: schema,
    }
}

fn verify_opts(schema) {
    #{
        label: "[verify] typecheck and tests",
        agent_type: "general-purpose",
        model: "grok-4.5",
        capability_mode: "execute",
        output_schema: schema,
    }
}

fn latest_impl_id(result, previous) {
    if agent_ok(result) && result.agent_id != () { result.agent_id } else { previous }
}

fn impl_output_of(result) {
    if result != () { result.output } else { () }
}

fn findings_as_blocking(command_output) {
    let found = extract_blocking(command_output);
    if found.len() > 0 { return found; }
    if is_map(command_output) && command_output.ok == false {
        let item = #{
            severity: "P1",
            title: "Deterministic verification failed",
            failure_path: as_string(command_output.summary),
            evidence: encode(command_output),
            required_fix: "Make typecheck and applicable unit tests pass without discarding unrelated work.",
        };
        found.push(item);
    }
    found
}

fn render_findings(title, items) {
    let t = "## ";
    t += title;
    t += "\n\n";
    if !is_array(items) || items.len() == 0 {
        t += "_None._\n\n";
        return t;
    }
    let i = 1;
    for item in items {
        t += i.to_string();
        t += ". ";
        if is_map(item) {
            t += as_string(item.severity);
            t += " — ";
            t += as_string(item.title);
            t += "\n";
            if item.failure_path != () {
                t += "   - failure_path: ";
                t += as_string(item.failure_path);
                t += "\n";
            }
            if item.evidence != () {
                t += "   - evidence: ";
                t += as_string(item.evidence);
                t += "\n";
            }
            if item.required_fix != () {
                t += "   - required_fix: ";
                t += as_string(item.required_fix);
                t += "\n";
            }
            if item.recommendation != () {
                t += "   - recommendation: ";
                t += as_string(item.recommendation);
                t += "\n";
            }
        }
        t += "\n";
        i += 1;
    }
    t
}

fn finish(outcome, summary, request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out) {
    let report = "";
    report += "# kelyra-qa-loop\n\n";
    report += "- outcome: ";
    report += outcome;
    report += "\n- summary: ";
    report += summary;
    report += "\n- qa_repair_cycles: ";
    report += qa_repairs.to_string();
    report += " / 3\n- verify_repair_cycles: ";
    report += verify_repairs.to_string();
    report += " / 3\n- security_repair_cycles: ";
    report += security_repairs.to_string();
    report += " / 3\n- security_ran: ";
    if security_ran { report += "true"; } else { report += "false"; }
    report += "\n- security_ok: ";
    if security_ok { report += "true"; } else { report += "false"; }
    report += "\n\n## Request\n\n";
    report += request;
    report += "\n\n## Implementation summary\n\n";
    if is_map(impl_out) {
        report += as_string(impl_out.summary);
        report += "\n";
    } else {
        report += encode(impl_out);
        report += "\n";
    }
    report += "\n";
    report += render_findings("Blocking (P0/P1)", blocking);
    report += render_findings("Nonblocking (P2/P3)", nonblocking);
    if outcome == "escalated" {
        report += "Remaining P0/P1 findings are escalated to the parent session. This workflow will not start another repair cycle.\n";
    }
    let path = write_scratch_file("report.md", report);
    log(summary);
    complete(#{
        path: path,
        report: report,
        outcome: outcome,
        summary: summary,
        qa_repair_cycles: qa_repairs,
        verify_repair_cycles: verify_repairs,
        security_repair_cycles: security_repairs,
        security_ran: security_ran,
        security_ok: security_ok,
        blocking: blocking,
        nonblocking: nonblocking,
        implementation: impl_out,
    });
}

let request = read_request(args);
if request == () {
    pause("verification", "Pass args.request (or args.task / a string arg) with the implementation request.");
}

let request_json = encode(request);
let impl_id = ();
let impl_out = ();
let qa_out = ();
let blocking = [];
let nonblocking = [];
let qa_repairs = 0;
let verify_repairs = 0;
let security_repairs = 0;
let security_ran = false;
let security_ok = true;
let last_security_blocking = [];
let impl_type = "kelyra-implementer";
let qa_type = "kelyra-qa";

phase("Implement");
log("Implementing in the current working tree (kelyra-implementer, grok-4.5)");
let impl_res = agent(impl_initial_prompt(request_json), impl_opts("[kelyra-implementer] implement", (), impl_schema, impl_type));
if !agent_ok(impl_res) && unknown_subagent_type(impl_res) {
    log("kelyra-implementer is not a registered agent type; falling back to general-purpose with the same persona prompt");
    impl_type = "general-purpose";
    impl_res = agent(impl_initial_prompt(request_json), impl_opts("[kelyra-implementer] implement", (), impl_schema, impl_type));
}
impl_id = latest_impl_id(impl_res, impl_id);
impl_out = impl_output_of(impl_res);
if !agent_ok(impl_res) {
    finish("escalated", "Implementation agent failed.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
}

let step = "qa";
let looping = true;
while looping {
    if step == "qa" {
        phase("QA");
        log("Read-only QA (kelyra-qa, grok-4.5)");
        let qa_res = agent(qa_prompt(request_json, encode(impl_out)), qa_opts("[kelyra-qa] review", qa_schema, qa_type));
        if !agent_ok(qa_res) && unknown_subagent_type(qa_res) {
            log("kelyra-qa is not a registered agent type; falling back to general-purpose with the same persona prompt");
            qa_type = "general-purpose";
            qa_res = agent(qa_prompt(request_json, encode(impl_out)), qa_opts("[kelyra-qa] review", qa_schema, qa_type));
        } else if !agent_ok(qa_res) {
            log("QA agent failed; retrying once");
            qa_res = agent(qa_prompt(request_json, encode(impl_out)), qa_opts("[kelyra-qa] review retry", qa_schema, qa_type));
        }
        if !agent_ok(qa_res) {
            finish("escalated", "QA agent failed twice; escalating to the parent session.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
        }
        qa_out = qa_res.output;
        blocking = extract_blocking(qa_out);
        nonblocking = extract_nonblocking(qa_out);
        let nblock = blocking.len();
        log(nblock.to_string() + " blocking P0/P1 finding(s); ok=" + encode(is_map(qa_out) && qa_out.ok == true));
        if nblock == 0 {
            step = "verify";
        } else if qa_repairs >= MAX_QA_REPAIR {
            finish("escalated", "QA still reports P0/P1 after three repair cycles.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
        } else if impl_id == () {
            finish("escalated", "Cannot resume implementer: missing agent_id.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
        } else {
            qa_repairs += 1;
            phase("Repair");
            log("Resuming original implementer for QA findings (repair " + qa_repairs.to_string() + "/3)");
            impl_res = agent(impl_fix_prompt("qa", request_json, encode(blocking)), impl_opts("[kelyra-implementer] fix QA findings", impl_id, impl_schema, impl_type));
            impl_id = latest_impl_id(impl_res, impl_id);
            impl_out = impl_output_of(impl_res);
            if !agent_ok(impl_res) {
                finish("escalated", "Resumed implementer failed while fixing QA findings.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
            }
        }
    } else if step == "verify" {
        phase("Verify");
        log("Deterministic typecheck/tests when inexpensive and applicable");
        let ver_res = agent(verify_prompt(request_json, encode(impl_out)), verify_opts(verify_schema));
        if !agent_ok(ver_res) {
            log("Verify agent failed; retrying once");
            ver_res = agent(verify_prompt(request_json, encode(impl_out)), verify_opts(verify_schema));
        }
        if !agent_ok(ver_res) {
            finish("escalated", "Verify agent failed twice; escalating to the parent session.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
        }
        let verify_out = ver_res.output;
        let verify_blocking = findings_as_blocking(verify_out);
        if verify_blocking.len() == 0 && !(is_map(verify_out) && verify_out.ok == false) {
            step = "security";
        } else if verify_repairs >= MAX_VERIFY_REPAIR {
            blocking = verify_blocking;
            finish("escalated", "Typecheck/tests still failing after three repair cycles.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
        } else if impl_id == () {
            finish("escalated", "Cannot resume implementer: missing agent_id.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
        } else {
            verify_repairs += 1;
            phase("Repair");
            log("Resuming original implementer for verify failures (repair " + verify_repairs.to_string() + "/3)");
            impl_res = agent(impl_fix_prompt("verify", request_json, encode(verify_blocking)), impl_opts("[kelyra-implementer] fix verify failures", impl_id, impl_schema, impl_type));
            impl_id = latest_impl_id(impl_res, impl_id);
            impl_out = impl_output_of(impl_res);
            if !agent_ok(impl_res) {
                finish("escalated", "Resumed implementer failed while fixing verify failures.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
            }
            step = "qa";
        }
    } else if step == "security" {
        let sensitive = needs_security_review(request, impl_out, qa_out);
        if !sensitive {
            log("Skipping security review; this change did not touch a listed security boundary");
            looping = false;
        } else {
            security_ran = true;
            phase("Security");
            log("Read-only security QA (kelyra-qa, grok-4.5)");
            let sec_res = agent(security_prompt(request_json, encode(impl_out), encode(last_security_blocking)), qa_opts("[kelyra-qa] security review", qa_schema, qa_type));
            if !agent_ok(sec_res) {
                log("Security QA failed; retrying once");
                sec_res = agent(security_prompt(request_json, encode(impl_out), encode(last_security_blocking)), qa_opts("[kelyra-qa] security review retry", qa_schema, qa_type));
            }
            if !agent_ok(sec_res) {
                finish("escalated", "Security QA agent failed twice; escalating to the parent session.", request, qa_repairs, verify_repairs, security_repairs, security_ran, false, blocking, nonblocking, impl_out);
            }
            let sec_out = sec_res.output;
            last_security_blocking = extract_blocking(sec_out);
            if is_map(sec_out) {
                let extra = extract_nonblocking(sec_out);
                for item in extra { nonblocking.push(item); }
            }
            if last_security_blocking.len() == 0 {
                security_ok = true;
                looping = false;
            } else if security_repairs >= MAX_SECURITY_REPAIR {
                security_ok = false;
                blocking = last_security_blocking;
                finish("escalated", "Security QA still reports P0/P1 after three repair cycles.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
            } else if impl_id == () {
                finish("escalated", "Cannot resume implementer: missing agent_id.", request, qa_repairs, verify_repairs, security_repairs, security_ran, false, last_security_blocking, nonblocking, impl_out);
            } else {
                security_ok = false;
                security_repairs += 1;
                phase("Repair");
                log("Resuming original implementer for security findings (repair " + security_repairs.to_string() + "/3)");
                impl_res = agent(impl_fix_prompt("security", request_json, encode(last_security_blocking)), impl_opts("[kelyra-implementer] fix security findings", impl_id, impl_schema, impl_type));
                impl_id = latest_impl_id(impl_res, impl_id);
                impl_out = impl_output_of(impl_res);
                if !agent_ok(impl_res) {
                    finish("escalated", "Resumed implementer failed while fixing security findings.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, last_security_blocking, nonblocking, impl_out);
                }
                step = "qa";
            }
        }
    } else {
        looping = false;
    }
}

finish("passed", "QA passed with no P0/P1 findings.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out);
