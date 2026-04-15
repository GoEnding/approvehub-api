import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

// @CurrentUser()는 JwtAuthGuard가 request.user에 첨부한 사용자 객체를 꺼내는 파라미터 데코레이터
// 반드시 JwtAuthGuard가 먼저 실행된 엔드포인트에서만 사용해야 함
//
// 사용 예시:
//   @UseGuards(JwtAuthGuard)
//   async logout(@CurrentUser() user: User): Promise<void> { ... }
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
    return request.user;
  },
);
