import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { User, UserSchema } from './entities/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../auth/services/auth.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name, useFactory: () => {
          const schema = UserSchema;
          schema.plugin(require('mongoose-unique-validator'), { message: 'Email is already registered.' }); // or you can integrate it without the options   schema.plugin(require('mongoose-unique-validator')
          return schema;
        },
      },    
    ]),
    JwtModule.register({
      secret: '5a9f4d0e1b2c3d4e5f6a7b8c9d0e1f3',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, AuthService],
  exports: [UsersService],
})
export class UsersModule { }
