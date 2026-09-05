// Metro configuration for the JobOps mobile app inside the npm-workspaces monorepo.
// It teaches Metro to (a) watch the repo root so changes to the shared package are
// picked up, and (b) resolve modules from both the app's and the root's node_modules
// (workspace hoisting can place dependencies in either place).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so the `shared` workspace hot-reloads.
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Do not let Metro walk up past the workspace root looking for modules.
config.resolver.disableHierarchicalLookup = true;

// The `shared` package ships raw .ts source; babel-preset-expo transpiles it.
config.resolver.sourceExts = [...config.resolver.sourceExts, "ts", "tsx"];

module.exports = config;
