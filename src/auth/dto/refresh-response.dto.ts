import { ApiProperty } from '@nestjs/swagger';

// refresh는 access token만 재발급함 (단순 버전)
// refresh token 자체는 만료 전까지 계속 재사용 가능
export class RefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;
}
