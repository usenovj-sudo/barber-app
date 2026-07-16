import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../common/types';

@WebSocketGateway({
  namespace: '/kitchen',
  cors: { origin: '*', credentials: true },
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KitchenGateway.name);

  handleConnection(client: Socket) {
    try {
      const raw =
        (client.handshake.auth as Record<string, string>)?.token ||
        client.handshake.headers?.authorization ||
        '';
      const token = raw.replace(/^Bearer\s+/i, '');
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      client.data.user = payload;
      client.join(`cafe:${payload.cafeId}`);
      this.logger.log(`Client ${client.id} joined cafe:${payload.cafeId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitNewOrder(cafeId: string, order: unknown) {
    this.server.to(`cafe:${cafeId}`).emit('order:new', order);
  }

  emitOrderItemUpdated(cafeId: string, payload: unknown) {
    this.server.to(`cafe:${cafeId}`).emit('order:item:updated', payload);
  }

  emitOrderReady(cafeId: string, order: unknown) {
    this.server.to(`cafe:${cafeId}`).emit('order:ready', order);
  }

  emitOrderCancelled(cafeId: string, orderId: string) {
    this.server.to(`cafe:${cafeId}`).emit('order:cancelled', { orderId });
  }

  emitTableStatus(cafeId: string, payload: unknown) {
    this.server.to(`cafe:${cafeId}`).emit('table:status', payload);
  }

  emitLowStock(cafeId: string, alerts: unknown[]) {
    this.server.to(`cafe:${cafeId}`).emit('ingredient:low', alerts);
  }
}
