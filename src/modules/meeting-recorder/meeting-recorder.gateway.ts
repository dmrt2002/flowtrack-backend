import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MeetingRecorderService } from './meeting-recorder.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SpeakerEventDto } from './dto/speaker-event.dto';
import { EndSessionDto } from './dto/end-session.dto';

interface ClientSession {
  meetingId: string | null;
  workspaceId: string | null;
  connectedAt: Date;
}

@WebSocketGateway({
  namespace: '/ws/meeting-recorder',
  cors: {
    origin: '*', // Configure appropriately in production
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100MB buffer for audio chunks
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class MeetingRecorderGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MeetingRecorderGateway.name);
  private readonly clientSessions = new Map<string, ClientSession>();

  constructor(private meetingRecorderService: MeetingRecorderService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Initialize client session
    this.clientSessions.set(client.id, {
      meetingId: null,
      workspaceId: null,
      connectedAt: new Date(),
    });

    // Listen for binary audio chunks directly
    client.onAny((event, ...args) => {
      if (event === 'AUDIO_CHUNK') {
        this.handleAudioChunkDirect(client, args[0]);
      }
    });

    // Send connection confirmation
    client.emit('connected', {
      clientId: client.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const session = this.clientSessions.get(client.id);

    // End recording session if active
    if (session?.meetingId) {
      try {
        await this.meetingRecorderService.endSession(session.meetingId);
        this.logger.log(
          `Auto-ended session ${session.meetingId} on disconnect`,
        );
      } catch (error) {
        this.logger.error(`Failed to auto-end session:`, error);
      }
    }

    this.clientSessions.delete(client.id);
  }

  /**
   * Start recording session
   */
  @SubscribeMessage('START_SESSION')
  async handleStartSession(
    @MessageBody() payload: StartSessionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      this.logger.log(
        `Start session request from ${client.id}: ${payload.workspaceId}`,
      );

      const meetingId =
        await this.meetingRecorderService.startSession(payload);

      // Update client session
      const session = this.clientSessions.get(client.id);
      if (session) {
        session.meetingId = meetingId;
        session.workspaceId = payload.workspaceId || null;
      }

      // Send response
      client.emit('SESSION_STARTED', {
        meetingId,
        timestamp: Date.now(),
      });

      this.logger.log(`Session started: ${meetingId}`);
    } catch (error) {
      this.logger.error('Failed to start session:', error);

      client.emit('SESSION_ERROR', {
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle audio chunk directly (for better binary support)
   */
  private async handleAudioChunkDirect(client: Socket, data: any): Promise<void> {
    const session = this.clientSessions.get(client.id);

    if (!session?.meetingId) {
      this.logger.warn(`Audio chunk received without active session: ${client.id}`);
      return;
    }

    try {
      // Log what we received
      this.logger.debug(`Received data type: ${typeof data}, isBuffer: ${Buffer.isBuffer(data)}, constructor: ${data?.constructor?.name}`);

      // Convert to Buffer
      let buffer: Buffer;

      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else if (data instanceof Uint8Array || data instanceof Int8Array) {
        buffer = Buffer.from(data);
      } else if (typeof data === 'object' && data.type === 'Buffer' && Array.isArray(data.data)) {
        // Socket.IO serializes Buffer as {type: 'Buffer', data: [...]}
        buffer = Buffer.from(data.data);
      } else {
        this.logger.error(`Unsupported audio chunk format: ${typeof data}, keys: ${Object.keys(data || {}).slice(0, 5)}`);
        return;
      }

      await this.meetingRecorderService.writeAudioChunk(
        session.meetingId,
        buffer,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write audio chunk for ${session.meetingId}:`,
        error,
      );
    }
  }

  /**
   * Receive audio chunk (binary data) - Deprecated, using onAny now
   */
  @SubscribeMessage('AUDIO_CHUNK')
  async handleAudioChunk(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const session = this.clientSessions.get(client.id);

    if (!session?.meetingId) {
      this.logger.warn(`Audio chunk received without active session: ${client.id}`);
      return;
    }

    try {
      // Convert data to Buffer if it's not already
      let buffer: Buffer;

      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else if (ArrayBuffer.isView(data)) {
        buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      } else if (typeof data === 'object') {
        // Socket.IO sends ArrayBuffer as a plain object with numbered keys
        // Check if it has numeric keys (0, 1, 2, ...) which indicates binary data
        const keys = Object.keys(data);
        if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
          // Convert object with numeric keys to array
          const bytes = new Uint8Array(keys.length);
          keys.forEach(k => bytes[Number(k)] = data[k]);
          buffer = Buffer.from(bytes);
          this.logger.log(`Converted object to buffer: ${buffer.length} bytes`);
        } else if (data.data) {
          // Socket.IO might wrap it in an object
          buffer = Buffer.from(data.data);
        } else {
          this.logger.error('Received audio chunk as object but cannot parse:', Object.keys(data).slice(0, 10));
          return;
        }
      } else if (Array.isArray(data)) {
        // Array of bytes
        buffer = Buffer.from(data);
      } else {
        this.logger.error('Received audio chunk in unsupported format:', typeof data);
        return;
      }

      await this.meetingRecorderService.writeAudioChunk(
        session.meetingId,
        buffer,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write audio chunk for ${session.meetingId}:`,
        error,
      );

      client.emit('CHUNK_ERROR', {
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Receive speaker event (JSON)
   */
  @SubscribeMessage('SPEAKER_EVENT')
  async handleSpeakerEvent(
    @MessageBody() event: SpeakerEventDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const session = this.clientSessions.get(client.id);

    if (!session?.meetingId) {
      this.logger.warn(`Speaker event received without active session: ${client.id}`);
      return;
    }

    try {
      await this.meetingRecorderService.writeSpeakerEvent(
        session.meetingId,
        event,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write speaker event for ${session.meetingId}:`,
        error,
      );
    }
  }

  /**
   * End recording session
   */
  @SubscribeMessage('END_SESSION')
  async handleEndSession(
    @MessageBody() payload: EndSessionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      this.logger.log(`End session request: ${payload.meetingId}`);

      await this.meetingRecorderService.endSession(payload.meetingId);

      // Clear client session
      const session = this.clientSessions.get(client.id);
      if (session) {
        session.meetingId = null;
      }

      // Send response
      client.emit('SESSION_ENDED', {
        meetingId: payload.meetingId,
        timestamp: Date.now(),
      });

      this.logger.log(`Session ended: ${payload.meetingId}`);
    } catch (error) {
      this.logger.error('Failed to end session:', error);

      client.emit('SESSION_ERROR', {
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get session status
   */
  @SubscribeMessage('GET_STATUS')
  async handleGetStatus(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const session = this.clientSessions.get(client.id);

    client.emit('STATUS', {
      hasActiveSession: !!session?.meetingId,
      meetingId: session?.meetingId || null,
      workspaceId: session?.workspaceId || null,
      connectedAt: session?.connectedAt || null,
      timestamp: Date.now(),
    });
  }
}
