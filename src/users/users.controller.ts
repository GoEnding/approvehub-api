import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  // UsersController는 UsersService를 주입하지 않음
  // 이유: /me는 JwtAuthGuard가 이미 DB에서 최신 user를 로드해 request.user에 첨부하기 때문에
  //       추가 DB 조회가 필요 없음. Guard의 작업을 재활용하는 것이 효율적
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 정보 조회',
    description: 'access token으로 현재 로그인된 사용자의 프로필을 반환',
  })
  @ApiResponse({ status: 200, description: '조회 성공', type: UserProfileDto })
  @ApiResponse({
    status: 401,
    description: '인증 실패 (토큰 없음, 만료, 세션 불일치)',
  })
  // async 없음: 이 메서드는 DB 조회를 하지 않으므로 동기 처리
  getMe(@CurrentUser() user: User): UserProfileDto {
    // request.user는 JwtAuthGuard가 DB에서 가져온 최신 User 엔티티
    // 여기서 할 일: 민감 필드를 제외하고 클라이언트에 안전한 형태로 반환
    return {
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      department: user.department,
      jobTitle: user.jobTitle,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
