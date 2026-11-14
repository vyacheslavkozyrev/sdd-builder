// Step list of one workflow tab: add from the catalog, remove, move up and down, and switch steps
// and gates or branch routes on or off. Required steps and required gates cannot be removed or
// switched off: their remove control and their switch-off control are disabled while they are on.
// Switching a required item on again stays allowed. Every edit calls the state functions in step-state.ts
// and tab-state.ts; a refused edit shows its message and leaves the map as it was.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { DEFAULT_STEP_CATALOG } from '@sddbuilder/core';
import type { Condition, RouteTarget, Workflow } from '@sddbuilder/core';
import { addStep, moveStep, removeStep, setStepEnabled } from './step-state.js';
import { setConditionEnabled } from './tab-state.js';
import type { EditResult, MapState } from './map-state.js';

const FIRST_CATALOG_ID = DEFAULT_STEP_CATALOG[0]?.id ?? '';

interface StepListProps {
  map: MapState;
  workflow: Workflow;
  onChange: (state: MapState) => void;
}

function routeText(route: RouteTarget | undefined, stepName: (stepId: string) => string): string {
  if (route === undefined) {
    return 'not wired';
  }
  if (route.kind === 'step') {
    return `back to ${stepName(route.stepId)}`;
  }
  return route.kind === 'stop' ? 'stop' : 'next';
}

export function StepList({ map, workflow, onChange }: StepListProps) {
  const [catalogId, setCatalogId] = useState(FIRST_CATALOG_ID);
  const [message, setMessage] = useState<string | null>(null);

  const catalogEntry = (stepId: string) => DEFAULT_STEP_CATALOG.find((item) => item.id === stepId);
  const stepName = (stepId: string) => catalogEntry(stepId)?.name ?? stepId;

  function apply(result: EditResult) {
    if (result.ok) {
      onChange(result.state);
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(addStep(map, workflow.id, catalogId));
  }

  function handleCatalog(value: string) {
    const next = DEFAULT_STEP_CATALOG.find((item) => item.id === value);
    if (next !== undefined) {
      setCatalogId(next.id);
    }
  }

  function handleCondition(condition: Condition, enabled: boolean) {
    apply(setConditionEnabled(map, workflow.id, condition.id, enabled));
  }

  return (
    <section aria-label={`Steps of ${workflow.name}`}>
      <form onSubmit={handleAdd}>
        <label>
          Catalog step{' '}
          <select value={catalogId} onChange={(event) => handleCatalog(event.target.value)}>
            {DEFAULT_STEP_CATALOG.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>{' '}
        <button type="submit">Add step</button>
      </form>

      {message !== null && <p role="alert">{message}</p>}

      <ol>
        {workflow.steps.map((step, index) => {
          const required = catalogEntry(step.stepId)?.required ?? false;
          const name = stepName(step.stepId);
          return (
            <li key={step.stepId}>
              <span>{name}</span>{' '}
              <label>
                <input
                  type="checkbox"
                  aria-label={`${name} enabled`}
                  checked={step.enabled}
                  disabled={required && step.enabled}
                  onChange={(event) =>
                    onChange(setStepEnabled(map, workflow.id, step.stepId, event.target.checked))
                  }
                />{' '}
                enabled
              </label>{' '}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onChange(moveStep(map, workflow.id, step.stepId, 'up'))}
              >
                Move {name} up
              </button>{' '}
              <button
                type="button"
                disabled={index === workflow.steps.length - 1}
                onClick={() => onChange(moveStep(map, workflow.id, step.stepId, 'down'))}
              >
                Move {name} down
              </button>{' '}
              <button
                type="button"
                disabled={required}
                onClick={() => apply(removeStep(map, workflow.id, step.stepId))}
              >
                Remove {name}
              </button>
            </li>
          );
        })}
      </ol>

      <h3>Gates and branch routes</h3>
      <ul>
        {workflow.conditions.map((condition) => {
          const gate = condition.gate;
          const label = `${gate.type} after ${stepName(condition.afterStepId)}`;
          return (
            <li key={condition.id}>
              <span>
                {label}: pass {routeText(condition.pass, stepName)}, fail{' '}
                {routeText(condition.fail, stepName)}
              </span>{' '}
              <label>
                <input
                  type="checkbox"
                  aria-label={`${label} enabled`}
                  checked={condition.enabled}
                  disabled={gate.required && condition.enabled}
                  onChange={(event) => handleCondition(condition, event.target.checked)}
                />{' '}
                enabled
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
