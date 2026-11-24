# Pipeline JSON schema (SDDBuilder)

Status: final draft for owner approval (2026-11-19). It replaces the connection model of `architecture.md` §6 decision 33 and the flow-level checks of the 2026-11-18 draft. Decisions: 38 (a flow is one object; linear pipeline; no loops between flows), 39 (flows are connected; name and body required), 40 (a failed check stops the flow and asks the user), 41 (analysis must succeed before generation; generation writes the content with the model). Owner decisions of 2026-11-19 are in section 6.

## 1. Shape of the file

- A **pipeline** is an ordered list of **flows**. Between flows there is an arrow: a flow's `next` names the next flow. Loops between flows are not allowed.
- A **flow** is one object with its own properties: id, name, description, arguments (rows), model, body, **artifacts** (its outcome artifacts), **approval** (on or off: the process stops for a person at the end of this flow), **next**, and **blocks**.
- A flow's **blocks** form its own canvas: a **Start** (the entry circle), **Agent** blocks, **Condition** blocks and an **End** (the exit circle). Arrows between blocks are `next` (agent, start) or the two routes of a condition.
- A **Condition** is the only kind of check. It is placed on an arrow between two blocks and has a **true** and a **false** route. A **pre-check** is a condition between Start and the first Agent. A check at the end is a condition between the last Agent and End. A **false** route can return to any earlier Agent (a retry), with a round limit.
- There are no flow-level checks, no Approval block and no Check block.

