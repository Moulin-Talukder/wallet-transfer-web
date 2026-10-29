import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransferForm, type SendTransfer } from "@/components/transfer-form";
import type { CreateTransferResult } from "@/lib/actions/transfers";
import type { Transfer } from "@/lib/api/types";
import { createIdempotencyKeyStore } from "@/lib/idempotency";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const TRANSFER: Transfer = {
  reference: "01a181c8-5409-70bf-b3f4-1d332cf62b1d",
  amount: 150050,
  currency: "BDT",
  status: "completed",
  direction: "out",
  created_at: "2026-10-28T09:12:32.000000Z",
};

const success: CreateTransferResult = { ok: true, transfer: TRANSFER, replayed: false };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setup(sendTransfer: SendTransfer, balance = 1_000_000) {
  let n = 0;
  const keyStore = createIdempotencyKeyStore(() => `key-${++n}`);
  const user = userEvent.setup();
  render(<TransferForm sendTransfer={sendTransfer} balance={balance} keyStore={keyStore} />);
  return { user };
}

async function fillAndReview(user: ReturnType<typeof userEvent.setup>, email = "bob@example.com", amount = "1,500.50") {
  await user.clear(screen.getByLabelText("Receiver's email"));
  await user.type(screen.getByLabelText("Receiver's email"), email);
  await user.clear(screen.getByLabelText("Amount (BDT)"));
  await user.type(screen.getByLabelText("Amount (BDT)"), amount);
  await user.click(screen.getByRole("button", { name: "Review transfer" }));
}

beforeEach(() => {
  replace.mockReset();
});

describe("TransferForm validation", () => {
  it("shows field errors and does not call the API for an empty form", async () => {
    const sendTransfer = vi.fn<SendTransfer>();
    const { user } = setup(sendTransfer);

    await user.click(screen.getByRole("button", { name: "Review transfer" }));

    expect(await screen.findByText("Enter the receiver's email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount.")).toBeInTheDocument();
    expect(screen.getByLabelText("Receiver's email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Receiver's email")).toHaveFocus();
    expect(sendTransfer).not.toHaveBeenCalled();
  });

  it.each([
    ["1.234", "Use at most 2 decimal places."],
    ["0.50", "Amount must be between ৳1.00 and ৳50,000.00."],
    ["50000.01", "Amount must be between ৳1.00 and ৳50,000.00."],
    ["12abc", "Enter a number, for example 1500 or 1,500.50."],
  ])("rejects amount %j", async (amount, message) => {
    const { user } = setup(vi.fn<SendTransfer>());

    await fillAndReview(user, "bob@example.com", amount);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Amount (BDT)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Amount (BDT)")).toHaveAccessibleDescription(expect.stringContaining(message));
  });

  it("rejects an invalid email", async () => {
    const { user } = setup(vi.fn<SendTransfer>());
    await fillAndReview(user, "bob@", "10");
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("shows a review step with the amount in BDT before sending anything", async () => {
    const sendTransfer = vi.fn<SendTransfer>();
    const { user } = setup(sendTransfer, 1_000_000);

    await fillAndReview(user);

    expect(await screen.findByRole("heading", { name: "Review transfer" })).toHaveFocus();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("৳1,500.50")).toBeInTheDocument();
    expect(screen.getByText("৳8,499.50")).toBeInTheDocument(); // balance after
    expect(sendTransfer).not.toHaveBeenCalled();
  });
});

describe("TransferForm submitting", () => {
  it("disables both buttons while the transfer is in flight and ignores extra clicks", async () => {
    const pending = deferred<CreateTransferResult>();
    const sendTransfer = vi.fn<SendTransfer>(() => pending.promise);
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    // Always settle the action: React entangles pending async transitions, so one left
    // hanging by a failed assertion would keep later tests stuck in "Sending…".
    try {
      const send = screen.getByRole("button", { name: "Send ৳1,500.50" });
      await user.click(send);
      await user.click(send);
      await user.dblClick(send);

      const sending = screen.getByRole("button", { name: "Sending…" });
      expect(sending).toBeDisabled();
      expect(sending).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("button", { name: "Edit details" })).toBeDisabled();
      expect(sendTransfer).toHaveBeenCalledTimes(1);
    } finally {
      pending.resolve(success);
    }
    expect(await screen.findByRole("heading", { name: "Transfer sent" })).toBeInTheDocument();
  });

  it("sends the validated values with a UUID-shaped key and shows the reference on success", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue(success);
    const { user } = setup(sendTransfer);
    await fillAndReview(user, "  bob@example.com ");

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    expect(sendTransfer).toHaveBeenCalledWith({ receiverEmail: "bob@example.com", amount: "1,500.50" }, "key-1");
    expect(await screen.findByRole("heading", { name: "Transfer sent" })).toHaveFocus();
    expect(screen.getByTestId("transfer-reference")).toHaveTextContent(TRANSFER.reference);
    expect(screen.queryByText(/already gone through/)).not.toBeInTheDocument();
  });

  it("tells the user when the API replayed an earlier transfer", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue({ ...success, replayed: true });
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    expect(await screen.findByText(/already gone through, so it was not sent again/)).toBeInTheDocument();
  });
});

