import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DocumentStatus } from '../../common/enums/document-status.enum';

export enum DocumentListType {
  MINE = 'mine', // 내가 기안한 문서 (requesterId = me)
  INBOX = 'inbox', // 내가 결재해야 할 문서 (approverId = me, PENDING_APPROVAL)
  PROCESSED = 'processed', // 내가 처리 완료한 문서 (approverId = me, APPROVED or REJECTED)
}

export class GetDocumentsQueryDto {
  @ApiPropertyOptional({
    enum: DocumentListType,
    description:
      'mine=내 기안 문서 | inbox=결재 대기 문서 | processed=처리 완료 문서',
    default: DocumentListType.MINE,
  })
  @IsOptional()
  @IsEnum(DocumentListType)
  type?: DocumentListType;

  @ApiPropertyOptional({
    enum: DocumentStatus,
    description: '상태 필터 (선택)',
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
