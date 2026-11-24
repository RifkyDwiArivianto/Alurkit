import { useUiStore } from "@/stores/ui-store";
import { useExecutionStore } from "./execution-store";
import { MAX_FILE_BYTES, parseWorkflowJson, stringifyWorkflow } from "./serialize";
import { useWorkflowStore } from "./store";


function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "workflow"
  );
}

export function exportWorkflow() {
  const { name, nodes, edges } = useWorkflowStore.getState();
  const blob = new Blob([stringifyWorkflow({ name, nodes, edges }, true)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(name)}.alurkit.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  useUiStore.getState().notify("success", `Workflow diekspor sebagai ${a.download}`);
}

export async function importWorkflowFile(file: File) {
  const { notify } = useUiStore.getState();
  const exec = useExecutionStore.getState();
  if (exec.status === "running") return notify("error", "Hentikan eksekusi sebelum mengimpor workflow.");
  if (file.size > MAX_FILE_BYTES) return notify("error", "File terlalu besar (maksimum 1 MB).");

  let text: string;
  try {
    text = await file.text();
  } catch {
    return notify("error", "File tidak dapat dibaca.");
  }

  const result = parseWorkflowJson(text);
  if (!result.ok) return notify("error", `Import gagal. ${result.error}`);

  useWorkflowStore.getState().replaceWorkflow(result.workflow, { history: true });
  exec.clear();
  useUiStore.getState().requestFit();
  notify("success", `“${result.workflow.name}” diimpor (${result.workflow.nodes.length} node). Ctrl+Z untuk membatalkan.`);
}

