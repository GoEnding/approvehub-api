import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ─────────────────────────────────────────────
  // 회원가입용: soft delete된 계정 포함 조회
  // unique 제약 위반을 서비스 레이어에서 먼저 잡기 위해 withDeleted: true 사용
  // ─────────────────────────────────────────────

  async findByLoginId(loginId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { loginId },
      withDeleted: true,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      withDeleted: true,
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phoneNumber },
      withDeleted: true,
    });
  }

  // ─────────────────────────────────────────────
  // 로그인용: 활성 사용자만 조회
  // withDeleted 미지정 = TypeORM 기본값 = WHERE deletedAt IS NULL
  // soft delete(탈퇴/비활성) 계정은 여기서 null이 반환되어 자동으로 401 처리됨
  // ─────────────────────────────────────────────

  async findActiveByLoginId(loginId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { loginId } });
  }

  async findActiveById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // ─────────────────────────────────────────────
  // 공통 생성
  // ─────────────────────────────────────────────

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  // ─────────────────────────────────────────────
  // 로그인 세션 정보 업데이트
  // save() 대신 update()를 쓰는 이유:
  //   save()는 내부적으로 SELECT → UPDATE 2번 쿼리가 실행됨
  //   update()는 UPDATE 1번만 실행 → 성능 효율적
  //   단, update()는 엔티티 훅(@BeforeUpdate 등)이 트리거되지 않음을 주의
  // ─────────────────────────────────────────────

  async updateLoginSession(
    id: number,
    data: { tokenVersion: number; refreshTokenHash: string; lastLoginAt: Date },
  ): Promise<void> {
    await this.userRepository.update(id, data);
  }

  // ─────────────────────────────────────────────
  // 로그아웃 처리
  // refreshTokenHash: null  → refresh token 무효화
  // tokenVersion += 1       → 현재 access token도 Guard에서 즉시 차단됨
  // ─────────────────────────────────────────────

  async updateLogoutSession(
    id: number,
    data: { refreshTokenHash: null; tokenVersion: number },
  ): Promise<void> {
    await this.userRepository.update(id, data);
  }
}
