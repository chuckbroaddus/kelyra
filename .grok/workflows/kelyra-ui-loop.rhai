let meta = #{
    name: "kelyra-ui-loop",
    description: "Implement a screen change, run the test commands, then require a driven UI evidence packet before pass",
    when_to_use: "Use for a stamped Kelyra screen whose Surface line is phone, web, or both, with at least one AC- acceptance id. Web and both require a scripted browser session under 720px and at 900px or wider. Phone and both require an iOS Simulator pass from scripts/ui-drive.mjs, not a USB phone and not a desktop resize. A missing packet does not pass. data, edge, and worker use kelyra-qa-loop.",
    phases: [
        #{ title: "Implement", detail: "kelyra-implementer writes the change in the current working tree" },
        #{ title: "Verify", detail: "run typecheck, unit tests, and the import check; a model judges a failure only when it may belong to another dirty file" },
        #{ title: "Repair", detail: "one resume of the original implementer, then stop" },
        #{ title: "Security", detail: "read-only security review only when a changed path is auth, RLS, grades, or student data" },
        #{ title: "UI proof", detail: "scripts/ui-drive.mjs drives the screen, then the grader reads each screenshot once" },
    ],
};

const MAX_QA_REPAIR = 1;
const MAX_VERIFY_REPAIR = 1;
const MAX_SECURITY_REPAIR = 1;
const MAX_UI_REPAIR = 1;

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
        "evidence_ok": #{ "type": "boolean" },
        "unverified": #{ "type": "boolean" },
    },
};

// BOT_PROOF_START
let ui_proof_schema = #{
    "type": "object",
    "required": ["drive_ran", "acceptance"],
    "properties": #{
        "drive_ran": #{ "type": "boolean" },
        "reason": #{ "type": "string" },
        "drive_status": #{ "type": "string" },
        "url": #{ "type": "string" },
        "visible_text": #{ "type": "string" },
        "screenshot": #{ "type": "string" },
        "failed_request": #{ "type": "string" },
        "widths": #{
            "type": "array",
            "maxItems": 4,
            "items": #{
                "type": "object",
                "required": ["width", "screenshot"],
                "properties": #{
                    "width": #{ "type": "integer" },
                    "screenshot": #{ "type": "string" },
                    "url": #{ "type": "string" },
                },
            },
        },
        "interaction": #{
            "type": "object",
            "properties": #{
                "did": #{ "type": "boolean" },
                "from_state": #{ "type": "string" },
                "to_state": #{ "type": "string" },
            },
        },
        "phone": #{
            "type": "object",
            "properties": #{
                "ran": #{ "type": "boolean" },
                "screenshot": #{ "type": "string" },
                "evidence": #{ "type": "string" },
            },
        },
        "motion": #{
            "type": "object",
            "properties": #{
                "required": #{ "type": "boolean" },
                "video": #{ "type": "string" },
                "note": #{ "type": "string" },
            },
        },
        "mockup_compared": #{ "type": "boolean" },
        "acceptance": #{
            "type": "array",
            "maxItems": 24,
            "items": #{
                "type": "object",
                "required": ["id", "passed", "evidence"],
                "properties": #{
                    "id": #{ "type": "string" },
                    "passed": #{ "type": "boolean" },
                    "evidence": #{ "type": "string" },
                },
            },
        },
    },
};
// BOT_PROOF_END

let command_schema = #{
    "type": "object",
    "required": ["summary", "ran"],
    "properties": #{
        "summary": #{ "type": "string" },
        "ran": #{
            "type": "array",
            "maxItems": 6,
            "items": #{
                "type": "object",
                "required": ["command", "exit_code"],
                "properties": #{
                    "command": #{ "type": "string" },
                    "exit_code": #{ "type": "integer" },
                    "output": #{ "type": "string" },
                },
            },
        },
    },
};
let classify_schema = #{
    "type": "object",
    "required": ["in_scope", "summary"],
    "properties": #{
        "in_scope": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
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

