import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
// import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
// import { jwtConstants } from '../constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      console.error('No token found in the request headers');
      return false;
    }

    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        publicKey: '5a9f4d0e1b2c3d4e5f6a7b8c9d0e1f3',
      });

      request.user = decoded;
    } catch (error) {
      console.error('Error verifying the token:', error.message);
      return false;
    }
    return true;
  }
}
