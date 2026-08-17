export type AssignmentFormSeed = {
  returnTo?: 'proposal';
  title?: string;
  category?: string;
};

let seed: AssignmentFormSeed | null = null;

export function setAssignmentFormSeed(next: AssignmentFormSeed | null) {
  seed = next;
}

export function takeAssignmentFormSeed(): AssignmentFormSeed | null {
  const current = seed;
  seed = null;
  return current;
}
