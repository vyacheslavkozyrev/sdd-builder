import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Box, Button, TextField, Typography, useTheme } from '@mui/material';
import { addAgentTool, removeAgentTool } from './blockAgentFields.js';
import type { AgentListResult } from './blockAgentFields.js';
import { agentAt } from './blockFields.js';
import { getRowEditorStyles } from './rowEditorStyles.js';
import type { Pipeline, Rule } from './fields.js';

// The tool list of an Agent block on the flow tab (F-12 AC-022; the reads and writes lists were removed, device fix
// 2026-11-24). It is a compact list: a title with + in it, then one row per tool with its minus. The + opens a line
// for a new value; the line is saved when focus leaves it or Enter is pressed, through the functions of
// blockAgentFields.ts, which check the value. A refused value keeps the saved list and shows its reason beneath the
// list. The argument and rule tag lists are the row editors of RowEditors.tsx with the Agent target.

export interface AgentListProps {
  readonly flowId: string;
  readonly blockId: string;
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly onChange: (pipelineState: Pipeline) => void;
}

interface TextListProps {
  // The list's title, and the name of one of its items ("Tool").
  readonly title: string;
  readonly name: string;
  readonly values: readonly string[];
  readonly add: (text: string) => AgentListResult;
  readonly remove: (position: number) => Pipeline;
  readonly onChange: (pipelineState: Pipeline) => void;
}

// Enter ends the edit of the line, as losing focus does. Enter that ends an IME composition is not an edit end.
function endOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
}

// One list of text values: a title with + in it, then the saved values as rows, then the line for a new value. The
// refusal of the last add or remove is shown beneath the list.
function AgentTextList({ title, name, values, add, remove, onChange }: TextListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [adding, setAdding] = useState<string | undefined>(undefined);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);
  const refusalId = `${idBase}-refusal`;
  const lowerName = name.toLowerCase();

  // A blank line is discarded. An accepted value is saved and closes the line; a refused one keeps the line
  // with its text and shows the reason beneath the list.
  function commitNew(text: string) {
    if (text.trim() === '') {
      setAdding(undefined);
      setRefusal(undefined);
      return;
    }
    const result = add(text);
    if (result.ok) {
      onChange(result.pipeline);
      setAdding(undefined);
      setRefusal(undefined);
      return;
    }
    setRefusal(result.reason);
  }

  function removeAt(position: number) {
    onChange(remove(position));
    setRefusal(undefined);
  }

  return (
    <Box sx={styles.list}>
      <Box sx={styles.titleRow}>
        <Typography component="p" sx={styles.title}>
          {title}
        </Typography>
        <Button
          variant="outlined"
          aria-label={`Add ${lowerName}`}
          onClick={() => {
            setRefusal(undefined);
            setAdding((current) => current ?? '');
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {values.map((value, position) => (
        <Box key={position} role="group" aria-label={`${name} ${position + 1}`} sx={styles.row}>
          <Box sx={styles.rowLine}>
            <TextField
              value={value}
              sx={styles.input}
              slotProps={{ htmlInput: { readOnly: true, 'aria-label': `${name} ${position + 1} text` } }}
            />
            <Button
              variant="outlined"
              aria-label={`Remove ${lowerName} ${position + 1}`}
              onClick={() => {
                removeAt(position);
              }}
              sx={styles.minusButton}
            >
              −
            </Button>
          </Box>
        </Box>
      ))}

      {adding === undefined ? null : (
        <Box
          role="group"
          aria-label={`New ${lowerName}`}
          sx={styles.row}
          // The line is saved when focus leaves it, not when Tab moves it to the line's own minus.
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            commitNew(adding);
          }}
        >
          <Box sx={styles.rowLine}>
            <TextField
              value={adding}
              error={refusal !== undefined}
              onChange={(event) => {
                setAdding(event.target.value);
              }}
              sx={styles.input}
              slotProps={{
                htmlInput: {
                  'aria-label': `New ${lowerName} text`,
                  'aria-describedby': refusal === undefined ? undefined : refusalId,
                  onKeyDown: endOnEnter,
                },
              }}
            />
            <Button
              variant="outlined"
              aria-label={`Cancel new ${lowerName}`}
              // The press keeps the focus in the line, so the line is discarded and not saved on blur.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setAdding(undefined);
                setRefusal(undefined);
              }}
              sx={styles.minusButton}
            >
              −
            </Button>
          </Box>
        </Box>
      )}

      {refusal === undefined ? null : (
        <Typography id={refusalId} component="p" sx={styles.refusal}>
          {refusal}
        </Typography>
      )}
    </Box>
  );
}

// The tools of the Agent (AC-022): one row per tool, a read-only field with its minus. A tool is added through +
// and removed through its minus; a tool is not edited in place.
export function AgentToolRows({ flowId, blockId, pipelineState, rules, onChange }: AgentListProps) {
  const tools = agentAt(pipelineState, flowId, blockId).agent.tools ?? [];
  return (
    <AgentTextList
      title="Tools"
      name="Tool"
      values={tools}
      add={(text) => addAgentTool(pipelineState, rules, flowId, blockId, text)}
      remove={(position) => removeAgentTool(pipelineState, flowId, blockId, position)}
      onChange={onChange}
    />
  );
}
