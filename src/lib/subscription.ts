const TRIAL_DAYS = 3;
const TRIAL_START_KEY = "beauty_trial_start";

export function getTrialStartDate(): Date {
  const stored = localStorage.getItem(TRIAL_START_KEY);
  if (stored) return new Date(stored);
  const now = new Date();
  localStorage.setItem(TRIAL_START_KEY, now.toISOString());
  return now;
}

export function getTrialDaysRemaining(): number {
  const start = getTrialStartDate();
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

export function isTrialExpired(): boolean {
  return getTrialDaysRemaining() <= 0;
}

export function getSubscriptionStatus(): "trial" | "active" | "expired" {
  const isPaid = localStorage.getItem("beauty_subscription_active") === "true";
  if (isPaid) return "active";
  if (isTrialExpired()) return "expired";
  return "trial";
}

export function activateSubscription(): void {
  localStorage.setItem("beauty_subscription_active", "true");
}
