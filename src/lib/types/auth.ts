export interface AppUser {
  id: string;
  email: string;
  full_name?: string | null;
  org_id: string;
  role: string;
  plan: string;
  verified: boolean;
}

export interface AuthSession {
  token: string;
  user: AppUser;
}
