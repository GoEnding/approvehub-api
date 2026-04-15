import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentStatusHistory } from './entities/document-status-history.entity';
import { Document } from './entities/document.entity';

@Module({
  imports: [
    // Document 엔티티의 Repository를 이 모듈에서 사용 가능하게 등록
    // DocumentStatusHistory도 등록: 이력 저장을 위해 historyRepository 주입 필요
    TypeOrmModule.forFeature([Document, DocumentStatusHistory]),

    // JwtAuthGuard를 사용하기 위해 AuthModule import
    // forwardRef를 쓰는 이유: 향후 AuthModule이 DocumentsModule을 참조할 가능성을 고려
    // 현재는 단방향이지만 forwardRef 패턴을 일관성 있게 적용
    forwardRef(() => AuthModule),

    // UsersService가 필요한 이유: 승인자(approverId) 존재 여부 검증
    UsersModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    // UsersModule과 동일한 패턴: AuthModule에서 export된 JwtModule을 통해
    // JwtService가 이 컨텍스트에서도 사용 가능하므로 JwtAuthGuard를 로컬에서 인스턴스화 가능
    JwtAuthGuard,
  ],
})
export class DocumentsModule {}
