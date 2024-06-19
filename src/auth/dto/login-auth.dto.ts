import { IsEmail, IsNotEmpty, Length } from 'class-validator';
export class LoginAuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsNotEmpty()
  @Length(8, 16)
  password: string;
}
