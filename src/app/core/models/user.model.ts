export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  daily_token_limit: number;
  vasos_balance?: number;
  has_unlimited_vasos?: boolean;
  token_symbol?: string;
  token_name?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  email_verified_at?: string;
  two_factor_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthInitResponse {
  requireVerification?: boolean;
  requireLoginCode?: boolean;
  email: string;
  expiresInMinutes?: number;
  reason?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