fn path_looks_sensitive(path) {
    let needles = [
        "src/lib/auth",
        "src/lib/grade",
        "src/lib/students",
        "src/lib/parents",
        "src/lib/school/roles",
        "src/lib/school/resetpassword",
        "student_id",
        "/rls",
        "_rls",
        "rls.sql",
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

fn merge_path_list(into, impl_out) {
    let out = [];
    if is_array(into) {
        for p in into { out.push(p); }
    }
    if is_map(impl_out) {
        for p in string_list(impl_out.changed_paths) {
            let seen = false;
            for e in out {
                if e == p { seen = true; }
            }
            if !seen && p != "" { out.push(p); }
        }
    }
    out
}

fn path_needs_import_check(path) {
    let p = as_lower(path);
    if !p.contains("src/") { return false; }
    if p.contains(".test.") || p.contains(".spec.") || p.contains(".d.ts") { return false; }
    p.contains(".ts") || p.contains(".tsx")
}

fn changed_needs_import_check(paths) {
    if !is_array(paths) { return false; }
    for path in paths {
        if path_needs_import_check(path) { return true; }
    }
    false
}

fn needs_security_review(request, impl_out, qa_out) {
    let paths = collect_paths(impl_out, ());
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

fn padded_has_line(text, label) {
    let padded = "\n";
    padded += text;
    padded += "\n";
    let needle = "\n";
    needle += label;
    needle += "\n";
    padded.contains(needle)
}

fn surfaces_in_request(request) {
    let text = as_lower(request);
    let names = ["phone", "web", "both", "data", "edge", "worker", "author", "lesson"];
    let found = [];
    for name in names {
        let line = "surface: ";
        line += name;
        let alt = "surface_tag: ";
        alt += name;
        if padded_has_line(text, line) || padded_has_line(text, alt) {
            found.push(name);
        }
    }
    found
}

fn surface_allowed(name) {
    name == "phone" || name == "web" || name == "both" || name == "data" || name == "edge" || name == "worker" || name == "author" || name == "lesson"
}

fn resolve_surface(raw, request) {
    let from_args = "";
    if is_map(raw) && raw.surface != () {
        from_args = as_lower(trimmed(raw.surface));
    }
    let found = surfaces_in_request(request);
    if from_args != "" && !surface_allowed(from_args) {
        return "invalid";
    }
    if from_args != "" {
        for name in found {
            if name != from_args {
                return "conflict";
            }
        }
        return from_args;
    }
    if found.len() > 1 {
        return "conflict";
    }
    if found.len() == 1 {
        for name in found {
            return name;
        }
    }
    ""
}

fn is_id_char(ch) {
    "abcdefghijklmnopqrstuvwxyz0123456789-".contains(ch)
}

fn is_number(value) {
    let kind = type_of(value);
    kind == "i64" || kind == "i32" || kind == "f64" || kind == "f32" || kind == "int" || kind == "float"
}

fn push_unique(into, id) {
    for existing in into {
        if existing == id { return into; }
    }
    into.push(id);
    into
}

fn pull_acceptance_ids(request) {
    let text = as_lower(request);
    let found = [];
    let n = text.len();
    let i = 0;
    while i + 3 < n {
        if text.sub_string(i, 3) == "ac-" {
            let id = "ac-";
            let j = i + 3;
            while j < n {
                let ch = text.sub_string(j, 1);
                if is_id_char(ch) {
                    id += ch;
                    j += 1;
                } else {
                    break;
                }
            }
            if id.len() > 3 {
                found = push_unique(found, id);
            }
            i = j;
        } else {
            i += 1;
        }
    }
    found
}

fn widths_ok(widths) {
    if !is_array(widths) { return false; }
    let narrow = false;
    let wide = false;
    for item in widths {
        if is_map(item) && is_number(item.width) && trimmed(item.screenshot) != "" {
            if item.width < 720 { narrow = true; }
            if item.width >= 900 { wide = true; }
        }
    }
    narrow && wide
}

fn interaction_ok(value) {
    if !is_map(value) || value.did != true { return false; }
    trimmed(value.from_state) != "" && trimmed(value.to_state) != ""
}

fn phone_ok(value) {
    if !is_map(value) || value.ran != true { return false; }
    trimmed(value.evidence) != "" && trimmed(value.screenshot) != ""
}

fn line_value(request, label) {
    let raw = request;
    let lower = as_lower(request);
    let n = raw.len();
    let width = label.len();
    let i = 0;
    while i < n {
        let at_line = i == 0;
        if !at_line {
            at_line = lower.sub_string(i - 1, 1) == "\n";
        }
        if at_line && i + width <= n && lower.sub_string(i, width) == label {
            let j = i + width;
            let value = "";
            while j < n {
                let ch = raw.sub_string(j, 1);
                if ch == "\n" { break; }
                value += ch;
                j += 1;
            }
            return trimmed(value);
        }
        i += 1;
    }
    ""
}

fn motion_of(request) {
    let text = as_lower(request);
    let n = text.len();
    let i = 0;
    while i < n {
        let at_line = i == 0;
        if !at_line {
            at_line = text.sub_string(i - 1, 1) == "\n";
        }
        if at_line && i + 7 <= n && text.sub_string(i, 7) == "motion:" {
            let j = i + 7;
            let value = "";
            while j < n {
                let ch = text.sub_string(j, 1);
                if ch == "\n" { break; }
                value += ch;
                j += 1;
            }
            return trimmed(value);
        }
        i += 1;
    }
    ""
}

fn motion_required_text(request) {
    let value = motion_of(request);
    if value == "" || value == "none" { return ""; }
    value
}

fn motion_ok(motion) {
    if !is_map(motion) || motion.required != true { return false; }
    trimmed(motion.video) != "" && trimmed(motion.note) != ""
}

fn packet_ok(surface, proof, motion_text, mockup_path) {
    if !is_map(proof) || proof.drive_ran != true { return false; }
    if surface == "web" || surface == "both" {
        if !widths_ok(proof.widths) || !interaction_ok(proof.interaction) { return false; }
    }
    if surface == "phone" || surface == "both" {
        if !phone_ok(proof.phone) || !interaction_ok(proof.interaction) { return false; }
    }
    if motion_text != "" && !motion_ok(proof.motion) { return false; }
    if mockup_path != "" && proof.mockup_compared != true { return false; }
    true
}

fn acceptance_hit(items, id) {
    if !is_array(items) { return false; }
    for item in items {
        if is_map(item) && as_lower(trimmed(item.id)) == id && item.passed == true && trimmed(item.evidence) != "" {
            return true;
        }
    }
    false
}

fn acceptance_covers(required, items) {
    if !is_array(required) || required.len() == 0 { return false; }
    for id in required {
        if !acceptance_hit(items, id) { return false; }
    }
    true
}

fn proof_text(proof, key) {
    if !is_map(proof) { return ""; }
    trimmed(proof[key])
}

fn item_for_id(items, id) {
    if !is_array(items) { return (); }
    for item in items {
        if is_map(item) && as_lower(trimmed(item.id)) == id {
            return item;
        }
    }
    ()
}

fn failed_acceptance(proof, required) {
    let found = [];
    let items = [];
    if is_map(proof) && is_array(proof.acceptance) { items = proof.acceptance; }
    let drive_status = proof_text(proof, "drive_status");
    if drive_status == "" { drive_status = proof_text(proof, "reason"); }
    if is_array(required) {
        for id in required {
            if !acceptance_hit(items, id) {
                let evidence = "";
                let row = item_for_id(items, id);
                if is_map(row) { evidence = trimmed(row.evidence); }
                if evidence == "" { evidence = "Acceptance id was not driven to a pass."; }
                found.push(#{
                    severity: "P1",
                    title: id,
                    failure_path: "ui proof",
                    evidence: evidence,
                    url: proof_text(proof, "url"),
                    visible_text: proof_text(proof, "visible_text"),
                    screenshot: proof_text(proof, "screenshot"),
                    failed_request: proof_text(proof, "failed_request"),
                    drive_status: drive_status,
                    required_fix: "Make this acceptance id true on the driven screen. Do not edit scripts/ui-drive.mjs. Do not restore a source literal to satisfy a regex test.",
                });
            }
        }
    }
    found
}

fn acceptance_named(proof, required) {
    if !is_map(proof) { return false; }
    if proof_text(proof, "url") == "" || proof_text(proof, "visible_text") == "" || proof_text(proof, "screenshot") == "" {
        return false;
    }
    let items = [];
    if is_array(proof.acceptance) { items = proof.acceptance; }
    if !is_array(required) { return false; }
    for id in required {
        if acceptance_hit(items, id) { continue; }
        let row = item_for_id(items, id);
        let evidence = "";
        if is_map(row) { evidence = trimmed(row.evidence); }
        if evidence == "" || evidence == "Acceptance id was not driven to a pass." {
            return false;
        }
    }
    true
}

fn failure_blob(proof, required) {
    let blob = "";
    blob += as_lower(proof_text(proof, "reason"));
    blob += " ";
    blob += as_lower(proof_text(proof, "drive_status"));
    blob += " ";
    blob += as_lower(proof_text(proof, "visible_text"));
    blob += " ";
    blob += as_lower(proof_text(proof, "failed_request"));
    let items = [];
    if is_map(proof) && is_array(proof.acceptance) { items = proof.acceptance; }
    if is_array(required) {
        for id in required {
            if !acceptance_hit(items, id) {
                let row = item_for_id(items, id);
                if is_map(row) {
                    blob += " ";
                    blob += as_lower(trimmed(row.evidence));
                }
            }
        }
    }
    blob
}

fn harness_code(blob) {
    let codes = ["route_not_settled", "persona_inject_failed", "persona_not_ready", "persona_missing", "web_not_ready", "chrome_not_ready", "simulator_not_ready", "screenshot_failed", "interaction_missing", "bundle_overlay", "phone_safari", "phone_signin", "phone_tap_unchanged", "phone_tap_tool_missing", "phone_sign_in_failed", "cdp_failed", "drive_failed", "motion_not_written", "camera_script_missing", "class_stack_script_missing", "unable to resolve module"];
    for code in codes {
        if blob.contains(code) { return code; }
    }
    if blob.contains("safari") { return "phone_safari"; }
    ""
}

fn data_code(blob) {
    if blob.contains("permission denied") || blob.contains("row-level") || blob.contains("pgrst") {
        return "sql";
    }
    let http = blob.contains("400") || blob.contains("401") || blob.contains("403") || blob.contains("404") || blob.contains("500");
    if http && (blob.contains("submit") || blob.contains("http") || blob.contains("status") || blob.contains("rpc") || blob.contains("sql") || blob.contains("function")) {
        return "api";
    }
    ""
}

fn ui_failure_class(surface, proof, required) {
    let blob = failure_blob(proof, required);
    if harness_code(blob) != "" { return "harness"; }
    if data_code(blob) != "" { return "data"; }
    if !is_map(proof) || proof.drive_ran != true { return "unnamed"; }
    if (surface == "phone" || surface == "both") && (!is_map(proof.phone) || proof.phone.ran != true) {
        return "harness";
    }
    if !acceptance_named(proof, required) { return "unnamed"; }
    "product"
}

fn class_summary(klass, detail) {
    let text = "failure_class: ";
    text += klass;
    text += ". ";
    text += detail;
    text
}

fn persona_of(request) {
    let text = as_lower(request);
    let names = ["office", "teacher", "parent", "student"];
    let found = [];
    for name in names {
        let line = "persona: ";
        line += name;
        if padded_has_line(text, line) { found.push(name); }
    }
    if found.len() > 1 { return "conflict"; }
    if found.len() == 1 {
        for name in found { return name; }
    }
    ""
}

fn seat_of(request) {
    let text = as_lower(request);
    let names = ["office", "teacher", "parent"];
    let found = [];
    for name in names {
        let line = "seat: ";
        line += name;
        if padded_has_line(text, line) { found.push(name); }
    }
    if found.len() > 1 { return "conflict"; }
    if found.len() == 1 {
        for name in found { return name; }
    }
    ""
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
    p += "Never call ask_user_question. Never probe whether a tool exists. Do not send dummy Continue / placeholder questions. If you cannot inspect something, record that as evidence and still return the JSON report. Do not wait for a human.\n";
    p += "You have write access to the CURRENT working tree. isolation is off.\n";
    p += "Preserve existing uncommitted work. Do not git reset, git checkout, git restore, ";
    p += "git clean, git stash, or otherwise discard unrelated changes.\n";
    p += "Edit only files required for THIS request. Smallest correct change. No extra features.\n";
    p += "Before editing: read Agents.md, inspect surrounding code and tests, ";
    p += "and read docs/mvp.md if the request could change product scope.\n";
    p += kelyra_invariants_text();
    p += "Use read_file, grep, and search_replace/write on the actual tree. Do not answer from memory.\n";
    p += "Add or update tests when appropriate. Never weaken or delete a test to make it pass.\n";
    p += "When wiring an existing RPC, table, or unique constraint: read the SQL function body and ";
    p += "constraints before writing the client. If the request forbids applying SQL, the client must ";
    p += "work against the live applied function, not a hoped-for on-disk rewrite. You may edit on-disk ";
    p += "SQL only when the request allows, and the client must still be compatible with live.\n";
    p += "For persist/confirm/versioned writes: never insert a colliding unique key before the versioned ";
    p += "RPC; never roll back after the RPC committed; serialize overlapping saves per entity; ";
    p += "Confirm/submit must not proceed if persist failed. Add a test that encodes that contract.\n";
    p += "Do not edit unrelated dirty-tree files to make repo-wide typecheck pass.\n";
    p += "When done, set summary to what you changed and changed_paths to repo-relative paths you edited.\n";
    p += "REQUEST (JSON):\n";
    p += request_json;
    p += "\n";
    p
}

fn impl_fix_prompt(kind, request_json, findings_json) {
    let p = "";
    p += "Resume Kelyra implementation. Do not spawn subagents.\n";
    p += "Never call ask_user_question. Never probe whether a tool exists. Do not send dummy Continue / placeholder questions. If you cannot inspect something, record that as evidence and still return the JSON report. Do not wait for a human.\n";
    p += "Preserve unrelated working-tree changes. No git reset/checkout/restore/clean/stash.\n";
    p += "Fix only the blocking P0/P1 findings below. Smallest correct fix. Add a regression test when appropriate.\n";
    p += "Inspect the actual code for each finding. Do not patch a symptom if the root cause is nearby.\n";
    p += "If a verify/typecheck finding is in a file this request did not change, do not edit that file. ";
    p += "Record it as unrelated/pre-existing and leave changed_paths empty for that repair.\n";
    p += "Do not edit scripts/ui-drive.mjs, scripts/ui-persona-session.mjs, or scripts/boot-ios-simulator.sh.\n";
    p += "A finding whose evidence is a source-text match is not fixed by restoring the matched literal. ";
    p += "Call the function and assert what it returns. Leave the source string alone.\n";
    p += "Do not report the repair done without a regression test that fails on the old behavior.\n";
    p += "When drive_status is interaction_missing, read the a11y-debugging skill and give the control an accessible name the driver can query.\n";
    p += "When the finding is a difference from the approved mock-up, read the frontend-ux-engineer skill and match the mock-up idea.\n";
    p += "When drive_status is persona_inject_failed, phone_safari, or the shot is a sign-in page, do not edit product code. ";
    p += "Read the cookie-debugging skill only to name the session failure, then stop with changed_paths empty.\n";
    p += "After a persist/RPC fix, re-read the whole save/confirm path for unique-key collisions, ";
    p += "rollback after a committed RPC, overlapping in-flight saves, and Confirm proceeding on a ";
    p += "failed persist. Add a regression test for the reported failure path.\n";
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

fn security_prompt(request_json, impl_json, prior_json) {
    let p = "";
    p += "You are the Kelyra security QA agent. Use kelyra-qa invariants. You are READ-ONLY.\n";
    p += "Do not modify files. Do not spawn subagents.\n";
    p += "Never call ask_user_question. Never probe whether a tool exists. Do not send dummy Continue / placeholder questions. If you cannot inspect something, record that as evidence and still return the JSON report. Do not wait for a human.\n";
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

fn verify_prompt(request_json, impl_json, changed_paths_json) {
    let p = "";
    p += "Run the verification commands and return their exit codes. Do not edit files. Do not decide whether a failure is in scope.\n";
    p += "Do not spawn subagents. Do not git reset, checkout, restore, clean, or stash.\n";
    p += "Never call ask_user_question. Never probe whether a tool exists. If a command cannot run, set its exit_code to 1 and put the reason in output.\n";
    p += "Do not start Expo, a dev server, or any long-lived process. Do not npm install. Do not hit production.\n";
    p += "From the repo root, run each command below and record the exit code:\n";
    p += "1. npm run typecheck\n";
    p += "2. node --test for the unit tests that cover CHANGED_PATHS. Use --experimental-strip-types when the test file needs it. ";
    p += "The command string you record must contain --test.\n";
    p += "3. When CHANGED_PATHS includes a src .ts or .tsx file that is not a test, run ";
    p += "node scripts/check-test-imports.mjs --changed with those paths. The command string must contain check-test-imports.mjs. ";
    p += "SQL, Edge functions, and workers do not need this third command.\n";
    p += "Put every command you ran in ran as command, exit_code, and output. exit_code is an integer. Trim output to the failing lines.\n";
    p += "Do not omit a command you were asked to run. A command you did not run is not a pass.\n";
    p += "CHANGED_PATHS (JSON):\n";
    p += changed_paths_json;
    p += "\nORIGINAL REQUEST (JSON):\n";
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
        capability_mode: "read-only",
        output_schema: schema,
    }
}

fn verify_opts(schema) {
    #{
        label: "[verify] typecheck and tests",
        agent_type: "general-purpose",
        capability_mode: "execute",
        output_schema: schema,
    }
}

fn ran_items(verify_out) {
    if !is_map(verify_out) { return []; }
    if !is_array(verify_out.ran) { return []; }
    verify_out.ran
}

fn find_command(verify_out, needle) {
    let want = as_lower(needle);
    for item in ran_items(verify_out) {
        if is_map(item) {
            let cmd = as_lower(item.command);
            if cmd.contains(want) { return item; }
        }
    }
    ()
}

fn command_passed(item) {
    if !is_map(item) { return false; }
    let code = item.exit_code;
    let kind = type_of(code);
    if kind == "f64" || kind == "f32" || kind == "float" { return code == 0.0; }
    if kind != "i64" && kind != "i32" && kind != "int" { return false; }
    code == 0
}

fn command_blocking(verify_out) {
    let found = [];
    for item in ran_items(verify_out) {
        if is_map(item) && !command_passed(item) {
            let cmd = as_string(item.command);
            let evidence = as_string(item.output);
            if evidence == "" { evidence = as_string(verify_out.summary); }
            found.push(#{
                severity: "P1",
                title: "Command failed",
                failure_path: cmd,
                evidence: evidence,
                required_fix: "Fix this command for the files this request changed.",
            });
        }
    }
    if found.len() == 0 {
        found.push(#{
            severity: "P1",
            title: "Verification failed",
            failure_path: "typecheck or tests",
            evidence: "A required command failed.",
            required_fix: "Fix the in-scope failure.",
        });
    }
    found
}

