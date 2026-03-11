export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenDto {
  token: string;
  expires: string | Date;
  userId?: number;
}

export interface AuthResponse {
  access: TokenDto;
  refresh?: TokenDto;
}

export interface LogoutRequest {
  accessToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
