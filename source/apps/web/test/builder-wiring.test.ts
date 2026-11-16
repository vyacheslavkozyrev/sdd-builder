import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_SRC = join(import.meta.dirname, '..', 'src');
const wizardSource = readFileSync(join(WEB_SRC, 'wizard', 'Wizard.tsx'), 'utf8');
const appSource = readFileSync(join(WEB_SRC, 'App.tsx'), 'utf8');

/** The module specifiers imported from any `builder` folder in the source text. */
function builderImports(text: string): string[] {
  return [...text.matchAll(/from\s+['"]([^'"]*\/builder\/[^'"]*)['"]/g)].map((match) => match[1] ?? '');
}

describe('F-06 T020 the wizard hosts the pipeline builder at step 3', () => {
  it('F-06 T020 the page holds the pipeline config, starting from the default pipeline', () => {
    expect(appSource).toMatch(
      /const \[config, setConfig\] = useState<ProjectConfig>\(\(\) => pipeline\.defaultProjectConfig\);/,
    );
    expect(appSource).toMatch(/import \{ pipeline \} from '@sddbuilder\/core';/);
  });

  it('F-06 T020 the page passes the config and its setter to the wizard', () => {
    expect(appSource).toMatch(
      /<Wizard\s+wizard=\{wizard\}\s+onWizardChange=\{setWizard\}\s+config=\{config\}\s+onConfigChange=\{setConfig\}\s*\/>/,
    );
  });

  it('F-06 T020 the wizard imports only PipelineBuilder from the builder folder', () => {
    expect(builderImports(wizardSource)).toEqual(['../builder/PipelineBuilder.js']);
  });

  it('F-06 T020 the wizard passes the config as initial and reports changes through onChange', () => {
    expect(wizardSource).toMatch(/<PipelineBuilder initial=\{config\} onChange=\{onConfigChange\} \/>/);
  });

  it('F-06 T020 the step-3 builder stays mounted while hidden, so its pipeline survives step 4', () => {
    expect(wizardSource).toMatch(
      /<div hidden=\{step !== 3\}>\s*<PipelineBuilder initial=\{config\} onChange=\{onConfigChange\} \/>\s*<\/div>/,
    );
    expect(wizardSource).not.toMatch(/step === 3 &&\s*<PipelineBuilder/);
  });

  it('F-06 T020 the page imports nothing from the builder and holds no flat map state', () => {
    expect(builderImports(appSource)).toEqual([]);
    expect(appSource).not.toMatch(/map-state|MapState|startState/);
  });
});
