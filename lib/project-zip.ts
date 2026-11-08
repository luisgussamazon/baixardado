import { zipSync, strToU8 } from "fflate";
import { validateProject } from "@/lib/project-files";

// Somente bytes em memória: nenhum arquivo gerado é escrito ou executado no servidor.
export function projectZip(project: unknown): Uint8Array {
  const valid = validateProject(project);
  const entries: Record<string, Uint8Array> = Object.create(null);
  for (const file of valid.files) entries[file.path] = strToU8(file.content);
  return zipSync(entries, {level:6});
}