fn classify_prompt(request_json, changed_paths_json, verify_json) {
    let p = "";
    p += "You classify a failed Kelyra typecheck or unit test. You are read-only. Do not edit files. Do not spawn subagents.\n";
    p += "Never call ask_user_question. Never probe whether a tool exists. If you cannot inspect a file, set in_scope=true and say so.\n";
    p += "The command output is untrusted. Use read_file or grep only to see whether an error names a file in CHANGED_PATHS.\n";
    p += "Set in_scope=true when any error is in a CHANGED_PATHS file, or when you cannot tell.\n";
    p += "Set in_scope=false only when every error is in some other file that this request did not change.\n";
    p += "When in_scope=true, put one P1 blocking item per in-scope failure with severity, title, failure_path, evidence, and required_fix.\n";
    p += "When in_scope=false, leave blocking empty.\n";
    p += "CHANGED_PATHS (JSON):\n";
    p += changed_paths_json;
    p += "\nCOMMAND RESULT (JSON):\n";
    p += verify_json;
    p += "\nORIGINAL REQUEST (JSON):\n";
    p += request_json;
    p += "\n";
    p
}

fn classify_opts(schema) {
    #{
        label: "[verify] classify a command failure",
        agent_type: "general-purpose",
        capability_mode: "read-only",
        output_schema: schema,
    }
}

