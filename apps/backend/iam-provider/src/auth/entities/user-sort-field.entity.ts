export const UserSortField = {
  Id: 'id',
  Email: 'email',
  DisplayName: 'displayName',
  CreatedAt: 'createdAt',
  UpdatedAt: 'updatedAt',
} as const;

export type UserSortField = (typeof UserSortField)[keyof typeof UserSortField];
