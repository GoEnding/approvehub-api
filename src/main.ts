import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DateTransformInterceptor } from './common/interceptors/date-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // 모든 응답의 Date 객체를 "YYYY-MM-DD HH:mm:ss.SS" 형식으로 일괄 변환
  app.useGlobalInterceptors(new DateTransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  // DocumentBuilder로 문서 메타데이터를 만들고, SwaggerModule.setup()으로 경로에 UI를 붙임
  const config = new DocumentBuilder()
    .setTitle('ApproveHub API')
    .setDescription('사내 문서 승인/반려 및 상태 이력 관리 백엔드 API')
    .setVersion('1.0')
    .addBearerAuth() // JWT 인증을 위한 Authorize 버튼 추가 (2단계 로그인 구현 후 활용)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // 'docs' 경로에 Swagger UI 노출: http://localhost:3000/docs
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `ApproveHub API     : http://localhost:${process.env.PORT ?? 3000}/api`,
  );
  console.log(
    `Swagger UI         : http://localhost:${process.env.PORT ?? 3000}/docs`,
  );
}
void bootstrap();
