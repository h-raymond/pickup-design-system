#!/usr/bin/env node
/**
 * Pickup quality audit: measures a UI codebase against docs/QUALITY_BAR.md.
 *
 * It reports four bars, each pass/fail, with every violation listed by file:line.
 *   1. Foundations: 100% of foundational CSS values (color, type, spacing, radius, shadow) come from tokens.
 *   2. Design-system adoption: at least 75% of interface elements are design-system components.
 *   3. Documentation: 100% of exported functions and components carry a JSDoc comment.
 *   4. Clean code: no `any`, no console.*, no file over 300 lines, no unowned TODOs.
 *
 * Usage:
 *   node scripts/quality/audit.mjs [--scope app/src] [--json out.json] [--md out.md]
 *
 * Exit code: 0 when every bar passes, 1 otherwise, so CI and agent loops can gate on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// ---------- Config: the numbers are owned by docs/QUALITY_BAR.md; change both together. ----------
const BAR = {
  tokenCoverage: 1.0,
  dsCoverage: 0.75,
  docCoverage: 1.0,
  maxFileLines: 300,
};
const DS_PACKAGE = '@figma/pickup-design-system';
/** Non-visual helpers exported by the design system: not counted as interface elements. */
const DS_NON_ELEMENTS = new Set(['cx']);
/** Host elements that have a design-system equivalent (or should be wrapped in one). */
const RAW_INTERFACE_ELEMENTS = new Set(['button', 'input', 'select', 'textarea', 'a', 'dialog', 'progress', 'meter', 'details', 'summary']);
/** CSS properties whose values must come from tokens. Layout geometry (width, top, …) is not foundational. */
const FOUNDATIONAL = /^(color|background(-color)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|font(-family|-size|-weight)?|line-height|letter-spacing|border(-[a-z]+)?-radius|gap|row-gap|column-gap|padding(-[a-z]+)?|margin(-[a-z]+)?)$/;
const EXEMPT_MARKER = /token-exempt:\s*\S+/;

// ---------- CLI ----------
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const root = process.cwd();
const scope = path.resolve(root, args.scope ?? 'app/src');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(p);
    return [p];
  });
const files = walk(scope);
const rel = (p) => path.relative(root, p);
const isTestOrMeta = (p) => /\.(stories|figma|test|spec)\.tsx?$|\.d\.ts$/.test(p);
const cssFiles = files.filter((f) => f.endsWith('.css'));
const codeFiles = files.filter((f) => /\.tsx?$/.test(f) && !isTestOrMeta(f));

// ---------- 1. Foundations: token coverage ----------
/** Remove balanced `fn(...)` groups whose name matches `name`, so token references don't count as raw values. */
function stripFn(value, name, onlyIfContains) {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const head = value.slice(i, i + name.length + 1);
    if (head === `${name}(`) {
      let depth = 0;
      let j = i + name.length;
      for (; j < value.length; j++) {
        if (value[j] === '(') depth++;
        else if (value[j] === ')' && --depth === 0) break;
      }
      const group = value.slice(i, j + 1);
      if (!onlyIfContains || group.includes(onlyIfContains)) {
        out += ' TOKEN ';
        i = j;
        continue;
      }
    }
    out += value[i];
  }
  return out;
}

/** Returns the raw (non-token) literals in a foundational value, or [] when it is fully tokenized. */
function rawLiterals(value) {
  let v = stripFn(value, 'var');
  v = stripFn(v, 'calc', 'TOKEN');
  const raw = [];
  for (const m of v.matchAll(/#[0-9a-f]{3,8}\b|(rgba?|hsla?|oklch|lab)\([^)]*\)/gi)) raw.push(m[0]);
  for (const m of v.matchAll(/(?<![\w-])-?\d*\.?\d+(px|rem|em)\b/g)) if (!/^(0|1)px$/.test(m[0])) raw.push(m[0]);
  for (const m of v.matchAll(/["'][^"']+["']/g)) raw.push(m[0]);
  return raw;
}

const tokenFindings = [];
let foundationalCount = 0;
for (const file of cssFiles) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inComment = false;
  lines.forEach((line, idx) => {
    // Track block comments so commented-out CSS isn't audited.
    const code = line.replace(/\/\*.*?\*\//g, (c) => (EXEMPT_MARKER.test(c) ? c : ''));
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      return;
    }
    if (code.includes('/*') && !code.includes('*/')) inComment = true;
    for (const m of code.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)(?=;|}|$)/g)) {
      const [, prop, value] = m;
      if (!FOUNDATIONAL.test(prop) || prop.startsWith('--')) continue;
      foundationalCount++;
      const raw = rawLiterals(value);
      if (raw.length && !EXEMPT_MARKER.test(line)) {
        tokenFindings.push({ file: rel(file), line: idx + 1, prop, value: value.trim(), raw });
      }
    }
  });
}

