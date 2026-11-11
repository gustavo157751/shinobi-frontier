import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
@WebSocketGateway({namespace:'/game',cors:{origin:process.env.WEB_ORIGIN??'http://localhost:5173'}})
export class RealtimeGateway implements OnGatewayConnection,OnGatewayDisconnect {
 @WebSocketServer() server:Server;
 private logger=new Logger(RealtimeGateway.name);
 constructor(private jwt:JwtService){}
 handleConnection(client:Socket){
  try { const token=client.handshake.auth?.token; if(!token) throw new Error('missing token');
   const payload=this.jwt.verify(token); client.data.userId=payload.sub; client.emit('session:ready',{userId:payload.sub});
  } catch { client.disconnect(true); }
 }
 handleDisconnect(client:Socket){if(client.data.userId)this.logger.debug(`Disconnected ${client.data.userId}`);}
 @SubscribeMessage('world:ping')
 ping(@ConnectedSocket() client:Socket,@MessageBody() body:{sentAt?:number}){return {event:'world:pong',data:{receivedAt:Date.now(),sentAt:body?.sentAt??null}};}
}
