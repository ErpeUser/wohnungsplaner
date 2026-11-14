// Use the Node dev runtime for local filesystem references; workerd has its own filesystem.
process.env.PLANNER_REVIEW_DEV = '1';
process.env.PLANNER_REVIEW_ENABLED = '1';
process.argv.splice(1, Infinity, 'node_modules/vinext/dist/cli.js', 'dev', '--host', '127.0.0.1', '--port', '3001', '--strictPort');
await import('../node_modules/vinext/dist/cli.js');
