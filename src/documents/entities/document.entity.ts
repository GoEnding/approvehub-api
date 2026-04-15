import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // text 타입: varchar(255)보다 긴 문서 내용을 저장하기 위함
  @Column({ type: 'text' })
  content: string;

  // ─────────────────────────────────────────────
  // requester (문서 작성자)
  // ─────────────────────────────────────────────

  // requesterId: DB 컬럼 (FK). 직접 number로 접근 가능 → 쿼리 최적화에 유용
  @Column()
  requesterId: number;

  // requester: 관계 객체. findOne({ relations: ['requester'] }) 로 로드할 때 사용
  // eager: false = 기본적으로 JOIN 하지 않음. 명시적으로 요청할 때만 로드
  // onDelete: 'RESTRICT' = requester가 삭제되면 문서도 삭제되지 않도록 보호
  @ManyToOne(() => User, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  // ─────────────────────────────────────────────
  // approver (문서 승인자)
  // ─────────────────────────────────────────────

  // approverId: nullable인 이유 - DRAFT 상태에서 아직 승인자를 지정하지 않을 수 있음
  // 단, PENDING_APPROVAL로 전환 시 서비스 레이어에서 not null 검증 예정
  @Column({ type: 'int', nullable: true })
  approverId: number | null;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approverId' })
  approver: User | null;

  // ─────────────────────────────────────────────
  // 상태 관련 필드
  // ─────────────────────────────────────────────

  // 기본값 DRAFT: 문서는 항상 초안으로 시작
  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  // submittedAt: PENDING_APPROVAL 상태로 전환된 시각
  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date | null;

  // approvedAt: APPROVED 상태로 전환된 시각
  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null;

  // rejectedAt: REJECTED 상태로 전환된 시각
  @Column({ type: 'datetime', nullable: true })
  rejectedAt: Date | null;

  // rejectionReason: 반려 시 필수 입력. REJECTED가 아니면 null
  @Column({ type: 'varchar', nullable: true })
  rejectionReason: string | null;

  // ─────────────────────────────────────────────
  // 공통 타임스탬프
  // ─────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // soft delete: 문서 삭제 시 실제로 지우지 않고 deletedAt만 채움
  // 감사 추적(audit trail) 가능. 실수로 삭제된 경우 복구 가능
  @DeleteDateColumn()
  deletedAt: Date | null;
}
