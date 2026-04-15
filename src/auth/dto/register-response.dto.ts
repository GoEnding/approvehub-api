import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

// 회원가입 성공 시 클라이언트에 반환하는 응답 형태
// password, refreshTokenHash, tokenVersion 등 민감 정보는 절대 포함하지 않음
export class RegisterResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john123' })
  loginId: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'hong@company.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: '2026-04-15T00:00:00.000Z' })
  createdAt: Date;
}
