import { APP_CONFIG, SUPPORTED_STATE_CODES, type StateCode } from "../config/app-config";
import { ACTIVE_TAX_YEAR } from "../domain/tax-brackets";

export function describeModelContext(state: StateCode): string {
  const currentState = APP_CONFIG.states[state];
  return `Active tax year: ${ACTIVE_TAX_YEAR}. This page compares Fidelity money market fund seven-day yields using federal and selectable state single-filer tax selections. Active resident state: ${currentState.name} (${currentState.abbreviation}). Supported resident states: ${SUPPORTED_STATE_CODES.length}. Washington capital-gains tax is not applied to money-market yield income.`;
}
