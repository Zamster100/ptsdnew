// pm2 example: pm2 start ecosystem.config.cjs
// Run ONE instance only (rounds, timers and chat limits live in memory).
module.exports = { apps: [{
  name: "ptsd-crash",
  script: "src/server.js",
  node_args: "--env-file=.env",
  instances: 1,
  exec_mode: "fork",
}] };
