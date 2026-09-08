import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { SolanaGuardNotFoundError } from "@solanaguard/sdk";
import { ResourceLookup } from "./ResourceLookup";

const getAccount = vi.fn();
const getProgram = vi.fn();
const getTransaction = vi.fn();

vi.mock("@/lib/api", () => ({
  createWebClient: () => ({
    getAccount,
    getProgram,
    getTransaction,
  }),
}));

afterEach(() => {
  cleanup();
  getAccount.mockReset();
  getProgram.mockReset();
  getTransaction.mockReset();
});

describe("ResourceLookup", () => {
  it("shows loading then account data", async () => {
    getAccount.mockResolvedValue({
      found: true,
      address: "11111111111111111111111111111111",
      note: "Account lookup note",
    });

    render(<ResourceLookup kind="account" id="11111111111111111111111111111111" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("Account lookup note")).toBeInTheDocument();
    expect(screen.getByText("Response")).toBeInTheDocument();
  });

  it("shows not-found errors without calling a live API", async () => {
    getTransaction.mockRejectedValue(
      new SolanaGuardNotFoundError(
        "No transaction found for this signature.",
        404,
        { found: false, message: "No transaction found for this signature." },
        "/transaction",
      ),
    );

    render(<ResourceLookup kind="transaction" id="missing-sig" />);
    expect(await screen.findByText(/no transaction found/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    });
  });

  it("loads program lookups", async () => {
    getProgram.mockResolvedValue({
      found: true,
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      note: "Program note",
    });

    render(<ResourceLookup kind="program" id="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" />);
    expect(await screen.findByText("Program note")).toBeInTheDocument();
    expect(getProgram).toHaveBeenCalledWith("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });
});
