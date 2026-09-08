import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AnalysisReportView } from "./AnalysisReportView";
import { sampleAnalysisReport } from "../test/fixtures";

afterEach(() => {
  cleanup();
});

describe("AnalysisReportView", () => {
  it("renders score band, findings, simulation, and instructions", () => {
    render(<AnalysisReportView report={sampleAnalysisReport()} />);

    expect(screen.getByText("Informational")).toBeInTheDocument();
    expect(screen.getByText("5/100")).toBeInTheDocument();
    expect(screen.getByText("Self-transfer observed")).toBeInTheDocument();
    expect(screen.getByText(/success:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/System Program/).length).toBeGreaterThan(0);
    expect(screen.getByText("Raw report JSON")).toBeInTheDocument();
  });

  it("shows empty findings and skipped simulation/comparison states", () => {
    render(
      <AnalysisReportView
        report={sampleAnalysisReport({
          evaluation: {
            findings: [],
            rulesEvaluated: 0,
            rulesFired: 0,
            note: "empty",
          },
          simulation: null,
          comparison: null,
        })}
      />,
    );

    expect(screen.getByText(/empty findings are not a pass/i)).toBeInTheDocument();
    expect(screen.getAllByText("Not run.")).toHaveLength(2);
  });
});
