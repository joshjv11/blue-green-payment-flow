declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        orgId: string;
        role: string;
        plan: string;
        email: string;
        verified: boolean;
      };
    }
  }
}

export {};
