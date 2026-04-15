import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  // 보호 API 접근용. Authorization: Bearer <accessToken> 헤더로 전송
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  // access token 만료 시 재발급용. 별도 secret으로 서명되어 있음
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;
}
