import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectDocumentDto {
  // comment라는 이름을 쓰는 이유:
  //   document_status_histories.comment 컬럼과 용어를 일치시킴
  //   서비스에서 이 값을 document.rejectionReason과 history.comment 양쪽에 저장함
  @ApiProperty({
    example: '내용이 불충분합니다. 3항 근거 자료를 추가해 주세요.',
    description: '반려 사유 (필수)',
  })
  @IsString()
  @MinLength(1, { message: '반려 사유를 입력해야 합니다.' })
  comment: string;
}
