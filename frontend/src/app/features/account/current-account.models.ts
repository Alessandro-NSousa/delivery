export type AccountProfile = 'CUSTOMER' | 'MERCHANT';

export interface CurrentAccount {
  id: string;
  email: string;
  displayName: string;
  profile: AccountProfile;
}