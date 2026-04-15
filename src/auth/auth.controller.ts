import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '회원가입',
    description: 'loginId + password 기반 로컬 계정 회원가입',
  })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: '입력값 오류 또는 비밀번호 불일치' })
  @ApiResponse({
    status: 409,
    description: 'loginId / email / phoneNumber 중복',
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description: 'loginId + password로 로그인. access/refresh token 반환',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: '입력값 오류' })
  @ApiResponse({
    status: 401,
    description: '아이디 또는 비밀번호 오류, 혹은 탈퇴/비활성 계정',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Access token 재발급',
    description:
      '유효한 refresh token을 body로 전달하면 새 access token을 발급함',
  })
  @ApiResponse({
    status: 200,
    description: '재발급 성공',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'refresh token 무효, 만료, 또는 세션 불일치',
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  // @UseGuards(JwtAuthGuard): 이 엔드포인트는 인증된 사용자만 접근 가능
  // Guard가 먼저 실행되어 token 유효성 검사 → request.user 첨부 → 컨트롤러 진입
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  // @ApiBearerAuth(): Swagger UI에서 자물쇠 아이콘 활성화. Authorize 버튼에서 token 입력 가능
  @ApiBearerAuth()
  @ApiOperation({
    summary: '로그아웃',
    description:
      'refreshTokenHash 제거 + tokenVersion 증가. 이전 모든 토큰 무효화',
  })
  @ApiResponse({ status: 204, description: '로그아웃 성공 (응답 body 없음)' })
  @ApiResponse({
    status: 401,
    description: '인증 실패 (토큰 없음, 만료, 세션 불일치)',
  })
  async logout(@CurrentUser() user: User): Promise<void> {
    // user는 JwtAuthGuard가 request.user에 첨부한 현재 로그인된 사용자
    // user.tokenVersion을 service에 전달해 추가 DB 조회 없이 +1 처리
    return this.authService.logout(user.id, user.tokenVersion);
  }
}
