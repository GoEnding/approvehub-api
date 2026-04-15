import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),

    // forwardRef를 쓰는 이유:
    //   UsersModule은 AuthModule의 JwtAuthGuard가 필요 (컨트롤러에서 @UseGuards 사용)
    //   AuthModule은 UsersModule의 UsersService가 필요 (Guard 내부에서 사용)
    //   → 두 모듈이 서로를 import하는 순환 참조 발생
    //   → forwardRef()는 NestJS에게 "나중에 참조될 모듈"임을 알려줘 순환을 풀어줌
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  // JwtAuthGuard를 여기에도 등록하는 이유:
  //   UsersController의 @UseGuards(JwtAuthGuard)는 UsersModule 컨텍스트에서 인스턴스를 찾음
  //   AuthModule에서 import한 JwtAuthGuard만으로는 부족하고 로컬 providers에도 있어야 함
  //   JwtService는 AuthModule이 export한 JwtModule을 통해 이 컨텍스트에서도 사용 가능
  providers: [UsersService, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
