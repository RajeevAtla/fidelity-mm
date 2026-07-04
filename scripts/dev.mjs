import { spawn, spawnSync } from "node:child_process";

const tailwindArgs = ["tailwindcss", "-i", "./styles.css", "-o", "./tailwind.generated.css"];

const initial = spawnSync("bunx", tailwindArgs, { stdio: "inherit", shell: true });
if (initial.status !== 0) {
  process.exit(initial.status ?? 1);
}

const tailwindWatch = spawn("bunx", [...tailwindArgs, "--watch"], {
  stdio: "inherit",
  shell: true,
});
const farm = spawn("bunx", ["--bun", "farm", "start", "--port", "9001"], {
  stdio: "inherit",
  shell: true,
});

const shutdown = () => {
  tailwindWatch.kill();
  farm.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
farm.on("exit", (code) => {
  tailwindWatch.kill();
  process.exit(code ?? 0);
});
