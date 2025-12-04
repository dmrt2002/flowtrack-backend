import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MeetingRecorderService } from './meeting-recorder.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SpeakerEventDto } from './dto/speaker-event.dto';
import { EndSessionDto } from './dto/end-session.dto';
export declare class MeetingRecorderGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private meetingRecorderService;
    server: Server;
    private readonly logger;
    private readonly clientSessions;
    constructor(meetingRecorderService: MeetingRecorderService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleStartSession(payload: StartSessionDto, client: Socket): Promise<void>;
    private handleAudioChunkDirect;
    handleAudioChunk(data: any, client: Socket): Promise<void>;
    handleSpeakerEvent(event: SpeakerEventDto, client: Socket): Promise<void>;
    handleEndSession(payload: EndSessionDto, client: Socket): Promise<void>;
    handleGetStatus(client: Socket): Promise<void>;
}
