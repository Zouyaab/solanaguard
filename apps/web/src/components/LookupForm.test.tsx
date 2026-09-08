import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LookupForm } from "./LookupForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("LookupForm", () => {
  it("does not navigate on empty submit", async () => {
    const user = userEvent.setup();
    render(<LookupForm kind="account" label="Account" placeholder="Paste address…" />);
    await user.click(screen.getByRole("button", { name: /look up/i }));
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to the encoded resource path", async () => {
    const user = userEvent.setup();
    render(<LookupForm kind="transaction" label="Transaction" placeholder="Paste signature…" />);
    await user.type(screen.getByPlaceholderText(/paste signature/i), " abc/def ");
    await user.click(screen.getByRole("button", { name: /look up/i }));
    expect(push).toHaveBeenCalledWith("/transaction/abc%2Fdef");
  });
});
