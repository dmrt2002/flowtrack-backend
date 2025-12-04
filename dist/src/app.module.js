"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const workspace_module_1 = require("./workspace/workspace.module");
const project_module_1 = require("./project/project.module");
const task_module_1 = require("./task/task.module");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const oauth_module_1 = require("./modules/oauth/oauth.module");
const calendar_module_1 = require("./modules/calendar/calendar.module");
const booking_module_1 = require("./modules/booking/booking.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const forms_module_1 = require("./modules/forms/forms.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const leads_module_1 = require("./modules/leads/leads.module");
const workflows_module_1 = require("./modules/workflows/workflows.module");
const user_module_1 = require("./modules/user/user.module");
const billing_module_1 = require("./modules/billing/billing.module");
const email_relay_module_1 = require("./modules/email-relay/email-relay.module");
const meeting_recorder_module_1 = require("./modules/meeting-recorder/meeting-recorder.module");
const enrichment_module_1 = require("./modules/enrichment/enrichment.module");
const schedule_1 = require("@nestjs/schedule");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                        password: config.get('REDIS_PASSWORD'),
                    },
                }),
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            workspace_module_1.WorkspaceModule,
            project_module_1.ProjectModule,
            task_module_1.TaskModule,
            onboarding_module_1.OnboardingModule,
            oauth_module_1.OAuthModule,
            calendar_module_1.CalendarModule,
            booking_module_1.BookingModule,
            dashboard_module_1.DashboardModule,
            forms_module_1.FormsModule,
            analytics_module_1.AnalyticsModule,
            leads_module_1.LeadsModule,
            workflows_module_1.WorkflowsModule,
            user_module_1.UserModule,
            billing_module_1.BillingModule,
            email_relay_module_1.EmailRelayModule,
            meeting_recorder_module_1.MeetingRecorderModule,
            enrichment_module_1.EnrichmentModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map