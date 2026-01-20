/**
 * Express type augmentation for IAM Provider.
 * Passport.js defines `Express.User` as an empty interface `{}`.
 * We extend it here with our user properties so both Passport
 * and our app share the same type, avoiding type conflicts.
 */
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      isAdmin?: boolean;
    }
  }
}

export type AuthenticatedUser = Express.User;
