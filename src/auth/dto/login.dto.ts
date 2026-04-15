import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john123', description: '로그인 아이디' })
  @IsString()
  loginId: string;

  @ApiProperty({ example: 'Password1!', description: '비밀번호' })
  @IsString()
  password: string;
}
