import { calculateFiveCardProbabilitiesExact } from "./fiveCardProbability.js";

let activeController = null;

self.addEventListener("message", async (event) => {
  const message = event.data ?? {};

  if (message.type === "cancel") {
    activeController?.abort();
    return;
  }

  if (message.type !== "calculate") return;

  activeController?.abort();
  activeController = new AbortController();

  try {
    const result = await calculateFiveCardProbabilitiesExact(message.settings ?? {}, {
      signal: activeController.signal,
      batchSize: message.batchSize ?? 5000,
      onProgress(progress) {
        self.postMessage({ type: "progress", calculationId: message.calculationId, progress });
      },
    });
    self.postMessage({ type: "result", calculationId: message.calculationId, result });
  } catch (error) {
    self.postMessage({
      type: error?.name === "AbortError" ? "cancelled" : "error",
      calculationId: message.calculationId,
      error: {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
      },
    });
  } finally {
    activeController = null;
  }
});
