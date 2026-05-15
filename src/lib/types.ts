export type PublicPost = {
  id: string;
  creator_id: string;
  title: string;
  cover_path: string | null;
  price_mon: number;
  created_at: string;
};

export type Profile = {
  id: string;
  wallet_address: string | null;
  display_name: string | null;
};