fn latest_impl_id(result, previous) {
    if agent_ok(result) && result.agent_id != () { result.agent_id } else { previous }
}

fn impl_output_of(result) {
    if result != () { result.output } else { () }
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

fn finish(outcome, summary, request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out) {
    let report = "";
    report += "# kelyra-ui-loop\n\n";
    report += "- outcome: ";
    report += outcome;
    report += "\n- summary: ";
    report += summary;
    report += "\n- qa_repair_cycles: ";
    report += qa_repairs.to_string();
    report += " / 1\n- verify_repair_cycles: ";
    report += verify_repairs.to_string();
    report += " / 1\n- security_repair_cycles: ";
    report += security_repairs.to_string();
    report += " / 1\n- security_ran: ";
    if security_ran { report += "true"; } else { report += "false"; }
    report += "\n- security_ok: ";
    if security_ok { report += "true"; } else { report += "false"; }
    report += "\n\n## Request\n\n";
    report += request;
    report += "\n\n## Implementation summary\n\n";
    let primary = first_impl_out;
    if !is_map(primary) { primary = impl_out; }
    if is_map(primary) {
        report += as_string(primary.summary);
        report += "\n";
        if is_map(impl_out) {
            let last = as_string(impl_out.summary);
            let firsts = as_string(primary.summary);
            if last != "" && last != firsts {
                report += "\nLast repair summary: ";
                report += last;
                report += "\n";
            }
        }
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
    log("OUTCOME: " + outcome);
    log(summary);
    let impl_for_result = impl_out;
    if is_map(first_impl_out) { impl_for_result = first_impl_out; }
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
        implementation: impl_for_result,
    });
}

