import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresenceService } from './presence.service';
import { RealtimeGateway } from './realtime.gateway';
@Module({imports:[AuthModule],providers:[RealtimeGateway,PresenceService],exports:[PresenceService]})
export class RealtimeModule {}
