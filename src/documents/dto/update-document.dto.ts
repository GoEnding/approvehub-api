import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// DRAFT 상태 문서만 수정 가능. 서비스 레이어에서 상태 검증
export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: '수정된 제목' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: '수정된 본문 내용' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({
    example: 3,
    description: '승인자 변경 (본인 ID 불가)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  approverId?: number;
}