// BOT_PROOF_START
fn join_ids(ids) {
    let text = "";
    if !is_array(ids) { return text; }
    for id in ids {
        if text != "" { text += ","; }
        text += id;
    }
    text
}

fn drive_mentions(request, needle) {
    as_lower(request).contains(needle)
}

fn safe_click(value) {
    if type_of(value) != "string" || value == "" { return false; }
    let n = value.len();
    let i = 0;
    while i < n {
        let ch = value.sub_string(i, 1);
        if ch == "'" || ch == "`" || ch == "$" || ch == ";" || ch == "&" || ch == "|" || ch == "\n" {
            return false;
        }
        i += 1;
    }
    true
}

fn safe_flag(value) {
    if type_of(value) != "string" || value == "" { return false; }
    let n = value.len();
    let i = 0;
    while i < n {
        let ch = value.sub_string(i, 1);
        if ch == " " || ch == "'" || ch == "\"" || ch == "`" || ch == "$" || ch == ";" || ch == "&" || ch == "|" || ch == "\n" {
            return false;
        }
        i += 1;
    }
    true
}

fn drive_route(request) {
    let drive = line_value(request, "drive:");
    if drive == "" { drive = line_value(request, "route:"); }
    if drive == "" || drive.sub_string(0, 1) != "/" { return ""; }
    let route = "";
    let n = drive.len();
    let i = 0;
    while i < n {
        let ch = drive.sub_string(i, 1);
        if ch == " " { break; }
        route += ch;
        i += 1;
    }
    if route == "" || !safe_flag(route) { return ""; }
    route
}

fn drive_click(request) {
    let drive = line_value(request, "drive:");
    let lower = as_lower(drive);
    let n = lower.len();
    let i = 0;
    while i + 6 <= n {
        if lower.sub_string(i, 6) == "click=" {
            let value = "";
            let j = i + 6;
            while j < drive.len() {
                value += drive.sub_string(j, 1);
                j += 1;
            }
            value = trimmed(value);
            if safe_click(value) { return value; }
            return "";
        }
        i += 1;
    }
    ""
}

fn drive_command(request, surface, persona, seat, ids_text, motion_video, out_path) {
    let cmd = "node scripts/ui-drive.mjs --surface ";
    cmd += surface;
    cmd += " --ids ";
    cmd += ids_text;
    cmd += " --out ";
    cmd += out_path;
    cmd += " --route ";
    cmd += drive_route(request);
    let click = drive_click(request);
    if click != "" {
        cmd += " --click '";
        cmd += click;
        cmd += "'";
    }
    if persona != "" && persona != "conflict" && safe_flag(persona) {
        cmd += " --persona ";
        cmd += persona;
    }
    if seat != "" && seat != "conflict" && safe_flag(seat) {
        cmd += " --seat ";
        cmd += seat;
    }
    if line_value(request, "camera:") != "" || drive_mentions(request, "prove-fl05-camera") {
        cmd += " --camera";
    }
    if line_value(request, "class-stack:") != "" || drive_mentions(request, "prove-fl05-phone") {
        cmd += " --class-stack";
    }
    if motion_video != "" && safe_flag(motion_video) {
        cmd += " --motion-video ";
        cmd += motion_video;
    }
    cmd
}

fn missing_ids(proof, required) {
    let found = [];
    let items = [];
    if is_map(proof) && is_array(proof.acceptance) { items = proof.acceptance; }
    if is_array(required) {
        for id in required {
            if !acceptance_hit(items, id) { found.push(id); }
        }
    }
    found
}

fn merge_acceptance(prior, next) {
    let out = [];
    if is_array(prior) {
        for item in prior { out.push(item); }
    }
    if is_array(next) {
        for item in next {
            let id = "";
            if is_map(item) { id = as_lower(trimmed(item.id)); }
            let replaced = false;
            let i = 0;
            let kept = [];
            for existing in out {
                if !replaced && is_map(existing) && as_lower(trimmed(existing.id)) == id && id != "" {
                    kept.push(item);
                    replaced = true;
                } else {
                    kept.push(existing);
                }
                i += 1;
            }
            out = kept;
            if !replaced { out.push(item); }
        }
    }
    out
}

fn ui_proof_prompt(request_json, command, ids_text, motion_text, mockup_path, redo) {
    let p = "";
    p += "You are the Kelyra UI proof grader. Do not edit source files. Do not spawn subagents. ";
    p += "Never call ask_user_question. If the drive command fails, set drive_ran=false and stop. Do not invent a pass.\n";
    p += "Do not explore. Do not grep. Do not open a browser tool. Do not run osascript or cliclick. ";
    p += "Do not read node_modules. Do not fetch a persona port. Do not print a password or token. ";
    p += "Do not click DeviceHub. The phone path is the iOS Simulator, and the script already drove it.\n";
    p += "The only command is node scripts/ui-drive.mjs with the flags below. Run it once. Do not change it:\n";
    p += command;
    p += "\nIf it exits non-zero, set drive_ran=false, put the stderr status in reason, and stop. Do not debug.\n";
    p += "If it exits 0, stdout is PACKET and a path. Read that JSON file once.\n";
    p += "Read each screenshot path in the packet exactly once. Do not read the same file again.\n";
    p += "Copy drive_ran, widths, interaction, phone, and motion from the packet. Do not invent a drive.\n";
    p += "Set drive_status to the first stderr word when the command exits non-zero, and copy that word into reason.\n";
    p += "Set url to the page URL in the packet. Set visible_text to the words on the screenshot you opened. ";
    p += "Set screenshot to one screenshot path from the packet.\n";
    p += "When an acceptance id fails because a request failed, set failed_request to that request and its status. ";
    p += "Otherwise leave failed_request empty.\n";
    p += "For a failed acceptance id, evidence is the sentence that names what the screenshot shows. An empty evidence string is an unnamed proof.\n";
    if redo == "redo" {
        p += "This is a redo. Grade only the acceptance ids listed below. Do not re-grade ids that already passed.\n";
    }
    p += "Acceptance ids to grade: ";
    p += ids_text;
    p += "\nSet passed=true only if a screenshot you opened shows that id. A unit test or a source read is not evidence.\n";
    if motion_text != "" {
        p += "Motion words for motion.note: ";
        p += motion_text;
        p += "\nThe packet video is written by scripts/record-ui-motion.sh. A missing video means drive_ran=false.\n";
    } else {
        p += "No Motion line. Leave motion.required false unless the packet says otherwise.\n";
    }
    if mockup_path != "" {
        p += "Approved mock-up: ";
        p += mockup_path;
        p += "\nOpen that file once, with the screenshots, before marking an id passed. ";
        p += "Same idea is enough. A different structure or a missing control fails that id. ";
        p += "Set mockup_compared=true only after those reads. Do not write MOCKUP: pass or CEO: pass.\n";
    } else {
        p += "No Mockup line. Do not invent a visual comparison.\n";
    }
    p += "ORIGINAL REQUEST (JSON):\n";
    p += request_json;
    p
}
// BOT_PROOF_END

