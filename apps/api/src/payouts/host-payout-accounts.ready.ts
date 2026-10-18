/** Pure helpers for tests — keeps Nest decorators out of tsx --test. */
export class HostPayoutAccountsService {
  static isPayoutsReadyStatic(row: {
    payoutsEnabled: boolean;
    transfersCapability: string | null | undefined;
  }): boolean {
    return row.payoutsEnabled === true && row.transfersCapability === 'active';
  }
}
