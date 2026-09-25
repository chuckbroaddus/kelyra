import { formatHandle, handleFromInput } from './roles.ts';

export type CreateLoginNotice = { tone: 'success' | 'error'; message: string };

/** Success copy after Create account: "Account for Jane Smith @jsmith has been successfully created." */
export function createdAccountNotice(
  displayName: string,
  usernameInput: string,
  missed: string[] = [],
): CreateLoginNotice {
  const name = displayName.trim();
  const handle = handleFromInput(usernameInput.trim() || name);
  const who = [name, handle ? formatHandle(handle) : ''].filter(Boolean).join(' ');
  const done = `Account for ${who} has been successfully created.`;
  if (!missed.length) return { tone: 'success', message: done };
  // Login exists; an extra (photo / contact) did not save. Say so instead of claiming all done.
  return { tone: 'error', message: `${done} But ${missed.join(' and ')} did not save. Add them from their profile.` };
}

/** Error copy when validation or the create call fails. */
export function createAccountErrorNotice(reason: string): CreateLoginNotice {
  const detail = reason.trim() || 'Something went wrong.';
  return { tone: 'error', message: `Account was not created. ${detail}` };
}
