import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Dialog, TextField } from '@mui/material';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RuleBlockList,
  RuleBlocks,
  RemoveRuleDialog,
  EMPTY_TITLE,
  LIMIT_REASON_FIRST,
  LIMIT_REASON_SECOND,
  NO_ID_MESSAGE,
  ADD_LABEL,
  ruleFileName,
  duplicateMessage,
  type RuleBlockListProps,
  type RemoveRuleDialogProps,
} from '../src/wizard/RuleBlocks.js';
import type { RuleBlock } from '../src/wizard/state.js';
import { RULE_BLOCK_LIMIT } from '../src/wizard/technical.js';

const repeat = (char: string, count: number): string => char.repeat(count);

function block(name: string, description = ''): RuleBlock {
  return { name, description };
}

function listProps(overrides: Partial<RuleBlockListProps> = {}): RuleBlockListProps {
  return {
    rules: overrides.rules ?? [],
    onAdd: overrides.onAdd ?? (() => undefined),
    onAskRemove: overrides.onAskRemove ?? (() => undefined),
    onUpdate: overrides.onUpdate ?? (() => undefined),
  };
}

function markupOf(rules: readonly RuleBlock[]): string {
  return renderToStaticMarkup(<RuleBlockList {...listProps({ rules })} />);
}

/** The elements of one type in the tree RuleBlockList returns, in document order. */
function elementsOf<P>(type: unknown, rules: readonly RuleBlock[] = [], overrides: Partial<RuleBlockListProps> = {}): ReactElement<P>[] {
  const found: ReactElement<P>[] = [];
  const walk = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isValidElement(node)) return;
    if (node.type === type) found.push(node as ReactElement<P>);
    walk((node.props as { children?: ReactNode }).children);
  };
  walk(RuleBlockList(listProps({ rules, ...overrides })));
  return found;
}

interface FieldProps {
  id?: string;
  multiline?: boolean;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
}

