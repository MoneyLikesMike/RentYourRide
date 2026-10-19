/**
 * RYRA-460 interface: forward Connect transfer/payout failures to the payout
 * recovery service. No-op until 460 lands.
 */
export interface PayoutFailureForwarder {
  onTransferOrPayoutFailure(event: {
    type: string;
    stripeAccountId: string | null;
    eventId: string;
    payload: unknown;
  }): Promise<void>;
}

export class NoopPayoutFailureForwarder implements PayoutFailureForwarder {
  async onTransferOrPayoutFailure(): Promise<void> {
    /* RYRA-460 not merged */
  }
}
