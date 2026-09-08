import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicKey, Transaction } from "@solana/web3.js";
import { SolanaGuardNetworkError } from "@solanaguard/sdk";
import { sampleAnalysisReport } from "./test-fixtures";

const {
  analyzeTransaction,
  buildDemoTransferTransaction,
  sendSignedTransaction,
  signTransaction,
  walletState,
} = vi.hoisted(() => ({
  analyzeTransaction: vi.fn(),
  buildDemoTransferTransaction: vi.fn(),
  sendSignedTransaction: vi.fn(),
  signTransaction: vi.fn(),
  walletState: {
    connected: false as boolean,
    publicKey: null as PublicKey | null,
  },
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({
    connection: { rpcEndpoint: "https://api.devnet.solana.com" },
  }),
  useWallet: () => ({
    publicKey: walletState.connected ? walletState.publicKey : null,
    connected: walletState.connected,
    signTransaction,
  }),
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  WalletMultiButton: () => <button type="button">Mock Wallet</button>,
}));

vi.mock("@solanaguard/sdk", async () => {
  const actual = await vi.importActual<typeof import("@solanaguard/sdk")>("@solanaguard/sdk");
  return {
    ...actual,
    createSolanaGuardClient: () => ({
      analyzeTransaction,
    }),
  };
});

vi.mock("./solana", async () => {
  const actual = await vi.importActual<typeof import("./solana")>("./solana");
  return {
    ...actual,
    buildDemoTransferTransaction,
    sendSignedTransaction,
    getApiBaseUrl: () => "http://solanaguard.test",
  };
});

import { DemoApp } from "./DemoApp";

afterEach(() => {
  cleanup();
  analyzeTransaction.mockReset();
  buildDemoTransferTransaction.mockReset();
  sendSignedTransaction.mockReset();
  signTransaction.mockReset();
  walletState.connected = false;
  walletState.publicKey = null;
});

describe("DemoApp flow", () => {
  it("starts on connect and prompts for a Devnet wallet", () => {
    render(<DemoApp />);
    expect(screen.getByText(/connect a wallet configured for Devnet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /draft transaction/i })).toBeDisabled();
  });

  it("walks connect → draft → analyze → review → sent without network or Devnet", async () => {
    const user = userEvent.setup();
    walletState.connected = true;
    walletState.publicKey = new PublicKey("11111111111111111111111111111111");
    const draftTx = new Transaction();
    buildDemoTransferTransaction.mockResolvedValue({
      transaction: draftTx,
      base64: "dGVzdC1kcmFmdA==",
    });
    analyzeTransaction.mockResolvedValue(sampleAnalysisReport());
    signTransaction.mockResolvedValue(draftTx);
    sendSignedTransaction.mockResolvedValue("Sig1111111111111111111111111111111111111111111");

    render(<DemoApp />);

    expect(screen.getByText(/Connected\. Demo transfer amount/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /draft transaction/i }));
    await waitFor(() => {
      expect(buildDemoTransferTransaction).toHaveBeenCalled();
    });
    expect(await screen.findByText(/dGVzdC1kcmFmdA==/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /analyze draft/i }));
    expect(await screen.findByText(/Score band:/i)).toBeInTheDocument();
    expect(screen.getByText(/Self-transfer observed/i)).toBeInTheDocument();

    const reviewBox = screen.getByRole("checkbox");
    expect(screen.getByRole("button", { name: /sign and send on Devnet/i })).toBeDisabled();
    await user.click(reviewBox);
    expect(screen.getByRole("button", { name: /sign and send on Devnet/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /sign and send on Devnet/i }));
    expect(await screen.findByText(/Submitted signature:/i)).toBeInTheDocument();
    expect(sendSignedTransaction).toHaveBeenCalled();
    expect(analyzeTransaction).toHaveBeenCalledWith({
      base64: "dGVzdC1kcmFmdA==",
      includeSimulation: true,
    });
  });

  it("shows analyze errors from the mocked API client", async () => {
    const user = userEvent.setup();
    walletState.connected = true;
    walletState.publicKey = new PublicKey("11111111111111111111111111111111");
    buildDemoTransferTransaction.mockResolvedValue({
      transaction: new Transaction(),
      base64: "dGVzdA==",
    });
    analyzeTransaction.mockRejectedValue(new SolanaGuardNetworkError("API unreachable"));

    render(<DemoApp />);
    await user.click(screen.getByRole("button", { name: /draft transaction/i }));
    await user.click(await screen.findByRole("button", { name: /analyze draft/i }));
    expect(await screen.findByText("API unreachable")).toBeInTheDocument();
  });
});
