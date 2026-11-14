// Step inspector: shows the selected step with the read model in inspector-view.ts. It holds no rules
// of its own; the files and tags come from the step definition, catalog or custom alike.
import type { StepDefinition } from '@sddbuilder/core';
import { stepInspector } from './inspector-view.js';

interface InspectorProps {
  /** The selected step's definition, or undefined when no step is selected. */
  step: StepDefinition | undefined;
}

export function Inspector({ step }: InspectorProps) {
  if (step === undefined) {
    return (
      <section aria-label="Step inspector">
        <h2>Inspector</h2>
        <p className="hint">Select a step in the diagram to see the files it produces and its rule-set tags.</p>
      </section>
    );
  }

  const view = stepInspector(step);
  return (
    <section aria-label="Step inspector">
      <h2>{view.name}</h2>
      <p className="hint">{view.summary}</p>
      <h3>Produces</h3>
      <p>{view.producesText}</p>
      <h3>Rule-set tags</h3>
      {view.ruleTags.length === 0 ? (
        <p>none</p>
      ) : (
        <ul className="inspector-tags">
          {view.ruleTags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
