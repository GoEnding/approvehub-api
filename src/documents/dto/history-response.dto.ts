import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '../../common/enums/document-status.enum';

export class HistoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 3 })
  documentId: number;

  @ApiPropertyOptional({
    enum: DocumentStatus,
    nullable: true,
    example: DocumentStatus.DRAFT,
  })
  fromStatus: DocumentStatus | null;

  @ApiProperty({
    enum: DocumentStatus,
    example: DocumentStatus.PENDING_APPROVAL,
  })
  toStatus: DocumentStatus;

  @ApiProperty({ example: 2, description: '상태를 변경한 사용자 ID' })
  changedById: number;

  @ApiProperty({ example: '김철수', description: '상태를 변경한 사용자 이름' })
  changedByName: string;

  @ApiPropertyOptional({ example: '내용이 부족합니다.', nullable: true })
  comment: string | null;

  @ApiProperty()
  createdAt: Date;
}
