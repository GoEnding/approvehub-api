import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { User } from '../../users/entities/user.entity';
import { Document } from './document.entity';

// 이 테이블은 현재 상태를 저장하는 게 아니라, 상태가 변경된 "사건"을 기록함
// append-only 구조: 한 번 기록된 이력은 수정/삭제하지 않음
// 따라서: updatedAt, deletedAt 없음
@Entity('document_status_histories')
export class DocumentStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  // ─────────────────────────────────────────────
  // 어떤 문서의 이력인가
  // ─────────────────────────────────────────────

  @Column()
  documentId: number;

  @ManyToOne(() => Document, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  // ─────────────────────────────────────────────
  // 어떤 상태 전이인가
  // ─────────────────────────────────────────────

  // fromStatus: nullable인 이유 - 문서가 처음 생성될 때는 이전 상태가 없음
  // 예: DRAFT → PENDING_APPROVAL 의 경우 fromStatus = DRAFT
  //     문서 최초 생성의 경우 fromStatus = null
  @Column({ type: 'enum', enum: DocumentStatus, nullable: true })
  fromStatus: DocumentStatus | null;

  // toStatus: 항상 존재. 이번 이벤트 이후의 상태
  @Column({ type: 'enum', enum: DocumentStatus })
  toStatus: DocumentStatus;

  // ─────────────────────────────────────────────
  // 누가 변경했는가
  // ─────────────────────────────────────────────

  @Column()
  changedById: number;

  // onDelete: 'RESTRICT': 이력을 남긴 사용자가 삭제되더라도 이력은 보존됨
  // 감사 목적으로 "누가 했는지"는 반드시 남아야 하기 때문
  @ManyToOne(() => User, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changedById' })
  changedByUser: User;

  // ─────────────────────────────────────────────
  // 부가 정보
  // ─────────────────────────────────────────────

  // comment: 반려 사유, 승인 메모 등 자유 텍스트
  // 반려(REJECTED) 시에는 서비스 레이어에서 필수 처리 예정
  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  // 이력은 생성 시각만 기록 (이력 자체는 불변)
  @CreateDateColumn()
  createdAt: Date;
}
