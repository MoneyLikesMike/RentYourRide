export type OpsCheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

export type OpsCheckResult = {
  key: string;
  label: string;
  status: OpsCheckStatus;
  detail: string;
};

export type OpsHealthSnapshot = {
  at: string;
  env: string;
  publicBaseUrl: string;
  checks: OpsCheckResult[];
  ok: boolean;
  hasWarn: boolean;
  hasFail: boolean;
};
