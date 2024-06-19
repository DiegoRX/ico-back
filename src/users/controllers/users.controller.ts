import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { AuthService } from '../../auth/services/auth.service';
import { AuthGuard } from '../../auth/guards/auth.guard';
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':email')
  async findByEmail(@Param('email') email) {
    return this.usersService.findByEmail(email);
  }

  @Post('register')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      return { message: 'Credenciales invalidos' };
    }
    return this.authService.login(user);
  }

  @Post('protected')
  @UseGuards(AuthGuard)
  async protectedRoute() {
    return { message: 'Accediste a la ruta protegida' };
  }
}