interface ButtonProps {
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

describe('F-10 technical details step: rule list', () => {
  it('F-10 AC-008 a new list is empty and shows the empty text, with no block added by the app', () => {
    const markup = markupOf([]);
    expect(markup).toContain(EMPTY_TITLE);
    expect(markup).not.toContain('Rule block 1');
    expect(elementsOf<ButtonProps>(TextField)).toHaveLength(0);
  });

  it('F-10 AC-009 Add rule block calls onAdd once when enabled, with the blocks in their order', () => {
    const onAdd = vi.fn();
    const addButton = elementsOf<ButtonProps>(Button, [], { onAdd }).find((b) => textOf(b.props.children) === ADD_LABEL);
    expect(addButton?.props.disabled).toBeFalsy();
    addButton?.props.onClick?.();
    expect(onAdd).toHaveBeenCalledTimes(1);

    const markup = markupOf([block('First'), block('Second')]);
    expect(markup.indexOf('Rule block 1')).toBeLessThan(markup.indexOf('Rule block 2'));
    expect(markup.indexOf('value="First"')).toBeLessThan(markup.indexOf('value="Second"'));
  });

  it('F-10 AC-010 each Remove control and name field names its own block (negative case: no shared name)', () => {
    const markup = markupOf([block('One'), block('Two')]);
    expect(markup).toContain('aria-label="Remove rule block 1"');
    expect(markup).toContain('aria-label="Remove rule block 2"');
    expect(markup).toContain('aria-label="Rule block 2 name"');
  });

  it('F-10 AC-010 Remove on the middle of three blocks asks for that block only (negative case: the others are not asked)', () => {
    const onAskRemove = vi.fn();
    const rules = [block('One'), block('Two'), block('Three')];
    const removes = elementsOf<ButtonProps>(Button, rules, { onAskRemove }).filter(
      (b) => textOf(b.props.children) === 'Remove',
    );
    expect(removes).toHaveLength(3);
    removes[1]?.props.onClick?.();
    expect(onAskRemove).toHaveBeenCalledTimes(1);
    expect(onAskRemove).toHaveBeenCalledWith(1);
  });

  it('F-10 AC-011 the confirmation keeps the block on Cancel and removes it on Remove (negative case: Remove does not remove before the dialog answers)', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const props: RemoveRuleDialogProps = { index: 0, rule: block('Code Style'), hasNext: true, onCancel, onConfirm };
    const tree = RemoveRuleDialog(props);
    expect(tree.type).toBe(Dialog);
    expect(textOf(tree)).toContain('Remove rule block 1?');
    expect(textOf(tree)).toContain('Rule block 2 keeps its place in the list.');

    const buttons = collect<ButtonProps>(tree, Button);
    const cancel = buttons.find((b) => textOf(b.props.children) === 'Cancel');
    const confirm = buttons.find((b) => textOf(b.props.children) === 'Remove');
    cancel?.props.onClick?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    confirm?.props.onClick?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('F-10 AC-011 the list shows no confirmation before Remove is pressed (negative case)', () => {
    const markup = renderToStaticMarkup(
      <RuleBlocks rules={[block('Code Style')]} onAdd={() => undefined} onRemove={() => undefined} onUpdate={() => undefined} />,
    );
    expect(markup).not.toContain('Remove rule block 1?');
  });

  it.each([
    [0, true],
    [59, true],
    [60, false],
  ])('F-10 AC-012 with %i blocks Add rule block is enabled: %s', (count, enabled) => {
    const rules = Array.from({ length: count }, (_, i) => block(`Rule ${i}`));
    const add = elementsOf<ButtonProps>(Button, rules).find((b) => textOf(b.props.children) === ADD_LABEL);
    expect(Boolean(add?.props.disabled)).toBe(!enabled);
    const markup = markupOf(rules);
    if (enabled) {
      expect(markup).not.toContain(LIMIT_REASON_FIRST);
    } else {
      expect(markup).toContain(LIMIT_REASON_FIRST);
      expect(markup).toContain(LIMIT_REASON_SECOND);
    }
  });

  it('F-10 AC-012 at 60 blocks the reason is shown beside Add and no 61st block can be added from the list (negative case)', () => {
    const rules = Array.from({ length: RULE_BLOCK_LIMIT }, (_, i) => block(`Rule ${i}`));
    const add = elementsOf<ButtonProps>(Button, rules, { onAdd: () => undefined }).find(
      (b) => textOf(b.props.children) === ADD_LABEL,
    );
    expect(add?.props.disabled).toBe(true);
    expect(markupOf(rules)).toContain(LIMIT_REASON_FIRST);
  });
});

describe('F-10 technical details step: rule name and file line', () => {
  it('F-10 AC-013 the rule name is a single-line field, so Enter adds no line break (negative case)', () => {
    const name = elementsOf<FieldProps>(TextField, [block('A')]).find((f) => f.props.id === 'rule-name-0');
    expect(name?.props.multiline).toBeFalsy();
  });

  it.each([
    ['100 code points', repeat('a', 100), repeat('a', 100)],
    ['101 code points', repeat('a', 101), repeat('a', 100)],
  ])('F-10 AC-013 the rule name keeps the first 100 code points: %s', (_case, input, stored) => {
    const captured: { index?: number; patch?: unknown } = {};
    elementsOf<FieldProps>(TextField, [block('')], {
      onUpdate: (index, patch) => {
        captured.index = index;
        captured.patch = patch;
      },
    })
      .find((f) => f.props.id === 'rule-name-0')
      ?.props.onChange?.({ target: { value: input } });
    expect(captured).toEqual({ index: 0, patch: { name: stored } });
  });

  it.each([
    ['Code Style', 'code-style'],
    ['Naming & Tests!', 'naming-tests-'],
    ['  Rule  2 ', '-rule-2-'],
  ])('F-10 AC-014 the file line for %j is .claude/rules/%s.md', (name, id) => {
    expect(ruleFileName(name)).toBe(`.claude/rules/${id}.md`);
    expect(markupOf([block(name)])).toContain(`File: .claude/rules/${id}.md`);
  });

  it.each([
    ['blank', ''],
    ['spaces only', '   '],
    ['only symbols', '!!!'],
  ])('F-10 AC-015 a name that is %s shows the no-id message in place of the file name (negative case)', (_case, name) => {
    const markup = markupOf([block(name)]);
    expect(markup).toContain(NO_ID_MESSAGE);
    expect(markup).not.toContain('File: .claude/rules/');
    expect(markup).toContain(`value="${name}"`);
  });

  it.each([
    ['A', 'a'],
    ['Ab', 'ab'],
  ])('F-10 AC-016 the file line follows the name as typed: %j gives %s', (name, id) => {
    expect(markupOf([block(name)])).toContain(`File: .claude/rules/${id}.md`);
  });

  it('F-10 AC-016 an id that starts with a hyphen is shown as derived and not blocked', () => {
    const markup = markupOf([block('  Rule  2 ')]);
    expect(markup).toContain('File: .claude/rules/-rule-2-.md');
    expect(markup).not.toContain(NO_ID_MESSAGE);
  });
});

describe('F-10 technical details step: duplicates and description', () => {
  it.each([
    ['Code Style', 'code style'],
    ['Code Style', 'Code-Style'],
  ])('F-10 AC-017 %j and %j both show a duplicate message and keep their names', (first, second) => {
    const markup = markupOf([block(first), block(second)]);
    expect(markup).toContain(duplicateMessage(2));
    expect(markup).toContain(duplicateMessage(1));
    expect(markup).toContain(`value="${first}"`);
    expect(markup).toContain(`value="${second}"`);
  });

  it('F-10 AC-017 a unique id shows no duplicate message (negative case)', () => {
    const markup = markupOf([block('Code Style'), block('Testing')]);
    expect(markup).not.toContain('Same file as rule block');
  });

  it('F-10 AC-017 removing one of two duplicates clears the message on the other (negative case)', () => {
    const both = [block('Code Style'), block('code style')];
    expect(markupOf(both)).toContain(duplicateMessage(2));
    const remaining = both.filter((_, i) => i !== 1);
    const markup = markupOf(remaining);
    expect(markup).not.toContain('Same file as rule block');
    expect(markup).toContain('value="Code Style"');
  });

  it('F-10 AC-018 the description is a multi-line field, so Enter adds a line break kept in the value', () => {
    const description = elementsOf<FieldProps>(TextField, [block('A', 'x')]).find((f) => f.props.id === 'rule-description-0');
    expect(description?.props.multiline).toBe(true);
    expect(markupOf([block('A', 'x')])).toMatch(/<textarea[^>]*id="rule-description-0"/);
  });

  it.each([
    ['999 code points', repeat('a', 999), repeat('a', 999)],
    ['1,000 code points', repeat('a', 1000), repeat('a', 1000)],
    ['1,001 code points', repeat('a', 1001), repeat('a', 1000)],
    ['an emoji crossing the limit', `${repeat('a', 1000)}😀`, repeat('a', 1000)],
  ])('F-10 AC-018 the description keeps the first 1,000 code points: %s', (_case, input, stored) => {
    const captured: { patch?: unknown } = {};
    elementsOf<FieldProps>(TextField, [block('A', '')], {
      onUpdate: (_index, patch) => {
        captured.patch = patch;
      },
    })
      .find((f) => f.props.id === 'rule-description-0')
      ?.props.onChange?.({ target: { value: input } });
    expect(captured.patch).toEqual({ description: stored });
  });
});

describe('F-10 technical details step: storage', () => {
  it('F-10 AC-022 the rule list source makes no storage or console call', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wizard', 'RuleBlocks.tsx'),
      'utf8',
    );
    for (const word of ['localStorage', 'sessionStorage', 'indexedDB', 'console']) {
      expect(source.includes(word), `RuleBlocks must not use ${word}`).toBe(false);
    }
  });
});

/** Every element of the given type under a tree (used on a dialog's element tree). */
function collect<P>(node: ReactNode, type: unknown): ReactElement<P>[] {
  const found: ReactElement<P>[] = [];
  const walk = (current: ReactNode): void => {
    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }
    if (!isValidElement(current)) return;
    if (current.type === type) found.push(current as ReactElement<P>);
    walk((current.props as { children?: ReactNode }).children);
  };
  walk(node);
  return found;
}
