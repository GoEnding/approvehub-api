import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

// GET /users/me 응답 DTO
// 응답에 포함하면 안 되는 필드:
//   - password         : 해시값이라도 노출 시 오프라인 공격에 이용될 수 있음
//   - refreshTokenHash : 해시값 노출 시 동일한 공격 가능
//   - tokenVersion     : 내부 세션 관리 값. 클라이언트가 알 필요 없음
//   - deletedAt        : 내부 운영 필드. 활성 사용자라면 항상 null이므로 의미 없음
export class UserProfileDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john123' })
  loginId: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'hong@company.com' })
  email: string;

  @ApiPropertyOptional({ example: '010-1234-5678', nullable: true })
  phoneNumber: string | null;

  @ApiPropertyOptional({ example: '개발팀', nullable: true })
  department: string | null;

  @ApiPropertyOptional({ example: '시니어 개발자', nullable: true })
  jobTitle: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiPropertyOptional({ example: '2026-04-15T04:00:00.000Z', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ example: '2026-04-15T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-15T00:00:00.000Z' })
  updatedAt: Date;
}
