import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '../../common/enums/document-status.enum';

// Document 엔티티에서 클라이언트에 노출해도 안전한 필드만 골라낸 응답 DTO
// 이 DTO가 "이 API가 반환하는 데이터의 계약서" 역할을 함
export class DocumentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2026년 4월 업무 계획서' })
  title: string;

  @ApiProperty({ example: '이번 달 업무 계획 내용입니다.' })
  content: string;

  @ApiProperty({ example: 2, description: '작성자 user ID' })
  requesterId: number;

  @ApiPropertyOptional({
    example: 3,
    nullable: true,
    description: '승인자 user ID',
  })
  approverId: number | null;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
