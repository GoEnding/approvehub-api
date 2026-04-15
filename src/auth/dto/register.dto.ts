import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john123', description: '로그인 아이디 (4~20자)' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  loginId: string;

  @ApiProperty({
    example: 'Password1!',
    description: '비밀번호 (영문+숫자+특수문자 8자 이상)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.',
  })
  password: string;

  // 비밀번호 확인 필드. DB에 저장하지 않으며, 서비스 레이어에서 password와 일치 여부만 확인함
  @ApiProperty({
    example: 'Password1!',
    description: '비밀번호 확인 (password와 동일해야 함)',
  })
  @IsString()
  confirmPassword: string;

  @ApiProperty({ example: '홍길동', description: '사용자 이름' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 'hong@company.com',
    description: '이메일 (중복 불가)',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '010-1234-5678',
    description: '전화번호 (선택, 중복 불가)',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '개발팀', description: '부서명' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;

  @ApiPropertyOptional({ example: '시니어 개발자', description: '직책' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  jobTitle?: string;
}
