import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET??'local-only-change-me'})],providers:[RealtimeGateway]})
export class RealtimeModule {}