## 2. Schema (JSON Schema, draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://sddbuilder.local/schemas/project-config.v2.json",
  "title": "SDDBuilder project configuration (schemaVersion 2)",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "rules", "pipeline"],
  "properties": {
    "schemaVersion": { "const": 2 },
    "name": { "type": "string", "maxLength": 100 },
    "idea": { "type": "string", "maxLength": 5000 },
    "architecture": { "type": "string", "maxLength": 5000 },
    "stack": { "$ref": "#/$defs/stack" },
    "rules": { "type": "array", "items": { "$ref": "#/$defs/rule" } },
    "pipeline": { "$ref": "#/$defs/pipeline" }
  },
  "$defs": {
    "id": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$", "maxLength": 60 },
    "text": { "type": "string", "pattern": "\\S", "maxLength": 1000 },
    "body": { "type": "string", "pattern": "\\S", "maxLength": 1000, "description": "Not blank; counted in code points." },
    "model": { "enum": ["haiku", "sonnet", "opus", "inherit"] },
    "stack": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "language": { "type": "string", "maxLength": 100 },
        "framework": { "type": "string", "maxLength": 100 },
        "platform": { "type": "string", "maxLength": 100 },
        "buildTool": { "type": "string", "maxLength": 100 },
        "testFramework": { "type": "string", "maxLength": 100 }
      }
    },
    "rule": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "title", "text"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "title": { "type": "string", "maxLength": 100 },
        "text": { "type": "string", "maxLength": 1000 }
      }
    },
    "argument": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "required", "hint"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "required": { "type": "boolean" },
        "hint": { "type": "string", "maxLength": 100 }
      }
    },
    "pipeline": {
      "type": "object", "additionalProperties": false,
      "required": ["name", "description", "arguments", "flows"],
      "properties": {
        "name": { "type": "string", "minLength": 1, "maxLength": 100 },
        "description": { "type": "string", "maxLength": 1000 },
        "arguments": { "type": "array", "items": { "$ref": "#/$defs/argument" } },
        "model": { "$ref": "#/$defs/model" },
        "tools": { "type": "array", "items": { "type": "string", "maxLength": 100 } },
        "ruleTags": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" } },
        "body": { "$ref": "#/$defs/body" },
        "flows": { "type": "array", "items": { "$ref": "#/$defs/flow" } }
      }
    },
    "flow": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "name", "body", "arguments", "artifacts", "approval", "blocks"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "name": { "type": "string", "minLength": 1, "maxLength": 100 },
        "description": { "type": "string", "maxLength": 1000 },
        "arguments": { "type": "array", "items": { "$ref": "#/$defs/argument" } },
        "model": { "$ref": "#/$defs/model" },
        "ruleTags": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" } },
        "body": { "$ref": "#/$defs/body" },
        "artifacts": { "type": "array", "items": { "$ref": "#/$defs/artifact" } },
        "approval": { "type": "boolean" },
        "next": { "$ref": "#/$defs/id", "description": "The id of the next flow of the pipeline; absent for the last flow." },
        "blocks": { "type": "array", "minItems": 2, "items": { "$ref": "#/$defs/block" } }
      }
    },
    "artifact": {
      "type": "object", "additionalProperties": false,
      "required": ["label", "template"],
      "properties": {
        "label": { "type": "string", "pattern": "^[^\\n]*\\S[^\\n]*$", "maxLength": 200, "description": "One line, required, non-blank." },
        "template": { "type": "string", "maxLength": 5000, "description": "Several lines; may be empty." }
      }
    },
    "block": {
      "oneOf": [
        { "$ref": "#/$defs/blockStart" },
        { "$ref": "#/$defs/blockAgent" },
        { "$ref": "#/$defs/blockCondition" },
        { "$ref": "#/$defs/blockEnd" }
      ]
    },
    "blockStart": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "kind", "next"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "kind": { "const": "start" },
        "next": { "$ref": "#/$defs/id", "description": "The first block after Start: an Agent or a Condition (pre-check)." }
      }
    },
    "blockAgent": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "kind", "name", "description", "arguments", "next"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "kind": { "const": "agent" },
        "name": { "$ref": "#/$defs/id", "description": "File-safe; unique among the agent names of the pipeline." },
        "description": { "$ref": "#/$defs/text" },
        "arguments": { "type": "array", "items": { "$ref": "#/$defs/argument" } },
        "model": { "$ref": "#/$defs/model" },
        "tools": { "type": "array", "items": { "type": "string", "maxLength": 100 } },
        "reads": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/text" }, "description": "Artifact labels the agent reads; no duplicates." },
        "writes": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/text" }, "description": "Artifact labels the agent writes; no duplicates." },
        "ruleTags": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" }, "description": "Rules of the project (rules) that apply to the agent." },
        "body": { "$ref": "#/$defs/body" },
        "next": { "$ref": "#/$defs/id", "description": "The next block: an Agent, a Condition or the End." }
      }
    },
    "blockCondition": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "kind", "description", "true", "false"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "kind": { "const": "condition" },
        "description": { "$ref": "#/$defs/text", "description": "What is checked, in free text." },
        "true": { "$ref": "#/$defs/route" },
        "false": { "$ref": "#/$defs/route" }
      }
    },
    "route": {
      "oneOf": [
        {
          "type": "object", "additionalProperties": false,
          "required": ["to"],
          "properties": { "to": { "$ref": "#/$defs/id", "description": "A block of the same flow: the next block, or an earlier Agent (a return)." } }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["to", "roundLimit"],
          "properties": {
            "to": { "$ref": "#/$defs/id", "description": "An earlier Agent of the same flow." },
            "roundLimit": { "type": "integer", "minimum": 1, "maximum": 5, "description": "The number of returns allowed: 1 to 5, required." }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["stop"],
          "properties": { "stop": { "const": true } },
          "description": "Stops the flow and asks the user (decision 40)."
        }
      ]
    },
    "blockEnd": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "kind", "outcome", "producedArtifact"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "kind": { "const": "end" },
        "outcome": { "enum": ["done", "stopped"] },
        "producedArtifact": { "type": "string", "minLength": 1, "maxLength": 200, "description": "The label of one of the flow's artifacts (required; no 'none')." }
      }
    }
  }
}
```

## 3. Rules the schema does not express (checked by the parser and by F-03)

- **Ids** are unique within their scope and file-safe (decision 18). Agent `name`s are unique in the pipeline.
- **Flow names** are unique among the flows' names (owner, 2026-11-17).
- **Next links:** `next` (flow) names another flow of the pipeline, never the flow itself. A flow has at most one outgoing `next` and at most one incoming `next`. The flow `next` links form no loop (decision 38).
- **Connected flows:** a flow has an incoming or an outgoing `next`, unless the pipeline has one flow; the first flow is the one no other `next` points to (decision 39; reachability).
- **Blocks of a flow:** exactly one Start and at least one End (F-12, owner decision 2026-11-23; `analyze/start-end.ts`); every block is reachable from Start; every block except End has a route out; a route names a block of the same flow.
- **Returns:** a route back to an earlier Agent is only allowed from a Condition and carries a `roundLimit` of 1 to 5. An Agent's or a Start's `next` names a later block of its flow: a `next` that names the block itself or an earlier block is refused (owner, 2026-11-19).
- **Later and earlier:** "later" and "earlier" are the arrow order from Start (owner, 2026-11-24): the walk from Start over `next`, `true` and `false`, breadth-first, each block once, with the End counted as a block; a block no arrow reaches follows in list order. An earlier block may be any block kind; a return goes only to an earlier Agent. The checks compare positions in this order, not the position in the file (`flowArrowOrder` in `source/packages/core`).
- **End:** `producedArtifact` is the label of one of the flow's artifacts.
- **Deleting a block** removes its arrows; the blocks that pointed to it lose that route or `next`.
- **Checks are conditions:** a Condition's `description` is required and non-blank.
- **Approval** is a flag on the flow; it stops the process at the end of the flow (owner, 2026-11-18).
- **Body** texts are required, not blank, and at most 1000 code points (decision 39; F-11 AC-022).
- **Rule tags** name rules in `rules`.

## 4. Example: the flow `plan`

```json
{
  "id": "plan",
  "name": "plan",
  "description": "Turns the spec into a plan.",
  "arguments": [{ "id": "feature-id", "required": true, "hint": "F-XX" }],
  "model": "inherit",
  "body": "Writes plan.md from the approved stories.",
  "artifacts": [{ "label": "plan.md", "template": "Task list, in order" }],
  "approval": true,
  "next": "build",
  "blocks": [
    { "id": "start", "kind": "start", "next": "pre" },
    { "id": "pre", "kind": "condition", "description": "The brief is complete.",
      "true": { "to": "planner" }, "false": { "stop": true } },
    { "id": "planner", "kind": "agent", "name": "planner", "description": "Writes the plan.",
      "arguments": [], "model": "inherit", "tools": ["Read", "Write"], "body": "Reads the stories and the screens.",
      "next": "review" },
    { "id": "review", "kind": "condition", "description": "The reviewer approves the plan.",
      "true": { "to": "end" }, "false": { "to": "planner", "roundLimit": 3 } },
    { "id": "end", "kind": "end", "outcome": "done", "producedArtifact": "plan.md" }
  ]
}
```

Note: the example has one Agent for brevity; the `review` condition is the end check and returns to `planner` (a retry, up to 3 rounds).

## 5. What is removed from the previous model

- The connection object, its label and its gate (decision 33 for the connection; superseded by decision 38).
- The flow-level `checks` list (checks are conditions inside the flow).
- The Approval and Check block kinds, and the gate kinds `approval` and `check`. Approval is the flow's flag.
- Flow arguments as one text value: arguments are rows.

## 6. Owner decisions (2026-11-19) and open points

Decided:
- The flow tab is a canvas of blocks: Start, Agent, Condition, End. Start and End are kept.
- Agents connect to agents; a Condition sits between blocks with a true and a false route; a false route can return to any earlier Agent, with a round limit of 1 to 5 (decided).
- Checks are conditions only (pre-check before the first Agent; checks at the end after the last Agent). Flow-level checks are removed.
- Human approval stays a flow property (checkbox on the Pipeline tab).
- Toolbox: a floating panel with icon buttons, top-right of the canvas.
- Length limits confirmed: templates 5000, descriptions 1000, argument hints 100.
- Rule tags on flows and the pipeline are kept (optional), and agents have rule tags too.
- Agents have `reads` and `writes` (lists of artifact labels, no duplicates).
- End's `producedArtifact` is the label of one of the flow's artifacts; "none" is not allowed.
- Each flow has at most one incoming `next`.
- Deleting a block removes its arrows; no rewiring.
- Lists (arguments, artifacts, approval, blocks) are required; they may be empty.
- A false pre-check stops the flow (confirmed).
- When a check fails and the flow stops, the generated command asks the user a question, written by the model from the condition's description (option a).

No open points remain in this draft.
