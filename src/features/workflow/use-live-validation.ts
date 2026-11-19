import { useEffect } from "react";
import { validateWorkflow } from "./engine/validate";
import { useExecutionStore } from "./execution-store";
import { useWorkflowStore } from "./store";

/** Menjaga `issues` di execution store tetap sinkron dengan workflow (dengan debounce). */
export function useLiveValidation() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const compute = () => {
      const { nodes, edges } = useWorkflowStore.getState();
      useExecutionStore.setState({ issues: nodes.length === 0 ? [] : validateWorkflow(nodes, edges) });
    };
    compute();
    const unsubscribe = useWorkflowStore.subscribe((s, prev) => {
      if (s.nodes === prev.nodes && s.edges === prev.edges) return;
      clearTimeout(timer);
      timer = setTimeout(compute, 150);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}
