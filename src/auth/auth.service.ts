import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────
  // 회원가입
  // ─────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException(
        '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
      );
    }

    const existingByLoginId = await this.usersService.findByLoginId(
      dto.loginId,
    );
    if (existingByLoginId) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const existingByEmail = await this.usersService.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    if (dto.phoneNumber) {
      const existingByPhone = await this.usersService.findByPhoneNumber(
        dto.phoneNumber,
      );
      if (existingByPhone) {
        throw new ConflictException('이미 사용 중인 전화번호입니다.');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      loginId: dto.loginId,
      password: hashedPassword,
      name: dto.name,
      email: dto.email,
      phoneNumber: dto.phoneNumber ?? null,
      department: dto.department ?? null,
      jobTitle: dto.jobTitle ?? null,
    });

    return {
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  // ─────────────────────────────────────────────
  // 로그인
  // ─────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    // 1단계: 활성 사용자 조회 (deletedAt IS NULL인 계정만)
    const user = await this.usersService.findActiveByLoginId(dto.loginId);

    // 2단계: 존재하지 않으면 401
    // 보안 원칙: "아이디가 없습니다" / "비밀번호가 틀립니다"를 구분하면
    //   공격자가 어떤 loginId가 등록되어 있는지 알 수 있음 (계정 열거 공격)
    //   따라서 두 경우 모두 동일한 메시지를 반환함
    if (!user) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 3단계: 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 4단계: tokenVersion 증가
    // 핵심: 이 값이 올라가면 이전에 발급된 모든 토큰이 무효화됨
    // 보호 API Guard에서 payload.tokenVersion !== DB.tokenVersion이면 401 처리 예정
    const newTokenVersion = user.tokenVersion + 1;

    // 5단계: access token 발급
    // payload에 tokenVersion을 포함시키는 것이 단일 세션 정책의 핵심
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      loginId: user.loginId,
      role: user.role,
      tokenVersion: newTokenVersion,
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      // @nestjs/jwt v11은 expiresIn에 StringValue(ms 라이브러리 타입)를 요구함
      // ConfigService.get()은 일반 string을 반환하므로 as any로 타입 우회
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    // 6단계: refresh token 발급
    // access token과 다른 secret, 더 긴 만료 시간
    // payload는 최소화 (sub, tokenVersion만 포함)
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenVersion: newTokenVersion,
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    // 7단계: refresh token 해시 저장
    // refresh token 원본은 서버에 보관하지 않음
    // 검증 시 클라이언트가 전달한 토큰을 bcrypt.compare로 DB hash와 비교함
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // 8단계: DB 업데이트 (tokenVersion, refreshTokenHash, lastLoginAt)
    await this.usersService.updateLoginSession(user.id, {
      tokenVersion: newTokenVersion,
      refreshTokenHash,
      lastLoginAt: new Date(),
    });

    return { accessToken, refreshToken };
  }

  // ─────────────────────────────────────────────
  // refresh token 재발급
  // ─────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    // 1단계: refresh token 서명 및 만료 검증
    // jwtService.verify()는 서명이 틀리거나 만료됐으면 예외를 던짐
    // 반드시 try/catch로 감싸서 그 예외를 우리가 원하는 401로 변환해야 함
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      // JsonWebTokenError (변조), TokenExpiredError (만료) 등 모두 같은 메시지로 처리
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 refresh token입니다.',
      );
    }

    // 2단계: 활성 사용자 조회 (deletedAt IS NULL)
    // payload.sub = user.id
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 refresh token입니다.',
      );
    }

    // 3단계: refreshTokenHash 존재 확인
    // 로그아웃 시 refreshTokenHash를 null로 만들기 때문에,
    // null이라면 이미 로그아웃된 상태 → 해당 refresh token 사용 불가
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 refresh token입니다.',
      );
    }

    // 4단계: refresh token 원본과 DB에 저장된 hash 비교
    // bcrypt.compare: 원본 token을 해시해서 DB hash와 비교
    // 다른 기기에서 로그인한 새 refresh token이 들어오면 여기서 불일치로 차단됨
    const isTokenValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );
    if (!isTokenValid) {
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 refresh token입니다.',
      );
    }

    // 5단계: tokenVersion 일치 확인 (단일 세션 정책의 핵심)
    // 재로그인이 발생했다면 DB의 tokenVersion이 올라가 있음
    // payload에 담긴 이전 tokenVersion과 불일치 → 이전 세션 토큰으로 간주 → 차단
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 refresh token입니다.',
      );
    }

    // 6단계: 새 access token 발급
    // tokenVersion은 증가시키지 않음 = 같은 세션 연장
    // role, loginId는 DB에서 최신 정보를 사용 (로그인 후 role이 바뀌었을 수도 있음)
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      loginId: user.loginId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    return { accessToken };
  }

  // ─────────────────────────────────────────────
  // 로그아웃
  // ─────────────────────────────────────────────

  async logout(userId: number, currentTokenVersion: number): Promise<void> {
    // refreshTokenHash = null:
    //   이후 refresh token으로 재발급 시도 시 "hash 없음" 단계에서 차단됨
    //
    // tokenVersion = currentTokenVersion + 1:
    //   이후 이 사용자의 모든 보호 API 접근 시
    //   JwtAuthGuard에서 payload.tokenVersion(이전 값) !== DB.tokenVersion(증가된 값)
    //   → 즉시 401 차단
    //
    // 왜 deletedAt을 건드리지 않는가:
    //   deletedAt은 계정 탈퇴/비활성화 용도임
    //   로그아웃은 "이 세션 종료"일 뿐, 계정은 여전히 활성 상태로 유지되어야 함
    await this.usersService.updateLogoutSession(userId, {
      refreshTokenHash: null,
      tokenVersion: currentTokenVersion + 1,
    });
  }
}
