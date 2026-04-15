import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: '2026년 4월 업무 계획서', description: '문서 제목' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: '이번 달 업무 계획 내용입니다.',
    description: '문서 본문',
  })
  @IsString()
  @MinLength(1)
  content: string;

  // approverId: 선택값
  // 이유: DRAFT 상태에서 아직 승인자가 정해지지 않았을 수 있음
  // 단, 결재 요청(submit) 시점에는 서비스 레이어에서 필수 검증 예정
  // IsInt + Min(1): 문자열이나 0 이하의 값은 유효한 user ID가 아니므로 차단
  @ApiPropertyOptional({
    example: 3,
    description: '승인자 user ID (본인 ID 불가)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  approverId?: number;
}
