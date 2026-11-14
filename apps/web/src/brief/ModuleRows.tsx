import type { ConfigProblem } from '@sddbuilder/core';
import { Messages } from './Messages.js';
import { messagesAt } from './placement.js';
import type { BriefModuleRow } from './state.js';

interface ModuleRowsProps {
  rows: readonly BriefModuleRow[];
  problems: readonly ConfigProblem[];
  onChange: (rows: BriefModuleRow[]) => void;
}

/** A new module row with every field blank. */
function blankRow(): BriefModuleRow {
  return { name: '', layer: '', responsibility: '', dependsOn: '' };
}

/**
 * The module rows of section 3: one row per module with name, layer, responsibility and depends-on,
 * a remove button per row and an add button (F-05 AC-009, AC-011). A problem is shown beside the
 * name or layer it names (AC-010, AC-027), matched by the module's list position.
 */
export function ModuleRows({ rows, problems, onChange }: ModuleRowsProps) {
  const setRow = (index: number, patch: Partial<BriefModuleRow>) =>
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));

  return (
    <div className="module-rows">
      {rows.map((row, index) => {
        const number = index + 1;
        const namePath = `architecture.modules[${index}].name`;
        const layerPath = `architecture.modules[${index}].layer`;
        return (
          <fieldset key={index} className="module-row">
            <legend>Module {number}</legend>
            <label htmlFor={`module-${number}-name`}>Name</label>
            <input
              id={`module-${number}-name`}
              type="text"
              value={row.name}
              onChange={(event) => setRow(index, { name: event.target.value })}
            />
            <Messages messages={messagesAt(problems, namePath)} />
            <label htmlFor={`module-${number}-layer`}>Layer</label>
            <input
              id={`module-${number}-layer`}
              type="text"
              inputMode="numeric"
              value={row.layer}
              onChange={(event) => setRow(index, { layer: event.target.value })}
            />
            <Messages messages={messagesAt(problems, layerPath)} />
            <label htmlFor={`module-${number}-responsibility`}>Responsibility</label>
            <input
              id={`module-${number}-responsibility`}
              type="text"
              value={row.responsibility}
              onChange={(event) => setRow(index, { responsibility: event.target.value })}
            />
            <label htmlFor={`module-${number}-depends-on`}>Depends on (comma-separated)</label>
            <input
              id={`module-${number}-depends-on`}
              type="text"
              value={row.dependsOn}
              onChange={(event) => setRow(index, { dependsOn: event.target.value })}
            />
            <button type="button" onClick={() => onChange(rows.filter((_, position) => position !== index))}>
              Remove module {number}
            </button>
          </fieldset>
        );
      })}
      <button type="button" onClick={() => onChange([...rows, blankRow()])}>
        + Add module
      </button>
    </div>
  );
}
