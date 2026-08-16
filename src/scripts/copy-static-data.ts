import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { DATA_PATHS } from "../data/data-sources";

const outputDirectory = join("public", "data");

export async function copyStaticData(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });

  await Promise.all(
    Object.values(DATA_PATHS).map((sourcePath) =>
      Bun.write(join(outputDirectory, basename(sourcePath)), Bun.file(sourcePath)),
    ),
  );
}

if (import.meta.main) {
  await copyStaticData();
}
