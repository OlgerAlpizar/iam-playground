export const SortOrder = {
  Asc: 'asc',
  Desc: 'desc',
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
