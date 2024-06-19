import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TxsController } from './controllers/txs.controller';
import { TxsService } from './services/txs.service';
import { Tx, TxSchema } from './entities/txs.schema';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from 'src/users/services/users.service';
import { UsersModule } from 'src/users/users.module';
import { User, UserSchema } from 'src/users/entities/user.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Tx.name, schema: TxSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({
      secret: '5a9f4d0e1b2c3d4e5f6a7b8c9d0e1f3',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [TxsController],
  providers: [TxsService, UsersService],
})
export class TxsModule {}
