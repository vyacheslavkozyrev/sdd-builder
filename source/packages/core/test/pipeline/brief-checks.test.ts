import { describe, expect, it } from 'vitest';
import { analyzeBrief } from '../../src/pipeline/analyze/brief.js';
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { buildConfig } from './analyze-fixture.js';

const RULE: Rule = { id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.' };

// A config whose brief is complete: every required field, every optional stack field, one rule.
function completeBrief(): ProjectConfig {
  return buildConfig((config) => {
    config.name = 'SDDBuilder';
    config.idea = 'A wizard that writes a Claude Code layout.';
    config.stack = {
      language: 'TypeScript',
      framework: 'React',
      platform: 'Web browser',
      buildTool: 'Vite',
      testFramework: 'Vitest',
    };
    config.rules = [RULE];
  });
}

const BLANK_VALUES = ['   ', '\n', ' \t\n  '];

describe('F-06 AC-007 a missing or blank name, idea or stack.language is a blocker', () => {
  const requiredFields: {
    path: string;
    set: (config: ProjectConfig, value: string) => void;
    remove: (config: ProjectConfig) => void;
  }[] = [
    {
      path: 'name',
      set: (config, value) => {
        config.name = value;
      },
      remove: (config) => {
        delete config.name;
      },
    },
    {
      path: 'idea',
      set: (config, value) => {
        config.idea = value;
      },
      remove: (config) => {
        delete config.idea;
      },
    },
    {
      path: 'stack.language',
      set: (config, value) => {
        config.stack = { ...config.stack, language: value };
      },
      remove: (config) => {
        const stack = { ...config.stack };
        delete stack.language;
        config.stack = stack;
      },
    },
  ];

  for (const field of requiredFields) {
    it(`F-06 AC-007 gives a blocker at ${field.path} when it is absent`, () => {
      const config = completeBrief();
      field.remove(config);
      const findings = analyzeBrief(config);
      expect(findings).toEqual([expect.objectContaining({ severity: 'blocker', path: field.path })]);
    });

    for (const value of ['', ...BLANK_VALUES]) {
      it(`F-06 AC-007 gives a blocker at ${field.path} when it is empty or blank (${JSON.stringify(value)})`, () => {
        const config = completeBrief();
        field.set(config, value);
        const findings = analyzeBrief(config);
        expect(findings).toEqual([expect.objectContaining({ severity: 'blocker', path: field.path })]);
      });
    }
  }

  it('F-06 AC-007 gives a blocker at stack.language, and no other blocker, when the stack is absent', () => {
    const config = completeBrief();
    delete config.stack;
    const blockers = analyzeBrief(config).filter((finding) => finding.severity === 'blocker');
    expect(blockers).toEqual([expect.objectContaining({ path: 'stack.language' })]);
  });

  it('F-06 AC-007 gives blockers at name, idea and stack.language when the brief is entirely absent', () => {
    const findings = analyzeBrief(buildConfig());
    const blockers = findings.filter((finding) => finding.severity === 'blocker').map((finding) => finding.path);
    expect(blockers).toEqual(['name', 'idea', 'stack.language']);
  });
});

describe('F-06 AC-008 a missing or blank optional stack field is a warning', () => {
  const optionalFields = ['framework', 'platform', 'buildTool', 'testFramework'] as const;

  for (const field of optionalFields) {
    it(`F-06 AC-008 gives a warning at stack.${field} when it is absent`, () => {
      const config = completeBrief();
      const stack = { ...config.stack };
      delete stack[field];
      config.stack = stack;
      expect(analyzeBrief(config)).toEqual([
        expect.objectContaining({ severity: 'warning', path: `stack.${field}` }),
      ]);
    });

    for (const value of ['', ...BLANK_VALUES]) {
      it(`F-06 AC-008 gives a warning at stack.${field} when it is empty or blank (${JSON.stringify(value)})`, () => {
        const config = completeBrief();
        config.stack = { ...config.stack, [field]: value };
        expect(analyzeBrief(config)).toEqual([
          expect.objectContaining({ severity: 'warning', path: `stack.${field}` }),
        ]);
      });
    }
  }

  it('F-06 AC-008 gives a warning for each optional stack field when the stack is absent', () => {
    const config = completeBrief();
    delete config.stack;
    const paths = analyzeBrief(config).map((finding) => finding.path);
    expect(paths).toEqual(['stack.language', 'stack.framework', 'stack.platform', 'stack.buildTool', 'stack.testFramework']);
  });

  it('F-06 AC-008 gives a warning for each optional stack field when the stack has only a language', () => {
    const config = completeBrief();
    config.stack = { language: 'TypeScript' };
    const paths = analyzeBrief(config).map((finding) => finding.path);
    expect(paths).toEqual(['stack.framework', 'stack.platform', 'stack.buildTool', 'stack.testFramework']);
  });
});

describe('F-06 AC-009 an empty rules list is a warning', () => {
  it('F-06 AC-009 gives a warning at rules when the list is empty', () => {
    const config = completeBrief();
    config.rules = [];
    expect(analyzeBrief(config)).toEqual([expect.objectContaining({ severity: 'warning', path: 'rules' })]);
  });

  it('F-06 AC-009 gives no rules finding when the list has one rule', () => {
    const config = completeBrief();
    config.rules = [RULE];
    expect(analyzeBrief(config)).toEqual([]);
  });

  it('F-06 AC-009 gives no rules finding when the list has several rules', () => {
    const config = completeBrief();
    config.rules = [RULE, { ...RULE, id: 'small-steps', title: 'Small steps' }];
    expect(analyzeBrief(config)).toEqual([]);
  });
});

describe('F-06 AC-010 a complete brief gives no brief finding', () => {
  it('F-06 AC-010 returns no finding for a complete brief', () => {
    expect(analyzeBrief(completeBrief())).toEqual([]);
  });

  it('F-06 AC-010 treats a value with surrounding spaces as filled when it has text', () => {
    const config = completeBrief();
    config.name = '  SDDBuilder  ';
    expect(analyzeBrief(config)).toEqual([]);
  });
});

describe('F-06 AC-012 brief findings come in a fixed order', () => {
  it('F-06 AC-012 orders the findings name, idea, stack.language, stack fields, rules', () => {
    const config = buildConfig();
    config.rules = [];
    expect(analyzeBrief(config).map((finding) => finding.path)).toEqual([
      'name',
      'idea',
      'stack.language',
      'stack.framework',
      'stack.platform',
      'stack.buildTool',
      'stack.testFramework',
      'rules',
    ]);
  });

  it('F-06 AC-012 keeps the order when only some fields are missing', () => {
    const config = completeBrief();
    config.idea = '';
    config.stack = { platform: 'Web browser' };
    expect(analyzeBrief(config).map((finding) => finding.path)).toEqual([
      'idea',
      'stack.language',
      'stack.framework',
      'stack.buildTool',
      'stack.testFramework',
    ]);
  });
});
