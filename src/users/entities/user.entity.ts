import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // 로그인 시 사용하는 아이디 (중복 불가)
  @Column({ unique: true })
  loginId: string;

  // bcrypt로 해싱된 비밀번호를 저장함 (평문 저장 절대 금지)
  @Column()
  password: string;

  @Column()
  name: string;

  // 이메일은 필수값이며 중복 불가
  @Column({ unique: true })
  email: string;

  // 전화번호는 선택값, 등록 시 중복 불가
  // type: 'varchar'를 명시하는 이유: string | null 유니온 타입을 TypeORM이 'Object'로 잘못 인식하는 것을 방지
  @Column({ type: 'varchar', unique: true, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  jobTitle: string | null;

  // USER가 기본값. ADMIN만 특수 권한 보유
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  // 로그인/로그아웃 시 증가. 이전 토큰을 무효화하는 핵심 필드
  @Column({ default: 0 })
  tokenVersion: number;

  // refresh token 원본을 bcrypt로 해싱해서 저장. 로그아웃 시 null 처리
  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // soft delete용. 실제 삭제 아님. 회원탈퇴/비활성화 시 값이 채워짐
  @DeleteDateColumn()
  deletedAt: Date | null;
}
