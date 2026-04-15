import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // forwardRef: UsersModule도 AuthModule을 import하므로 순환 참조 방지
    forwardRef(() => UsersModule),

    // JwtModule.registerAsync: ConfigService가 준비된 후 JWT 설정을 읽기 위해 async 방식 사용
    // 기본 설정은 access token 기준으로 설정함
    // refresh token은 AuthService에서 sign() 호출 시 별도 옵션으로 오버라이드함
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // configService.get()은 string | undefined를 반환하지만
          // @nestjs/jwt v11은 StringValue 타입을 요구하므로 as string으로 캐스팅
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  // JwtAuthGuard를 providers에 등록해야 @UseGuards(JwtAuthGuard) 사용 시 DI가 작동함
  // exports에 넣는 이유: 나중에 UsersController, DocumentsController 등에서도 사용하기 위함
  providers: [AuthService, JwtAuthGuard],
  // JwtModule을 함께 export하는 이유:
  //   UsersModule 등 다른 모듈이 AuthModule을 import할 때 JwtService도 사용할 수 있어야
  //   JwtAuthGuard의 의존성(JwtService)이 그 모듈 컨텍스트에서도 해결됨
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
