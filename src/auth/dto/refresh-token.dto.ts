import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  // 로그인 시 발급받은 refresh token을 body로 전달
  // Authorization 헤더가 아닌 body로 받는 이유:
  //   refresh 전용 엔드포인트이므로 token을 명시적으로 전달받는 것이 의도가 명확함
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  refreshToken: string;
}
