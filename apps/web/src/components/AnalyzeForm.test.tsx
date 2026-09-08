import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SolanaGuardApiError, SolanaGuardNetworkError } from "@solanaguard/sdk";
import { AnalyzeForm } from "./AnalyzeForm";
import { sampleAnalysisReport } from "../test/fixtures";

const analyzeTransaction = vi.fn();

vi.mock("@/lib/api", () => ({
  createWebClient: () => ({
    analyzeTransaction,
  }),
}));

afterEach(() => {
  cleanup();
  analyzeTransaction.mockReset();
});

describe("AnalyzeForm", () => {
  it("renders the initial analyze form", () => {
    render(<AnalyzeForm />);
    expect(screen.getByRole("button", { name: /analyze transaction/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste base64/i)).toBeInTheDocument();
  });

  it("shows a validation error when submitted empty", async () => {
    const user = userEvent.setup();
    render(<AnalyzeForm />);
    await user.click(screen.getByRole("button", { name: /analyze transaction/i }));
    expect(await screen.findByText(/paste a base64 transaction/i)).toBeInTheDocument();
    expect(analyzeTransaction).not.toHaveBeenCalled();
  });

  it("shows loading then renders a successful analysis report", async () => {
    const user = userEvent.setup();
    let resolveAnalyze: (value: unknown) => void = () => undefined;
    analyzeTransaction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalyze = resolve;
        }),
    );

    render(<AnalyzeForm />);
    await user.type(screen.getByPlaceholderText(/paste base64/i), "dGVzdA==");
    await user.click(screen.getByRole("button", { name: /analyze transaction/i }));

    expect(screen.getByRole("button", { name: /analyzing/i })).toBeDisabled();

    resolveAnalyze(sampleAnalysisReport());
    expect(await screen.findByText("Informational")).toBeInTheDocument();
    expect(screen.getByText("Self-transfer observed")).toBeInTheDocument();
    expect(analyzeTransaction).toHaveBeenCalledWith({
      base64: "dGVzdA==",
      includeSimulation: true,
    });
  });

  it("analyzes by signature mode", async () => {
    const user = userEvent.setup();
    analyzeTransaction.mockResolvedValue(sampleAnalysisReport());

    render(<AnalyzeForm />);
    await user.click(screen.getByRole("button", { name: /^signature$/i }));
    await user.type(screen.getByPlaceholderText(/paste signature/i), "sig123");
    await user.click(screen.getByRole("button", { name: /analyze transaction/i }));

    await waitFor(() => {
      expect(analyzeTransaction).toHaveBeenCalledWith({
        signature: "sig123",
        includeSimulation: true,
      });
    });
    expect(await screen.findByText("Informational")).toBeInTheDocument();
  });

  it("surfaces API and network failures", async () => {
    const user = userEvent.setup();
    analyzeTransaction.mockRejectedValueOnce(
      new SolanaGuardApiError(
        "API down",
        503,
        { error: "internal", message: "API down" },
        "/analyze",
      ),
    );
    render(<AnalyzeForm />);
    await user.type(screen.getByPlaceholderText(/paste base64/i), "dGVzdA==");
    await user.click(screen.getByRole("button", { name: /analyze transaction/i }));
    expect(await screen.findByText("API down")).toBeInTheDocument();

    analyzeTransaction.mockRejectedValueOnce(new SolanaGuardNetworkError("offline"));
    await user.click(screen.getByRole("button", { name: /analyze transaction/i }));
    expect(await screen.findByText("offline")).toBeInTheDocument();
  });
});
