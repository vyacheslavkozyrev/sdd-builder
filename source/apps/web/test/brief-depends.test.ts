import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import { emptyBrief } from '../src/brief/state.js';
import type { BriefState } from '../src/brief/state.js';
import { buildRules, splitDependsOn, toProjectConfig } from '../src/brief/to-config.js';
import { startState } from '../src/builder/map-state.js';

/** The brief as the F-05 brief screen shows it, with api and web depending on core. */
function wireframeBrief(): BriefState {
  return {
    name: 'Hourly Tracker',
    idea: 'Hourly Tracker helps a household see when electricity is cheap.',
    stack: {
      language: 'TypeScript',
      framework: 'Node.js + Fastify',
      testFramework: 'Vitest',
      buildTool: 'npm workspaces',
    },
    architecture: {
      style: 'Layered; dependencies point one way',
      modules: [
        { name: 'core', layer: '0', responsibility: 'Domain types and generator', dependsOn: '' },
        { name: 'api', layer: '1', responsibility: 'HTTP, LLM review, limits', dependsOn: 'core' },
        { name: 'web', layer: '1', responsibility: 'Visual builder', dependsOn: 'core' },
      ],
    },
    codeRules: [],
    testRules: [],
    privacyAccepted: true,
  };
}

/** Returns the configuration, failing the test when the build reports bad layers. */
function configOf(brief: BriefState): ProjectConfig {
  const built = toProjectConfig(brief, startState());
  if (!built.ok) {
    throw new Error(`expected a configuration, got bad layers at ${built.badLayers.join(', ')}`);
  }
  return built.config;
}

describe('F-05 AC-009 depends-on split', () => {
  it.each([
    ['an empty text', '', []],
    ['a blank text', '   ', []],
    ['only commas', ',,,', []],
    ['commas and spaces only', ' , ,  ,', []],
    ['one name', 'core', ['core']],
    ['two names', 'core,api', ['core', 'api']],
    ['spaces around names', '  core ,  api  ', ['core', 'api']],
    ['a leading and a trailing comma', ',core,api,', ['core', 'api']],
    ['a doubled comma between names', 'core,,api', ['core', 'api']],
    ['a tab around a name', '\tcore\t', ['core']],
    ['duplicate names kept in order', 'api,core,api', ['api', 'core', 'api']],
    ['names kept in the order typed', 'web,core,api', ['web', 'core', 'api']],
  ])('F-05 AC-009 splits %s into the names in order', (_label, text, expected) => {
    expect(splitDependsOn(text)).toEqual(expected);
  });

  it('F-05 AC-009 puts the split names into the module configuration', () => {
    const brief = wireframeBrief();
    brief.architecture.modules[1] = { name: 'api', layer: '1', responsibility: 'HTTP', dependsOn: ' core , web ,' };

    expect(configOf(brief).architecture.modules[1]?.dependsOn).toEqual(['core', 'web']);
  });

  it('F-05 AC-009 gives an empty array when a module depends on nothing', () => {
    const brief = wireframeBrief();

    expect(configOf(brief).architecture.modules[0]?.dependsOn).toEqual([]);
  });

  it('F-05 AC-009 builds the wireframe brief with dependsOn core for api and web into a configuration that parseProjectConfig accepts', () => {
    const config = configOf(wireframeBrief());

    expect(config.architecture.modules).toEqual([
      { name: 'core', layer: 0, responsibility: 'Domain types and generator', dependsOn: [] },
      { name: 'api', layer: 1, responsibility: 'HTTP, LLM review, limits', dependsOn: ['core'] },
      { name: 'web', layer: 1, responsibility: 'Visual builder', dependsOn: ['core'] },
    ]);
    expect(parseProjectConfig(config).ok).toBe(true);
  });
});

describe('F-05 AC-011 unmatched depends-on names', () => {
  it('F-05 AC-011 keeps a name that matches no module, in place', () => {
    const brief = wireframeBrief();
    brief.architecture.modules[1] = { name: 'api', layer: '1', responsibility: 'HTTP', dependsOn: 'ghost, core' };

    expect(configOf(brief).architecture.modules[1]?.dependsOn).toEqual(['ghost', 'core']);
  });

  it('F-05 AC-011 keeps every unmatched name when no module matches', () => {
    const brief = wireframeBrief();
    brief.architecture.modules = [{ name: 'api', layer: '0', responsibility: 'HTTP', dependsOn: 'x,y' }];

    expect(configOf(brief).architecture.modules[0]?.dependsOn).toEqual(['x', 'y']);
  });

  it('F-05 AC-011 builds a configuration with an unmatched name that parseProjectConfig accepts, so /analyze can report it', () => {
    const brief = wireframeBrief();
    brief.architecture.modules[1] = { name: 'api', layer: '1', responsibility: 'HTTP', dependsOn: 'ghost' };

    expect(parseProjectConfig(configOf(brief)).ok).toBe(true);
  });
});

describe('F-05 AC-012 rule lists', () => {
  it.each([
    ['an empty list', [], []],
    ['only blank rules', ['', '   ', '\t'], []],
    ['one rule with spaces around it', ['  Use strict  '], ['Use strict']],
    ['blank rules between two rules', ['Use strict', ' ', 'Keep pure'], ['Use strict', 'Keep pure']],
    ['rules kept in the order typed', ['b rule', 'a rule'], ['b rule', 'a rule']],
  ])('F-05 AC-012 builds %s into the rules', (_label, rules, expected) => {
    expect(buildRules(rules)).toEqual(expected);
  });

  it('F-05 AC-012 sets the code rules and test rules from the brief lists, dropping blanks', () => {
    const brief = wireframeBrief();
    brief.codeRules = ['  Keep core pure ', ''];
    brief.testRules = [' ', 'Every criterion has a test'];

    const config = configOf(brief);

    expect(config.codeRules).toEqual(['Keep core pure']);
    expect(config.testRules).toEqual(['Every criterion has a test']);
  });

  it('F-05 AC-012 gives empty rule arrays when there are no rules, and that is valid', () => {
    const config = configOf(emptyBrief());

    expect(config.codeRules).toEqual([]);
    expect(config.testRules).toEqual([]);
    expect(parseProjectConfig(config).ok).toBe(true);
  });

  it('F-05 AC-012 gives empty rule arrays when every rule is blank', () => {
    const brief = wireframeBrief();
    brief.codeRules = ['', '  '];
    brief.testRules = ['\t'];

    const config = configOf(brief);

    expect(config.codeRules).toEqual([]);
    expect(config.testRules).toEqual([]);
  });
});
