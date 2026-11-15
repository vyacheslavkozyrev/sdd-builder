# {{flowName}}

## Purpose

{{description}}

Run the steps of the flow `{{flowId}}` in order. Each step names the file it calls; a step that routes back returns to the block it names and runs again from there, within the limit the Rules section states.

## Steps

{{stepList}}

## Rules

Rule-set tags for this flow: {{ruleTags}}. Follow the rules of each tag in `.claude/rules/`.

{{routeRules}}
