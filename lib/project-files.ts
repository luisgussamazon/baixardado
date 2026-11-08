// Regras compartilhadas pela validação do servidor e pela interface. Sem segredos.
export const PROJECT_LIMITS = {
  files: 20,
  fileBytes: 32_768,
  totalBytes: 131_072,
  outputBytes: 262_144,
  pathLength: 160,
  depth: 8,
  projects: 100,
  description: 4_000,
  outputTokens: 8_000,
} as const;

export type ProjectFile = { path: string; content: string };
export type GeneratedProject = { name: string; summary: string; files: ProjectFile[] };
export type ProjectSummary = {
  id: string; name: string; status: "generating" | "ready" | "failed"; created_at: string;
};
export type SavedProject = ProjectSummary & GeneratedProject & { description: string };

export class ProjectValidationError extends Error {}
const bytes = (value:string) => new TextEncoder().encode(value).byteLength;

export function validProjectPath(path: unknown): path is string {
  if (typeof path !== "string" || !path || path.length > PROJECT_LIMITS.pathLength) return false;
  const parts = path.split("/");
  if (parts.length > PROJECT_LIMITS.depth) return false;
  return parts.every(part => {
    const lower = part.toLowerCase();
    return /^[a-zA-Z0-9_.-]+$/.test(part) && part !== "." && part !== ".." &&
      !part.endsWith(".") && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part) &&
      ![".git", "__proto__", "prototype", "constructor"].includes(lower) &&
      !(lower.startsWith(".env") && lower !== ".env.example");
  });
}

export function validateProject(value: unknown): GeneratedProject {
  const fail = () => { throw new ProjectValidationError("O projeto recebido contém arquivos ou tamanhos inválidos. Descreva um sistema menor e tente novamente."); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const data = value as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim() || data.name.length > 80 || /[\x00-\x1f\x7f]/.test(data.name) ||
      typeof data.summary !== "string" || !data.summary.trim() || data.summary.length > 2_000 ||
      !Array.isArray(data.files) || data.files.length < 2 || data.files.length > PROJECT_LIMITS.files) return fail();
  const paths = new Set<string>();
  const files: ProjectFile[] = [];
  let total = 0;
  for (const item of data.files) {
    if (!item || typeof item !== "object" || !validProjectPath(item.path) ||
        typeof item.content !== "string" || item.content.includes("\0")) return fail();
    const path = item.path.toLowerCase();
    if (paths.has(path) || [...paths].some(other => path.startsWith(other + "/") || other.startsWith(path + "/"))) return fail();
    const size = bytes(item.content);
    if (size > PROJECT_LIMITS.fileBytes) return fail();
    total += size;
    if (total > PROJECT_LIMITS.totalBytes) return fail();
    paths.add(path);
    files.push({path:item.path,content:item.content});
  }
  return {name:data.name.trim(),summary:data.summary.trim(),files};
}

export const projectOutputSchema = {
  type: "object", additionalProperties: false,
  required: ["name", "summary", "files"],
  properties: {
    name: {type:"string"}, summary: {type:"string"},
    files: {type:"array",items:{
      type:"object",additionalProperties:false,required:["path","content"],
      properties:{path:{type:"string"},content:{type:"string"}},
    }},
  },
};
