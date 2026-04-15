import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentListItemDto } from './dto/document-list-item.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { HistoryResponseDto } from './dto/history-response.dto';
import { RejectDocumentDto } from './dto/reject-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─────────────────────────────────────────────
  // 문서 목록 조회
  // ─────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: '문서 목록 조회',
    description:
      'type=mine(내 기안 문서) | inbox(결재 대기) | processed(처리 완료). 기본값: mine',
  })
  @ApiResponse({ status: 200, type: [DocumentListItemDto] })
  async findMany(
    @Query() query: GetDocumentsQueryDto,
    @CurrentUser() user: User,
  ): Promise<DocumentListItemDto[]> {
    return this.documentsService.findMany(user.id, query);
  }

  // ─────────────────────────────────────────────
  // 문서 상세 조회
  // ─────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: '문서 상세 조회',
    description: '작성자 또는 승인자만 조회 가능',
  })
  @ApiParam({ name: 'id', description: '문서 ID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '문서 없음' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.findOne(id, user.id);
  }

  // ─────────────────────────────────────────────
  // 문서 작성
  // ─────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '문서 작성', description: 'DRAFT 상태로 문서 생성' })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  @ApiResponse({
    status: 400,
    description: '본인 승인자 지정 / 존재하지 않는 승인자',
  })
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.create(dto, user.id);
  }

  // ─────────────────────────────────────────────
  // 문서 수정 (DRAFT만 가능)
  // ─────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: '문서 수정',
    description: 'DRAFT 상태 문서만 수정 가능. 작성자 본인만 수정 가능',
  })
  @ApiParam({ name: 'id', description: '문서 ID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'DRAFT 상태 아님' })
  @ApiResponse({ status: 403, description: '본인 작성 문서 아님' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.update(id, dto, user.id);
  }

  // ─────────────────────────────────────────────
  // 결재 요청 (DRAFT → PENDING_APPROVAL)
  // ─────────────────────────────────────────────

  @Patch(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결재 요청',
    description: 'DRAFT → PENDING_APPROVAL. 작성자만 가능',
  })
  @ApiParam({ name: 'id', description: '문서 ID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'DRAFT 상태 아님 / 승인자 미지정' })
  @ApiResponse({ status: 403, description: '본인 작성 문서 아님' })
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.submit(id, user.id);
  }

  // ─────────────────────────────────────────────
  // 승인 (PENDING_APPROVAL → APPROVED)
  // ─────────────────────────────────────────────

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '문서 승인',
    description: 'PENDING_APPROVAL → APPROVED. 승인자만 가능',
  })
  @ApiParam({ name: 'id', description: '문서 ID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'PENDING_APPROVAL 상태 아님' })
  @ApiResponse({ status: 403, description: '본인이 승인자 아님' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.approve(id, user.id);
  }

  // ─────────────────────────────────────────────
  // 반려 (PENDING_APPROVAL → REJECTED)
  // ─────────────────────────────────────────────

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '문서 반려',
    description: 'PENDING_APPROVAL → REJECTED. 승인자만 가능. 사유 필수',
  })
  @ApiParam({ name: 'id', description: '문서 ID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'PENDING_APPROVAL 상태 아님 / 사유 없음',
  })
  @ApiResponse({ status: 403, description: '본인이 승인자 아님' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.reject(id, user.id, dto.comment);
  }

  // ─────────────────────────────────────────────
  // 상태 이력 조회
  // ─────────────────────────────────────────────

  @Get(':id/histories')
  @ApiOperation({
    summary: '문서 상태 이력 조회',
    description:
      '해당 문서의 전체 상태 변경 이력. 작성자 또는 승인자만 조회 가능',
  })
  @ApiParam({ name: 'id', description: '문서 ID' })
  @ApiResponse({ status: 200, type: [HistoryResponseDto] })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '문서 없음' })
  async getHistories(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<HistoryResponseDto[]> {
    return this.documentsService.getHistories(id, user.id);
  }
}
