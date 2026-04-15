import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '../../common/enums/document-status.enum';

// 목록 조회 응답: 상세 내용(content)은 제외해 응답 크기를 줄임
export class DocumentListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2026년 4월 업무 계획서' })
  title: string;

  @ApiProperty({
    enum: DocumentStatus,
    example: DocumentStatus.PENDING_APPROVAL,
  })
  status: DocumentStatus;

  @ApiProperty({ example: 2, description: '작성자 ID' })
  requesterId: number;

  @ApiPropertyOptional({ example: 1, nullable: true, description: '승인자 ID' })
  approverId: number | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
