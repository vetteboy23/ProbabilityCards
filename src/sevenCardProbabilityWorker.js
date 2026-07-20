import { calculateHoldemProbabilitiesExact } from "./sevenCardProbability.js";

self.addEventListener("message", (event) => {
  const { id, settings } = event.data ?? {};
  try {
    const result = calculateHoldemProbabilitiesExact(settings, {
      onAttendanceProgress(progress) {
        self.postMessage({ id, type: "progress", phase: "attendance", progress });
      },
    });
    self.postMessage({ id, type: "result", result });
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      error: {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
      },
    });
  }
});