// ---------- 2–4: TS/TSX analysis ----------
const dsFindings = [];
const dsUsage = new Map();
let dsCount = 0;
let rawCount = 0;
const docFindings = [];
let exportedCount = 0;
const cleanFindings = [];
const inlineStyleFindings = [];

for (const file of codeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  // Names imported from the design system (aliases included).
  const dsNames = new Set();
  sf.statements.forEach((s) => {
    if (ts.isImportDeclaration(s) && s.moduleSpecifier.text === DS_PACKAGE && s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings)) {
      s.importClause.namedBindings.elements.forEach((e) => {
        if (!DS_NON_ELEMENTS.has((e.propertyName ?? e.name).text)) dsNames.add(e.name.text);
      });
    }
  });

  const hasJsDoc = (node) => (ts.getJSDocCommentsAndTags(node).length > 0);

  const visit = (node) => {
    // Interface elements.
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const base = tag.split('.')[0];
      if (dsNames.has(base)) {
        dsCount++;
        dsUsage.set(base, (dsUsage.get(base) ?? 0) + 1);
      } else if (RAW_INTERFACE_ELEMENTS.has(tag)) {
        rawCount++;
        dsFindings.push({ file: rel(file), line: lineOf(node), element: `<${tag}>` });
      }
      // Inline style objects (advisory): foundational literals inside style={{ }}.
      node.attributes.properties.forEach((attr) => {
        if (ts.isJsxAttribute(attr) && attr.name.getText(sf) === 'style' && attr.initializer && ts.isJsxExpression(attr.initializer)) {
          const expr = attr.initializer.expression;
          if (expr && ts.isObjectLiteralExpression(expr)) {
            expr.properties.forEach((p) => {
              if (!ts.isPropertyAssignment(p)) return;
              const prop = p.name.getText(sf).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
              if (FOUNDATIONAL.test(prop) && (ts.isStringLiteral(p.initializer) || ts.isNumericLiteral(p.initializer))) {
                const value = p.initializer.getText(sf);
                const raw = ts.isNumericLiteral(p.initializer) ? [`${value}px`] : rawLiterals(p.initializer.text);
                if (raw.length) tokenFindings.push({ file: rel(file), line: lineOf(p), prop, value, raw, inline: true });
                foundationalCount++;
              }
            });
          }
        }
      });
    }

    // Exported declarations need a JSDoc comment.
    const isExported = (n) => ts.canHaveModifiers(n) && ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && isExported(node) && node.name) {
      exportedCount++;
      if (!hasJsDoc(node)) docFindings.push({ file: rel(file), line: lineOf(node), name: node.name.text });
    }
    if (ts.isVariableStatement(node) && isExported(node)) {
      node.declarationList.declarations.forEach((d) => {
        const init = d.initializer;
        const isCallable = init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init) || ts.isCallExpression(init));
        if (!isCallable) return; // plain data exports (arrays, configs) don't need a doc block
        exportedCount++;
        if (!hasJsDoc(node)) docFindings.push({ file: rel(file), line: lineOf(node), name: d.name.getText(sf) });
      });
    }

    // Clean code: `any`.
    if (node.kind === ts.SyntaxKind.AnyKeyword) cleanFindings.push({ file: rel(file), line: lineOf(node), rule: 'no-any', detail: 'uses `any`' });
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // Clean code: line-based rules.
  const lines = text.split('\n');
  if (lines.length > BAR.maxFileLines) cleanFindings.push({ file: rel(file), line: 1, rule: 'max-lines', detail: `${lines.length} lines (max ${BAR.maxFileLines}); split by responsibility` });
  lines.forEach((l, i) => {
    if (/\bconsole\.(log|debug|info|warn|error)\(/.test(l)) cleanFindings.push({ file: rel(file), line: i + 1, rule: 'no-console', detail: l.trim() });
    if (/\b(TODO|FIXME|HACK)\b(?!\s*\()/.test(l)) cleanFindings.push({ file: rel(file), line: i + 1, rule: 'owned-todo', detail: 'TODO without (owner): write TODO(name): …' });
    if (/eslint-disable/.test(l)) cleanFindings.push({ file: rel(file), line: i + 1, rule: 'lint-suppression', detail: 'explain why next to the suppression, or remove it', advisory: true });
  });
  for (const m of text.matchAll(/style=\{\{/g)) {
    const line = text.slice(0, m.index).split('\n').length;
    inlineStyleFindings.push({ file: rel(file), line });
  }
}

// ---------- Scores ----------
const pct = (n) => `${(n * 100).toFixed(1)}%`;
const tokenCoverage = foundationalCount ? 1 - tokenFindings.length / foundationalCount : 1;
const dsCoverage = dsCount + rawCount ? dsCount / (dsCount + rawCount) : 1;
const docCoverage = exportedCount ? 1 - docFindings.length / exportedCount : 1;
const blockingClean = cleanFindings.filter((f) => !f.advisory);

const bars = [
  { id: 'foundations', label: 'Foundations (design tokens)', value: tokenCoverage, target: BAR.tokenCoverage, detail: `${foundationalCount - tokenFindings.length}/${foundationalCount} foundational values use tokens` },
  { id: 'ds-adoption', label: 'Design-system components', value: dsCoverage, target: BAR.dsCoverage, detail: `${dsCount} DS elements, ${rawCount} raw interface elements` },
  { id: 'documentation', label: 'Documented exports', value: docCoverage, target: BAR.docCoverage, detail: `${exportedCount - docFindings.length}/${exportedCount} exported functions/components have JSDoc` },
  { id: 'clean-code', label: 'Clean code rules', value: blockingClean.length === 0 ? 1 : 0, target: 1, detail: `${blockingClean.length} blocking findings`, binary: true },
].map((b) => ({ ...b, pass: b.value >= b.target }));

const result = {
  scope: rel(scope),
  generatedAt: new Date().toISOString(),
  pass: bars.every((b) => b.pass),
  bars,
  dsUsage: Object.fromEntries([...dsUsage].sort((a, b) => b[1] - a[1])),
  findings: { tokens: tokenFindings, rawElements: dsFindings, undocumented: docFindings, clean: cleanFindings, inlineStyles: inlineStyleFindings },
};

// ---------- Output ----------
const md = [];
md.push(`## Quality audit: \`${result.scope}\``);
md.push('');
md.push('| Bar | Result | Target | Status | Detail |');
md.push('| --- | --- | --- | --- | --- |');
bars.forEach((b) => md.push(`| ${b.label} | ${b.binary ? (b.pass ? 'clean' : 'issues') : pct(b.value)} | ${b.binary ? 'clean' : `≥ ${pct(b.target)}`} | ${b.pass ? 'PASS' : 'FAIL'} | ${b.detail} |`));
md.push('');
const section = (title, list, fmt, limit = 40) => {
  if (!list.length) return;
  md.push(`### ${title} (${list.length})`);
  list.slice(0, limit).forEach((f) => md.push(`- ${fmt(f)}`));
  if (list.length > limit) md.push(`- … ${list.length - limit} more (see JSON output)`);
  md.push('');
};
section('Raw values that should be tokens', tokenFindings, (f) => `\`${f.file}:${f.line}\` ${f.prop}: \`${f.value}\` → raw ${f.raw.map((r) => `\`${r}\``).join(', ')}${f.inline ? ' (inline style)' : ''}`);
section('Raw interface elements (use or extend a DS component)', dsFindings, (f) => `\`${f.file}:${f.line}\` ${f.element}`);
section('Exports without JSDoc', docFindings, (f) => `\`${f.file}:${f.line}\` ${f.name}`);
section('Clean-code findings', cleanFindings, (f) => `\`${f.file}:${f.line}\` [${f.rule}${f.advisory ? ', advisory' : ''}] ${f.detail}`);
section('Inline style objects (advisory: prefer a class)', inlineStyleFindings, (f) => `\`${f.file}:${f.line}\``, 15);
md.push(`**Overall: ${result.pass ? 'PASS' : 'FAIL'}**`);

if (args.json) fs.writeFileSync(path.resolve(root, args.json), JSON.stringify(result, null, 2));
if (args.md) fs.writeFileSync(path.resolve(root, args.md), md.join('\n') + '\n');
console.log(md.join('\n'));
process.exit(result.pass ? 0 : 1);
