import { UserRole } from '../../common/enums/role.enum';

// access token의 payload 구조
// tokenVersion을 포함하는 이유:
//   보호 API에서 이 값과 DB의 tokenVersion을 비교해 단일 세션 정책을 강제함
//   재로그인 시 DB.tokenVersion이 증가 → 이전 토큰의 tokenVersion과 불일치 → 401
export interface JwtAccessPayload {
  sub: number; // user.id (JWT 표준에서 subject = 식별자)
  loginId: string;
  role: UserRole;
  tokenVersion: number;
}

// refresh token의 payload 구조
// access token보다 정보가 적음: refresh token은 오직 새 access token 발급용
// role, loginId 등은 refresh 시점에 DB에서 다시 읽으므로 포함할 필요 없음
export interface JwtRefreshPayload {
  sub: number;
  tokenVersion: number;
}
