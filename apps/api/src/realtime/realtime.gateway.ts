import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { readSessionCookie } from '../auth/account.util';
import { PresenceService, PresenceSnapshot } from './presence.service';

@WebSocketGateway({namespace:'/game',cors:{origin:process.env.WEB_ORIGIN??'http://localhost:5173',credentials:true}})
export class RealtimeGateway implements OnGatewayConnection,OnGatewayDisconnect {
 @WebSocketServer() server:Server;
 private logger=new Logger(RealtimeGateway.name);
 constructor(private jwt:JwtService,private presence:PresenceService){}

 async handleConnection(client:Socket){
  try {
   const token=readSessionCookie(client.handshake.headers.cookie);
   if(!token) throw new Error('missing session cookie');
   const payload=await this.jwt.verifyAsync<{sub:string}>(token);
   if(typeof payload.sub!=='string'||!payload.sub) throw new Error('invalid session token');
   client.data.userId=payload.sub;
   const snapshot=await this.presence.join(payload.sub,client.id);
   client.emit('session:ready',{userId:payload.sub,online:snapshot.online});
   this.broadcastPresence(snapshot);
  } catch (error) {
   this.logger.debug(`Conexão recusada: ${error instanceof Error?error.message:'erro desconhecido'}`);
   client.disconnect(true);
  }
 }

 async handleDisconnect(client:Socket){
  const userId=client.data?.userId as string|undefined;
  if(!userId) return;
  this.logger.debug(`Disconnected ${userId}`);
  try {
   const snapshot=await this.presence.leave(userId,client.id);
   this.broadcastPresence(snapshot);
  } catch (error) {
   this.logger.warn(`Falha ao atualizar presença na desconexão: ${error instanceof Error?error.message:'erro desconhecido'}`);
  }
 }

 @SubscribeMessage('world:ping')
 ping(@ConnectedSocket() client:Socket,@MessageBody() body:{sentAt?:number}){
  return {event:'world:pong',data:{receivedAt:Date.now(),sentAt:body?.sentAt??null}};
 }

 @SubscribeMessage('world:presence')
 async requestPresence(){
  return {event:'world:presence',data:await this.presence.snapshot()};
 }

 @SubscribeMessage('world:join-map')
 async handleJoinMap(@ConnectedSocket() client: Socket, @MessageBody() data: { mapId: string }) {
  client.join(data.mapId);
  this.logger.log(`Usuário ${client.data.userId} entrou no mapa ${data.mapId}`);
 }

 @SubscribeMessage('world:move')
 async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { x: number; y: number; mapId: string }
 ) {
  const userId = client.data.userId;
  if (!userId) return;

  client.to(data.mapId).emit('world:player-moved', {
   userId,
   x: data.x,
   y: data.y,
  });
 }

 private broadcastPresence(snapshot:PresenceSnapshot){
  this.server?.emit('world:presence',snapshot);
 }
}
