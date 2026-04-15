import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';

// Express Request 타입을 확장해 user 프로퍼티를 안전하게 타이핑
type RequestWithUser = Request & { user: User };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // 1단계: Authorization 헤더에서 Bearer token 추출
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('인증 토큰이 없습니다.');
    }

    // 2단계: access token 서명 및 만료 검증
    let payload: JwtAccessPayload;
    try {
      payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 3단계: 활성 사용자 조회 (deletedAt IS NULL)
    // JWT가 유효하더라도 그 사이 계정이 탈퇴됐을 수 있음
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 4단계: tokenVersion 일치 확인 (단일 세션 정책)
    // 재로그인/로그아웃이 있었다면 DB.tokenVersion이 올라가 있음
    // payload.tokenVersion이 낮으면 이전 세션 토큰 → 차단
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 5단계: request에 user 첨부
    // 이후 컨트롤러에서 @CurrentUser() 데코레이터로 꺼내 씀
    request.user = user;

    return true;
  }

  // Authorization: Bearer <token> 형식에서 token 부분만 추출
  // "Bearer"가 아닌 다른 타입이거나 헤더가 없으면 undefined 반환
  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) return undefined;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
