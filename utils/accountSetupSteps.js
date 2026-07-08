/** @typedef {'verified' | 'incomplete' | 'pending'} StepStatus */

/**
 * Account setup steps after sign-up (matches legacy ThreeStepsLeft flow).
 * @param {object | null | undefined} me — `GET /v1/users/me` payload
 */
export function buildAccountSetupSteps(me) {
  const hasEmail = Boolean((me?.email || '').trim());
  const phoneVerified = Boolean(me?.phoneVerified);
  const licenseVerified = Boolean(me?.licenseVerified);
  const licenseStatus = (me?.licenseVerificationStatus || '').trim();

  /** @type {Array<{ id: string, title: string, status: StepStatus, screen: string, params?: object }>} */
  const steps = [
    {
      id: 'signup',
      title: 'Sign up',
      status: 'verified',
      screen: 'AccountManagementScreen',
    },
    {
      id: 'email',
      title: 'Email verification',
      status: hasEmail ? 'verified' : 'incomplete',
      screen: 'ContactInformationScreen',
    },
    {
      id: 'phone',
      title: 'Phone verification',
      status: phoneVerified ? 'verified' : 'incomplete',
      screen: 'ContactInformationScreen',
    },
    {
      id: 'license',
      title: 'License verification',
      status: licenseVerified
        ? 'verified'
        : licenseStatus === 'pending_review' || licenseStatus === 'in_progress'
          ? 'pending'
          : 'incomplete',
      screen: 'LicenseVerificationScreen',
    },
  ];

  const verified = steps.filter((s) => s.status === 'verified');
  const incomplete = steps.filter((s) => s.status === 'incomplete');
  const pending = steps.filter((s) => s.status === 'pending');
  const stepsLeft = incomplete.length + pending.length;
  const total = steps.length;
  const completedCount = verified.length;
  const progress = total > 0 ? completedCount / total : 1;

  return {
    steps,
    verified,
    incomplete,
    pending,
    stepsLeft,
    total,
    completedCount,
    progress,
    allDone: stepsLeft === 0,
  };
}
