import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentStatus } from '../common/enums/document-status.enum';
import { UsersService } from '../users/users.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentListItemDto } from './dto/document-list-item.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import {
  DocumentListType,
  GetDocumentsQueryDto,
} from './dto/get-documents-query.dto';
import { HistoryResponseDto } from './dto/history-response.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentStatusHistory } from './entities/document-status-history.entity';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,

    // 이력 저장을 위해 별도 리포지토리 주입
    // documents.module.ts에서 TypeOrmModule.forFeature([Document, DocumentStatusHistory])로 등록됨
    @InjectRepository(DocumentStatusHistory)
    private readonly historyRepository: Repository<DocumentStatusHistory>,

    private readonly usersService: UsersService,
  ) {}

  // ─────────────────────────────────────────────
  // 문서 작성
  // ─────────────────────────────────────────────

  async create(
    dto: CreateDocumentDto,
    requesterId: number,
  ): Promise<DocumentResponseDto> {
    if (dto.approverId !== undefined && dto.approverId === requesterId) {
      throw new BadRequestException('본인을 승인자로 지정할 수 없습니다.');
    }

    if (dto.approverId !== undefined) {
      const approver = await this.usersService.findActiveById(dto.approverId);
      if (!approver) {
        throw new BadRequestException(
          '존재하지 않거나 비활성화된 승인자입니다.',
        );
      }
    }

    const document = this.documentRepository.create({
      title: dto.title,
      content: dto.content,
      requesterId,
      approverId: dto.approverId ?? null,
      status: DocumentStatus.DRAFT,
    });

    const saved = await this.documentRepository.save(document);
    return this.toResponseDto(saved);
  }

  // ─────────────────────────────────────────────
  // 문서 목록 조회
  // ─────────────────────────────────────────────

  async findMany(
    userId: number,
    query: GetDocumentsQueryDto,
  ): Promise<DocumentListItemDto[]> {
    const qb = this.documentRepository.createQueryBuilder('doc');

    const type = query.type ?? DocumentListType.MINE;

    if (type === DocumentListType.MINE) {
      qb.where('doc.requesterId = :userId', { userId });
    } else if (type === DocumentListType.INBOX) {
      // 내가 결재해야 할 문서: 승인자이고 PENDING_APPROVAL 상태
      qb.where('doc.approverId = :userId', { userId }).andWhere(
        'doc.status = :status',
        {
          status: DocumentStatus.PENDING_APPROVAL,
        },
      );
    } else {
      // processed: 내가 승인자이고 이미 처리된 문서
      qb.where('doc.approverId = :userId', { userId }).andWhere(
        'doc.status IN (:...statuses)',
        { statuses: [DocumentStatus.APPROVED, DocumentStatus.REJECTED] },
      );
    }

    // 추가 상태 필터 (mine 또는 processed 조회 시 특정 status로 좁히기)
    if (query.status && type !== DocumentListType.INBOX) {
      qb.andWhere('doc.status = :filterStatus', { filterStatus: query.status });
    }

    qb.orderBy('doc.createdAt', 'DESC');

    const docs = await qb.getMany();
    return docs.map((doc) => this.toListItemDto(doc));
  }

  // ─────────────────────────────────────────────
  // 문서 상세 조회
  // ─────────────────────────────────────────────

  async findOne(
    documentId: number,
    userId: number,
  ): Promise<DocumentResponseDto> {
    const doc = await this.findDocumentById(documentId);

    // 작성자 또는 승인자만 상세 조회 가능
    if (doc.requesterId !== userId && doc.approverId !== userId) {
      throw new ForbiddenException('해당 문서에 대한 조회 권한이 없습니다.');
    }

    return this.toResponseDto(doc);
  }

  // ─────────────────────────────────────────────
  // 문서 수정 (DRAFT 상태만)
  // ─────────────────────────────────────────────

  async update(
    documentId: number,
    dto: UpdateDocumentDto,
    userId: number,
  ): Promise<DocumentResponseDto> {
    const doc = await this.findDocumentById(documentId);

    if (doc.requesterId !== userId) {
      throw new ForbiddenException('본인이 작성한 문서만 수정할 수 있습니다.');
    }

    // DRAFT 상태에서만 수정 가능 - 실무 규칙: 결재 요청 이후에는 내용 변경 불가
    if (doc.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException(
        `DRAFT 상태인 문서만 수정할 수 있습니다. 현재 상태: ${doc.status}`,
      );
    }

    // 승인자를 본인으로 변경하는 것 차단
    if (dto.approverId !== undefined && dto.approverId === userId) {
      throw new BadRequestException('본인을 승인자로 지정할 수 없습니다.');
    }

    if (dto.approverId !== undefined) {
      const approver = await this.usersService.findActiveById(dto.approverId);
      if (!approver) {
        throw new BadRequestException(
          '존재하지 않거나 비활성화된 승인자입니다.',
        );
      }
    }

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.content !== undefined) doc.content = dto.content;
    if (dto.approverId !== undefined) doc.approverId = dto.approverId;

    const saved = await this.documentRepository.save(doc);
    return this.toResponseDto(saved);
  }

  // ─────────────────────────────────────────────
  // 상태 이력 조회
  // ─────────────────────────────────────────────

  async getHistories(
    documentId: number,
    userId: number,
  ): Promise<HistoryResponseDto[]> {
    const doc = await this.findDocumentById(documentId);

    // 작성자 또는 승인자만 이력 조회 가능
    if (doc.requesterId !== userId && doc.approverId !== userId) {
      throw new ForbiddenException(
        '해당 문서의 이력을 조회할 권한이 없습니다.',
      );
    }

    const histories = await this.historyRepository.find({
      where: { documentId },
      // changedByUser 조인: 응답에 이름을 포함하기 위함
      relations: ['changedByUser'],
      order: { createdAt: 'ASC' },
    });

    return histories.map((h) => ({
      id: h.id,
      documentId: h.documentId,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedById: h.changedById,
      changedByName: h.changedByUser.name,
      comment: h.comment,
      createdAt: h.createdAt,
    }));
  }

  // ─────────────────────────────────────────────
  // 결재 요청 (DRAFT → PENDING_APPROVAL)
  // ─────────────────────────────────────────────

  async submit(
    documentId: number,
    userId: number,
  ): Promise<DocumentResponseDto> {
    const doc = await this.findDocumentById(documentId);

    // 작성자 본인만 결재 요청 가능
    if (doc.requesterId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 문서만 결재 요청할 수 있습니다.',
      );
    }

    // DRAFT 상태에서만 결재 요청 가능
    if (doc.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException(
        `DRAFT 상태인 문서만 결재 요청할 수 있습니다. 현재 상태: ${doc.status}`,
      );
    }

    // 승인자가 없으면 결재 요청 불가
    // DRAFT 생성 시 approverId를 비워둔 경우 여기서 차단
    if (!doc.approverId) {
      throw new BadRequestException('결재 요청 전 승인자를 지정해야 합니다.');
    }

    // 상태 변경
    const fromStatus = doc.status;
    doc.status = DocumentStatus.PENDING_APPROVAL;
    doc.submittedAt = new Date();
    const saved = await this.documentRepository.save(doc);

    // 이력 저장: 누가, 언제, 어떤 상태에서 어떤 상태로 바꿨는지 기록
    await this.saveHistory({
      documentId: doc.id,
      fromStatus,
      toStatus: DocumentStatus.PENDING_APPROVAL,
      changedById: userId,
      comment: null,
    });

    return this.toResponseDto(saved);
  }

  // ─────────────────────────────────────────────
  // 승인 (PENDING_APPROVAL → APPROVED)
  // ─────────────────────────────────────────────

  async approve(
    documentId: number,
    userId: number,
  ): Promise<DocumentResponseDto> {
    const doc = await this.findDocumentById(documentId);

    // 승인자로 지정된 사람만 승인 가능
    // approverId가 null이거나 다른 사람이면 403
    if (doc.approverId !== userId) {
      throw new ForbiddenException(
        '본인이 승인자로 지정된 문서만 승인할 수 있습니다.',
      );
    }

    // PENDING_APPROVAL 상태에서만 승인 가능
    if (doc.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `PENDING_APPROVAL 상태인 문서만 승인할 수 있습니다. 현재 상태: ${doc.status}`,
      );
    }

    const fromStatus = doc.status;
    doc.status = DocumentStatus.APPROVED;
    doc.approvedAt = new Date();
    const saved = await this.documentRepository.save(doc);

    await this.saveHistory({
      documentId: doc.id,
      fromStatus,
      toStatus: DocumentStatus.APPROVED,
      changedById: userId,
      comment: null,
    });

    return this.toResponseDto(saved);
  }

  // ─────────────────────────────────────────────
  // 반려 (PENDING_APPROVAL → REJECTED)
  // ─────────────────────────────────────────────

  async reject(
    documentId: number,
    userId: number,
    comment: string,
  ): Promise<DocumentResponseDto> {
    const doc = await this.findDocumentById(documentId);

    if (doc.approverId !== userId) {
      throw new ForbiddenException(
        '본인이 승인자로 지정된 문서만 반려할 수 있습니다.',
      );
    }

    if (doc.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `PENDING_APPROVAL 상태인 문서만 반려할 수 있습니다. 현재 상태: ${doc.status}`,
      );
    }

    const fromStatus = doc.status;
    doc.status = DocumentStatus.REJECTED;
    doc.rejectedAt = new Date();
    // 반려 사유는 document에도 저장 (조회 시 바로 확인 가능)
    // history.comment에도 저장 (이력 조회 시 맥락 파악 가능)
    doc.rejectionReason = comment;
    const saved = await this.documentRepository.save(doc);

    await this.saveHistory({
      documentId: doc.id,
      fromStatus,
      toStatus: DocumentStatus.REJECTED,
      changedById: userId,
      comment,
    });

    return this.toResponseDto(saved);
  }

  // ─────────────────────────────────────────────
  // private 헬퍼 메서드
  // ─────────────────────────────────────────────

  // 문서 조회 공통 로직: soft delete된 문서는 TypeORM이 자동으로 제외
  private async findDocumentById(id: number): Promise<Document> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }
    return doc;
  }

  // 이력 저장 공통 로직
  // submit/approve/reject 모두 이 메서드를 통해 이력을 남김
  // 이력은 append-only: 한 번 저장하면 수정하지 않음
  private async saveHistory(params: {
    documentId: number;
    fromStatus: DocumentStatus | null;
    toStatus: DocumentStatus;
    changedById: number;
    comment: string | null;
  }): Promise<void> {
    const history = this.historyRepository.create(params);
    await this.historyRepository.save(history);
  }

  // 목록 조회용 축약 DTO (content 제외)
  private toListItemDto(doc: Document): DocumentListItemDto {
    return {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      requesterId: doc.requesterId,
      approverId: doc.approverId,
      submittedAt: doc.submittedAt,
      approvedAt: doc.approvedAt,
      rejectedAt: doc.rejectedAt,
      createdAt: doc.createdAt,
    };
  }

  // Document 엔티티 → DocumentResponseDto 변환
  // create / submit / approve / reject 모두 같은 응답 형태를 반환
  private toResponseDto(doc: Document): DocumentResponseDto {
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      requesterId: doc.requesterId,
      approverId: doc.approverId,
      status: doc.status,
      submittedAt: doc.submittedAt,
      approvedAt: doc.approvedAt,
      rejectedAt: doc.rejectedAt,
      rejectionReason: doc.rejectionReason,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