fn ui_proof_opts(schema, type_name) {
    #{
        label: "[ui-proof] grade the packet",
        agent_type: type_name,
        capability_mode: "execute",
        output_schema: schema,
    }
}

let request = read_request(args);
if request == () {
    pause("verification", "Pass args.request (or args.task / a string arg) with the implementation request.");
}

let request_json = encode(request);
let impl_id = ();
let impl_out = ();
let first_impl_out = ();
let all_changed = [];
let qa_out = ();
let blocking = [];
let nonblocking = [];
let qa_repairs = 0;
let verify_repairs = 0;
let security_repairs = 0;
let security_ran = false;
let security_ok = true;
let last_security_blocking = [];
let after_security_verify = false;
let impl_type = "kelyra-implementer";
let qa_type = "kelyra-qa";

let surface = resolve_surface(args, request);
if surface == "" {
    finish("escalated", "Surface tag missing. Send this card back for a Product and QA Supervisor stamp with one Surface line.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
} else if surface == "invalid" || surface == "conflict" {
    finish("escalated", "Surface tag is duplicated or not one of phone, web, both, data, edge, worker, author, lesson.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
} else if surface != "phone" && surface != "web" && surface != "both" {
    finish("escalated", "kelyra-ui-loop is the screen proof. data, edge, and worker use kelyra-qa-loop. author uses author-qa-loop. lesson stays on the punch list.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}
let required_ids = pull_acceptance_ids(request);
if required_ids.len() == 0 {
    finish("escalated", "Screen proof needs at least one acceptance id (AC-...) in the request.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}
let ids_text = "";
for id in required_ids {
    if ids_text != "" { ids_text += ", "; }
    ids_text += id;
}
let persona = persona_of(request);
let seat = seat_of(request);
if persona == "conflict" {
    finish("escalated", "Persona line is duplicated. Use one of office, teacher, parent, or student.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}
if seat == "conflict" {
    finish("escalated", "Seat line is duplicated. Use one of office, teacher, or parent.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}
let motion_text = motion_required_text(request);
let mockup_path = line_value(request, "mockup:");
log("Surface: " + surface);
if persona != "" { log("Persona: " + persona); }
if seat != "" { log("Seat: " + seat); }
if motion_text != "" { log("Motion: " + motion_text); }
if mockup_path != "" { log("Mockup: " + mockup_path); }
let drive_route_value = drive_route(request);
let drive_click_value = drive_click(request);
if drive_route_value == "" || drive_click_value == "" {
    finish("escalated", class_summary("untargeted", "Add Drive: /route click=[aria-label=Name] from .grok/skills/verify-kelyra/. Chief of Staff does not invent it. The loop did not start."), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}
log("Drive: " + drive_route_value + " click=" + drive_click_value);

phase("Implement");
log("Implementing in the current working tree (kelyra-implementer, default model)");
let impl_res = agent(impl_initial_prompt(request_json), impl_opts("[kelyra-implementer] implement", (), impl_schema, impl_type));
if !agent_ok(impl_res) && unknown_subagent_type(impl_res) {
    log("kelyra-implementer is not a registered agent type; falling back to general-purpose with the same persona prompt");
    impl_type = "general-purpose";
    impl_res = agent(impl_initial_prompt(request_json), impl_opts("[kelyra-implementer] implement", (), impl_schema, impl_type));
}
impl_id = latest_impl_id(impl_res, impl_id);
impl_out = impl_output_of(impl_res);
all_changed = merge_path_list(all_changed, impl_out);
if is_map(impl_out) { first_impl_out = impl_out; }
if !agent_ok(impl_res) {
    finish("escalated", "Implementation agent failed.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}

let step = "verify";
let looping = true;
while looping {
    if step == "verify" {
        phase("Verify");
        log("Running npm run typecheck, node --test, and the import check when src changed");
        let ver_res = agent(verify_prompt(request_json, encode(impl_out), encode(all_changed)), verify_opts(command_schema));
        if !agent_ok(ver_res) {
            log("Command runner failed; retrying once");
            ver_res = agent(verify_prompt(request_json, encode(impl_out), encode(all_changed)), verify_opts(command_schema));
        }
        if !agent_ok(ver_res) {
            finish("escalated", "Typecheck and tests did not run. A missing command is not a pass.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        }
        let verify_out = ver_res.output;
        let typecheck_cmd = find_command(verify_out, "typecheck");
        let test_cmd = find_command(verify_out, "--test");
        let import_cmd = find_command(verify_out, "check-test-imports.mjs");
        let need_import = changed_needs_import_check(all_changed);
        if typecheck_cmd == () || test_cmd == () {
            finish("escalated", "npm run typecheck or node --test did not run. A skip is not a pass.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        }
        if need_import && import_cmd == () {
            finish("escalated", "A changed src module did not run scripts/check-test-imports.mjs. A source-text search does not count.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        }
        let import_failed = false;
        if need_import && !command_passed(import_cmd) {
            let import_evidence = as_lower(as_string(import_cmd.output));
            if import_evidence.contains("cannot find module") && import_evidence.contains("check-test-imports.mjs") {
                log("check-test-imports.mjs is not in this repo. That miss does not block this change.");
            } else {
                import_failed = true;
            }
        }
        let suite_failed = false;
        if !command_passed(typecheck_cmd) || !command_passed(test_cmd) { suite_failed = true; }
        if !import_failed && !suite_failed {
            if after_security_verify {
                looping = false;
            } else {
                step = "security";
            }
        } else {
            let verify_blocking = command_blocking(verify_out);
            let dirty_only = false;
            if suite_failed && !import_failed {
                log("A command failed. Checking whether the failure is this change or another dirty file.");
                let class_res = agent(classify_prompt(request_json, encode(all_changed), encode(verify_out)), classify_opts(classify_schema));
                if !agent_ok(class_res) {
                    log("Classify agent failed; retrying once");
                    class_res = agent(classify_prompt(request_json, encode(all_changed), encode(verify_out)), classify_opts(classify_schema));
                }
                if !agent_ok(class_res) {
                    finish("escalated", "Could not tell whether the command failure is this change. Refusing to pass.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
                }
                let class_out = class_res.output;
                if is_map(class_out) && class_out.in_scope == false {
                    dirty_only = true;
                    log("Command failure is an unrelated dirty-tree error. It does not block this change.");
                } else if is_map(class_out) && is_array(class_out.blocking) && class_out.blocking.len() > 0 {
                    verify_blocking = class_out.blocking;
                }
            }
            if dirty_only {
                if after_security_verify {
                    looping = false;
                } else {
                    step = "security";
                }
            } else if verify_repairs >= MAX_VERIFY_REPAIR {
                blocking = verify_blocking;
                finish("escalated", "Typecheck or tests still failing after one repair.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
            } else if impl_id == () {
                finish("escalated", "Cannot resume implementer: missing agent_id.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
            } else {
                verify_repairs += 1;
                phase("Repair");
                log("Resuming original implementer for verify failures (repair " + verify_repairs.to_string() + "/1)");
                impl_res = agent(impl_fix_prompt("verify", request_json, encode(verify_blocking)), impl_opts("[kelyra-implementer] fix verify failures", impl_id, impl_schema, impl_type));
                impl_id = latest_impl_id(impl_res, impl_id);
                impl_out = impl_output_of(impl_res);
                all_changed = merge_path_list(all_changed, impl_out);
                if !agent_ok(impl_res) {
                    finish("escalated", "Resumed implementer failed while fixing verify failures.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
                }
                step = "verify";
            }
        }
    } else if step == "security" {
        let sensitive = needs_security_review(request, impl_out, qa_out);
        if !sensitive && security_repairs == 0 {
            log("Skipping security review; no changed path is auth, RLS, grades, or student data");
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
                finish("escalated", "Security QA agent failed twice; escalating to the parent session.", request, qa_repairs, verify_repairs, security_repairs, security_ran, false, blocking, nonblocking, impl_out, first_impl_out);
            }
            let sec_out = sec_res.output;
            last_security_blocking = extract_blocking(sec_out);
            if is_map(sec_out) {
                let extra = extract_nonblocking(sec_out);
                for item in extra { nonblocking.push(item); }
            }
            if last_security_blocking.len() == 0 {
                security_ok = true;
                if security_repairs > 0 {
                    log("Security findings are clear. Checking typecheck and tests on the fix, then stopping.");
                    after_security_verify = true;
                    step = "verify";
                } else {
                    looping = false;
                }
            } else if security_repairs >= MAX_SECURITY_REPAIR {
                security_ok = false;
                blocking = last_security_blocking;
                finish("escalated", "Security QA still reports P0/P1 after one repair.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
            } else if impl_id == () {
                finish("escalated", "Cannot resume implementer: missing agent_id.", request, qa_repairs, verify_repairs, security_repairs, security_ran, false, last_security_blocking, nonblocking, impl_out, first_impl_out);
            } else {
                security_ok = false;
                security_repairs += 1;
                phase("Repair");
                log("Resuming original implementer for security findings (repair " + security_repairs.to_string() + "/1)");
                impl_res = agent(impl_fix_prompt("security", request_json, encode(last_security_blocking)), impl_opts("[kelyra-implementer] fix security findings", impl_id, impl_schema, impl_type));
                impl_id = latest_impl_id(impl_res, impl_id);
                impl_out = impl_output_of(impl_res);
                all_changed = merge_path_list(all_changed, impl_out);
                if !agent_ok(impl_res) {
                    finish("escalated", "Resumed implementer failed while fixing security findings.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, last_security_blocking, nonblocking, impl_out, first_impl_out);
                }
                log("Security fix stays on the security review. File review does not start over.");
                step = "security";
            }
        }
    } else {
        looping = false;
    }
}

fn diag_prompt(command, reason) {
    let p = "";
    p += "The UI drive did not name its failure. Read the chrome-devtools skill.\n";
    p += "Call search_tool for take_snapshot, list_console_messages, and list_network_requests. Then call each tool once.\n";
    p += "Do not click. Do not reload. Do not edit files. Do not run the drive command again.\n";
    p += "Drive command:\n";
    p += command;
    p += "\nPrior reason:\n";
    p += reason;
    p += "\nSet drive_status to route_not_settled, bundle_overlay, phone_safari, persona_inject_failed, or interaction_missing when that is what the page shows.\n";
    p += "Set url, visible_text, and screenshot. Set failed_request when one request failed. Leave it empty when none did.\n";
    p
}

let diag_schema = #{
    "type": "object",
    "required": ["drive_status", "url", "visible_text", "screenshot"],
    "properties": #{
        "drive_status": #{ "type": "string" },
        "url": #{ "type": "string" },
        "visible_text": #{ "type": "string" },
        "screenshot": #{ "type": "string" },
        "failed_request": #{ "type": "string" },
        "reason": #{ "type": "string" },
    },
};

let ui_repairs = 0;
let proving = true;
let diag_done = false;
let passed_proof = ();
let passed_acceptance = [];
let grade_ids = required_ids;
let prior_acceptance = [];
let proof_type = "kelyra-ui-proof";
let drive_token = fingerprint(request);
if type_of(drive_token) != "string" || drive_token == "" { drive_token = "packet"; }
let drive_out = "/tmp/kelyra-ui-drive-";
drive_out += drive_token;
drive_out += ".json";
let motion_video = "";
if motion_text != "" {
    motion_video = "/tmp/kelyra-ui-motion-";
    motion_video += drive_token;
    motion_video += ".mp4";
}
while proving {
    phase("UI proof");
    let ids_now = join_ids(grade_ids);
    let command = drive_command(request, surface, persona, seat, ids_now, motion_video, drive_out);
    let redo = "";
    if ui_repairs > 0 { redo = "redo"; }
    log("UI drive script for " + ids_now);
    let proof_res = agent(ui_proof_prompt(request_json, command, ids_now, motion_text, mockup_path, redo), ui_proof_opts(ui_proof_schema, proof_type));
    if !agent_ok(proof_res) && unknown_subagent_type(proof_res) {
        log("kelyra-ui-proof is not registered; grading with general-purpose and the same prompt");
        proof_type = "general-purpose";
        proof_res = agent(ui_proof_prompt(request_json, command, ids_now, motion_text, mockup_path, redo), ui_proof_opts(ui_proof_schema, proof_type));
    }
    if !agent_ok(proof_res) {
        log("UI proof agent failed; retrying once");
        proof_res = agent(ui_proof_prompt(request_json, command, ids_now, motion_text, mockup_path, redo), ui_proof_opts(ui_proof_schema, proof_type));
    }
    if !agent_ok(proof_res) {
        finish("escalated", class_summary("unnamed", "UI proof agent failed twice. The repair was not spent."), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
    }
    let proof = proof_res.output;
    if is_map(proof) {
        proof.acceptance = merge_acceptance(prior_acceptance, proof.acceptance);
    }
    let covered = is_map(proof) && proof.drive_ran == true && packet_ok(surface, proof, motion_text, mockup_path) && acceptance_covers(required_ids, proof.acceptance);
    if covered {
        passed_proof = proof;
        passed_acceptance = proof.acceptance;
        proving = false;
    } else {
        let klass = ui_failure_class(surface, proof, required_ids);
        if klass == "unnamed" && is_map(proof) && proof.drive_ran == true && diag_done == false {
            diag_done = true;
            log("UI failure was unnamed. One browser diagnosis, then stop.");
            let diag_res = agent(diag_prompt(command, proof_text(proof, "reason")), #{
                label: "[ui-proof] name the failure",
                agent_type: "general-purpose",
                capability_mode: "read-only",
                output_schema: diag_schema,
            });
            if agent_ok(diag_res) && is_map(diag_res.output) {
                let named = diag_res.output;
                if trimmed(named.drive_status) != "" { proof.drive_status = named.drive_status; }
                if trimmed(named.url) != "" { proof.url = named.url; }
                if trimmed(named.visible_text) != "" { proof.visible_text = named.visible_text; }
                if trimmed(named.screenshot) != "" { proof.screenshot = named.screenshot; }
                if trimmed(named.failed_request) != "" { proof.failed_request = named.failed_request; }
                if trimmed(named.reason) != "" { proof.reason = named.reason; }
                klass = ui_failure_class(surface, proof, required_ids);
            }
        }
        let blob = failure_blob(proof, required_ids);
        let code = harness_code(blob);
        if code == "" { code = data_code(blob); }
        if klass == "harness" {
            let detail = "Status ";
            detail += code;
            detail += ". Do not staff engineering or a mock-up review. Staff a harness card.";
            finish("escalated", class_summary("harness", detail), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        } else if klass == "data" {
            finish("escalated", class_summary("data", "The screen showed an API or SQL rejection. Staff a data card. Do not resume the screen implementer."), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        } else if klass != "product" {
            finish("escalated", class_summary("unnamed", "The proof did not name the url, the visible text, and the screenshot. The repair was not spent."), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        } else if ui_repairs >= MAX_UI_REPAIR {
            blocking = failed_acceptance(proof, required_ids);
            let detail = "Acceptance ids still failing after one named repair. Do not start this Drive line again.";
            if mockup_path != "" {
                detail = "The driven screen disagrees with the mock-up. Mock-up review is next. Do not staff another engineering loop.";
            }
            finish("escalated", class_summary("product", detail), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        } else if impl_id == () {
            finish("escalated", class_summary("unnamed", "Cannot resume implementer for UI findings: missing agent_id."), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
        } else {
            ui_repairs += 1;
            prior_acceptance = proof.acceptance;
            grade_ids = missing_ids(proof, required_ids);
            blocking = failed_acceptance(proof, grade_ids);
            phase("Repair");
            log("Resuming original implementer for a named product failure (repair " + ui_repairs.to_string() + "/1)");
            impl_res = agent(impl_fix_prompt("ui proof", request_json, encode(blocking)), impl_opts("[kelyra-implementer] fix UI proof findings", impl_id, impl_schema, impl_type));
            impl_id = latest_impl_id(impl_res, impl_id);
            impl_out = impl_output_of(impl_res);
            all_changed = merge_path_list(all_changed, impl_out);
            if !agent_ok(impl_res) {
                finish("escalated", class_summary("unnamed", "Resumed implementer failed while fixing UI proof findings. The repair was spent."), request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
            }
        }
    }
}

if !is_map(passed_proof) {
    finish("escalated", "UI proof ended without a packet.", request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
}
let packet_widths = [];
if is_array(passed_proof.widths) { packet_widths = passed_proof.widths; }
let packet_interaction = #{ did: false, from_state: "", to_state: "" };
if is_map(passed_proof.interaction) { packet_interaction = passed_proof.interaction; }
let packet_phone = #{ ran: false, screenshot: "", evidence: "" };
if is_map(passed_proof.phone) { packet_phone = passed_proof.phone; }
let packet_acceptance = passed_acceptance;
if packet_acceptance.len() == 0 && is_array(passed_proof.acceptance) {
    packet_acceptance = passed_proof.acceptance;
}
let packet_motion = #{ required: false, video: "", note: "" };
if is_map(passed_proof.motion) { packet_motion = passed_proof.motion; }
let packet = #{
    surface: surface,
    drive_ran: true,
    acceptance: packet_acceptance,
    widths: packet_widths,
    interaction: packet_interaction,
    phone: packet_phone,
    motion: packet_motion,
    mockup: mockup_path,
};
let packet_json = json_encode(packet);
let packet_path = write_scratch_file("ui-proof-packet.json", packet_json);
let pass_summary = "UI proof packet covered every acceptance id.";
pass_summary += "\nUI_PROOF_PACKET_START\n";
pass_summary += packet_json;
pass_summary += "\nUI_PROOF_PACKET_END\nscratch: ";
pass_summary += packet_path;
finish("passed", pass_summary, request, qa_repairs, verify_repairs, security_repairs, security_ran, security_ok, blocking, nonblocking, impl_out, first_impl_out);
