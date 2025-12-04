export declare enum MeetingPlatform {
    GOOGLE_MEET = "GOOGLE_MEET",
    ZOOM = "ZOOM",
    TEAMS = "TEAMS",
    UNKNOWN = "UNKNOWN"
}
export declare class StartSessionDto {
    workspaceId?: string;
    platform: MeetingPlatform;
    meetingUrl?: string;
    meetingTitle?: string;
    accessToken?: string;
    leadId?: string;
}
