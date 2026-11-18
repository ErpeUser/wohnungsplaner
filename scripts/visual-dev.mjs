// Use the local development server without junctions or a source-tree node_modules.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ensureDependencies, dependencyRoot } from './workspace-setup.mjs';

ensureDependencies();
process.env.PLANNER_REVIEW_DEV = '1';
process.env.PLANNER_REVIEW_ENABLED = '1';
const cli = path.join(dependencyRoot, 'vinext', 'dist', 'cli.js');
process.argv.splice(1, Infinity, cli, 'dev', '--host', '127.0.0.1', '--port', '3001', '--strictPort');
await import(pathToFileURL(cli).href);
