/** Validate Code Connect property coverage and typecheck rendered React examples. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
const require = createRequire(import.meta.url);
const fileKey = 'yTOUYxkA0nmz0lOm58iM8M';
const schemas = JSON.parse(fs.readFileSync('docs/code-connect-properties.json', 'utf8'));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const files = [...walk('src/components'), ...walk('figma/icons')].filter((p) => p.endsWith('.figma.ts'));
const templates = files.map((file) => {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes(`/design/${fileKey}/`), `${file}: wrong Figma file`);
  assert(!source.includes('figma.connect('), `${file}: expected a parserless template`);
  if (file.startsWith('src/')) assert(source.includes('github.com/h-raymond/pickup-design-system/'), `${file}: wrong source repository`);
  return { file, source, nodeId: source.match(/node-id=([\d-]+)/)[1].replace('-', ':'),
    compiled: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText };
});
const byNode = new Map(templates.map((t) => [t.nodeId, t]));
const byName = new Map(schemas.map((s) => [s.name, s]));
const manifest = JSON.parse(fs.readFileSync('figma/heroicons-manifest.json', 'utf8'));
const iconByName = new Map(manifest.map((s) => [`heroicons-${s.set}/${s.name}`, byNode.get(s.nodeId)]));
const reads = new Map(schemas.map((s) => [s.nodeId, new Set()]));
const modules = ['@heroicons/react/24/outline', '@heroicons/react/24/solid', '@heroicons/react/20/solid', '@heroicons/react/16/solid'];
function localImport(statement) {
  const [, names, module] = statement.match(/^import \{(.+)\} from \"([^\"]+)\"/);
  const target = module === '@figma/pickup-design-system' ? 'Library' : `Hero${modules.indexOf(module)}`;
  return `const { ${names} } = ${target};`;
}
const specialText = 'A "quoted" & {braced}\nlabel <with> symbols';
let imports;

function sections(value) {
  if (value == null || value === false) return [];
  if (Array.isArray(value)) return value.flatMap(sections);
  assert.equal(typeof value, 'string', 'Template sections must not be string-coerced objects');
  return [value];
}
function code(strings, ...values) {
  return strings.flatMap((part, i) => [part, ...sections(values[i])]);
}
function evaluate(template, instance) {
  assert(template, `No template for ${instance.name}`);
  const exports = {};
  vm.runInNewContext(template.compiled, {
    exports,
    require: (name) => { assert.equal(name, 'figma'); return { selectedInstance: instance, code }; },
  }, { filename: template.file, timeout: 1000 });
  const result = exports.default;
  assert(result?.id && Array.isArray(result.example), `${template.file}: invalid template export`);
  for (const statement of result.imports ?? []) imports.add(statement);
  return result;
}
function handle(schema, values, mode, top = true) {
  const properties = Object.values(schema.properties ?? {});
  const descendants = Object.values(schema.descendants ?? {});
  function property(name, type) {
    const p = properties.find((p) => p.name === name);
    assert(p && p.type === type, `${schema.name}: ${name} must have type ${type}`);
    if (top) reads.get(schema.nodeId).add(name);
    return p;
  }
  function child(layer) {
    if (layer.type === 'TEXT') {
      const bound = properties.find((p) => p.key === layer.references?.characters);
      if (top && bound) reads.get(schema.nodeId).add(bound.name);
      return { type: 'TEXT', name: layer.name, textContent: mode.text ? specialText : layer.textContent };
    }
    const target = byName.get(layer.mainComponentName);
    const nested = handle({ ...layer, name: layer.mainComponentName }, {}, mode, false);
    nested.executeTemplate = () => evaluate(target ? byNode.get(target.nodeId) : iconByName.get(layer.mainComponentName), nested);
    return nested;
  }
  function find(name, type, nodes = descendants, traverse = false) {
    for (const layer of nodes) {
      if (layer.name === name && layer.type === type) return child(layer);
      if (traverse) {
        const found = find(name, type, Object.values(layer.descendants ?? {}), true);
        if (found.type !== 'ERROR') return found;
      }
    }
    return { type: 'ERROR' };
  }
  return {
    type: 'INSTANCE', name: schema.name,
    getString(name) {
      property(name, 'TEXT');
      return mode.text ? specialText : name;
    },
    getBoolean(name) { property(name, 'BOOLEAN'); return values[name] ?? false; },
    getEnum(name, mapping) {
      const p = property(name, 'VARIANT');
      for (const option of p.variantOptions) assert(Object.hasOwn(mapping, option), `${schema.name}.${name}: missing ${option}`);
      return mapping[values[name] ?? p.variantOptions[0]];
    },
    getSlot(name) {
      property(name, 'SLOT');
      return mode.slot ? ['<img src="/example.png" alt="Product" />', '<span>Second slot child</span>'] : undefined;
    },
    getInstanceSwap(name) {
      const p = property(name, 'INSTANCE_SWAP');
      if (mode.missing) return { type: 'ERROR' };
      const layer = descendants.find((d) => d.references?.mainComponent === p.key);
      return layer ? child(layer) : { type: 'ERROR' };
    },
    findText(name, options) { return mode.missing ? { type: 'ERROR' } : find(name, 'TEXT', descendants, options?.traverseInstances); },
    findInstance(name, options) { return mode.missing ? { type: 'ERROR' } : find(name, 'INSTANCE', descendants, options?.traverseInstances); },
  };
}

const scratch = path.join(root, '.quality/code-connect');
fs.mkdirSync(scratch, { recursive: true });
const output = [];
let cases = 0;
for (const schema of schemas) {
  let combinations = [{}];
  for (const p of Object.values(schema.properties)) {
    const options = p.type === 'VARIANT' ? p.variantOptions : p.type === 'BOOLEAN' ? [false, true] : null;
    if (options) combinations = combinations.flatMap((v) => options.map((option) => ({ ...v, [p.name]: option })));
  }
  for (const values of combinations) {
    for (const mode of [{ text: false, slot: true }, { text: true, slot: true }, { text: false, slot: false, missing: true }]) {
      imports = new Set();
      const result = evaluate(byNode.get(schema.nodeId), handle(schema, values, mode));
      const snippet = result.example.join('');
      assert(!snippet.includes('[object Object]'), `${schema.name}: string-coerced template`);
      output.push(`namespace Example${cases++} {\n${[...imports].map(localImport).join('\n')}\nconst example = (${snippet});\n}`);
    }
  }
  for (const p of Object.values(schema.properties)) assert(reads.get(schema.nodeId).has(p.name), `${schema.name}: unmapped property ${p.name}`);
}
// Validate each generated icon against the actual package exports as well.
for (const icon of manifest) {
  const template = byNode.get(icon.nodeId);
  const statement = template.source.match(/imports: \['([^']+)'\]/)[1];
  const [, component, pkg] = statement.match(/import \{ (\w+) \} from "([^"]+)"/);
  assert(component in require(pkg), `${template.file}: missing Heroicons export ${component}`);
}
const rendered = path.join(scratch, 'examples.tsx');
fs.writeFileSync(rendered, `import * as Library from '../../src/index';\n${modules.map((m, i) => `import * as Hero${i} from '${m}';`).join('\n')}\n${output.join('\n')}`);
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = { ...parsed.options, noEmit: true };
const program = ts.createProgram([rendered, ...parsed.fileNames.filter((f) => f.endsWith('.d.ts'))], options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics.slice(0, 20), { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  process.exit(1);
}
console.log(`PASS: ${schemas.length} component templates, ${cases} rendered variant/boolean/text/slot cases, ${manifest.length} icon exports, ${templates.length} target URLs.`);