describe("TransferForm errors", () => {
  it.each([
    ["INSUFFICIENT_BALANCE", "Insufficient balance", /balance is too low/],
    ["SAME_WALLET", "That's your own wallet", /can't send money to yourself/],
    ["RECEIVER_UNAVAILABLE", "Receiver can't accept money", /can't receive transfers/],
    ["SENDER_FROZEN", "Your wallet is frozen", /disabled on your wallet/],
  ] as const)("shows %s as an alert on the review step", async (code, title, text) => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue({
      ok: false,
      error: { kind: "business", code, message: "raw" },
    });
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(title);
    expect(alert).toHaveTextContent(text);
    expect(screen.getByRole("button", { name: "Send ৳1,500.50" })).toBeEnabled();
  });

  it("shows a 429 with the wait time and offers a retry", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue({
      ok: false,
      error: { kind: "rate_limited", retryAfterSeconds: 42 },
    });
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait 42 seconds and try again.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("puts server validation errors back on the form fields", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue({
      ok: false,
      error: {
        kind: "validation",
        message: "You cannot transfer money to yourself.",
        fieldErrors: { receiver_email: ["You cannot transfer money to yourself."] },
      },
    });
    const { user } = setup(sendTransfer);
    await fillAndReview(user, "alice@example.com");

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    expect(await screen.findByText("You cannot transfer money to yourself.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Receiver's email")).toHaveFocus());
  });

  it("treats a thrown action as an unknown outcome that is safe to retry", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockRejectedValue(new TypeError("Failed to fetch"));
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/won't be charged twice/);
  });

  it("sends the user to /login when the session expired", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue({ ok: false, error: { kind: "unauthenticated" } });
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?expired=1"));
  });
});

describe("TransferForm idempotency", () => {
  it("retries with the same Idempotency-Key after a network failure", async () => {
    const sendTransfer = vi
      .fn<SendTransfer>()
      .mockResolvedValueOnce({ ok: false, error: { kind: "network" } })
      .mockResolvedValueOnce({ ok: false, error: { kind: "rate_limited", retryAfterSeconds: 1 } })
      .mockResolvedValueOnce(success);
    const { user } = setup(sendTransfer);
    await fillAndReview(user);

    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByText(/Please wait 1 second/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Transfer sent" });

    expect(sendTransfer.mock.calls.map(([, key]) => key)).toEqual(["key-1", "key-1", "key-1"]);
  });

  it("keeps the key when the user goes back without changing anything", async () => {
    const sendTransfer = vi
      .fn<SendTransfer>()
      .mockResolvedValueOnce({ ok: false, error: { kind: "server", status: 500 } })
      .mockResolvedValueOnce(success);
    const { user } = setup(sendTransfer);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Edit details" }));
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));
    await screen.findByRole("heading", { name: "Transfer sent" });

    expect(sendTransfer.mock.calls.map(([, key]) => key)).toEqual(["key-1", "key-1"]);
  });

  it("uses a new key when the user changes the amount after a failure", async () => {
    const sendTransfer = vi
      .fn<SendTransfer>()
      .mockResolvedValueOnce({ ok: false, error: { kind: "business", code: "INSUFFICIENT_BALANCE", message: "" } })
      .mockResolvedValueOnce(success);
    const { user } = setup(sendTransfer);
    await fillAndReview(user, "bob@example.com", "40000");
    await user.click(screen.getByRole("button", { name: "Send ৳40,000.00" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Edit details" }));
    await fillAndReview(user, "bob@example.com", "100");
    await user.click(screen.getByRole("button", { name: "Send ৳100.00" }));
    await screen.findByRole("heading", { name: "Transfer sent" });

    expect(sendTransfer.mock.calls.map(([, key]) => key)).toEqual(["key-1", "key-2"]);
  });

  it("uses a new key for the next payment after a success, even with the same details", async () => {
    const sendTransfer = vi.fn<SendTransfer>().mockResolvedValue(success);
    const { user } = setup(sendTransfer);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));
    await user.click(await screen.findByRole("button", { name: "Send another" }));

    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Send ৳1,500.50" }));
    await screen.findByRole("heading", { name: "Transfer sent" });

    expect(sendTransfer.mock.calls.map(([, key]) => key)).toEqual(["key-1", "key-2"]);
  });
});
