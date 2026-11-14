/** One module row as the form holds it. Every field is raw text until the configuration is built. */
export interface BriefModuleRow {
  name: string;
  layer: string;
  responsibility: string;
  /** Comma-separated module names. */
  dependsOn: string;
}

/** The brief as the form holds it, in React memory only. Text is trimmed when the configuration is built. */
export interface BriefState {
  name: string;
  idea: string;
  stack: {
    language: string;
    framework: string;
    testFramework: string;
    buildTool: string;
  };
  architecture: {
    style: string;
    modules: BriefModuleRow[];
  };
  codeRules: string[];
  testRules: string[];
  /** The "I understand, send the brief for review" checkbox. */
  privacyAccepted: boolean;
}

/** A new, empty brief. Returns a fresh object on every call, so no state is shared. */
export function emptyBrief(): BriefState {
  return {
    name: '',
    idea: '',
    stack: { language: '', framework: '', testFramework: '', buildTool: '' },
    architecture: { style: '', modules: [] },
    codeRules: [],
    testRules: [],
    privacyAccepted: false,
  };
}
