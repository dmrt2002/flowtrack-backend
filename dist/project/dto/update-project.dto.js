"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProjectDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_project_dto_1 = require("./create-project.dto");
const swagger_2 = require("@nestjs/swagger");
class UpdateProjectDto extends (0, swagger_1.PartialType)((0, swagger_2.OmitType)(create_project_dto_1.CreateProjectDto, ['workspaceId'])) {
}
exports.UpdateProjectDto = UpdateProjectDto;
//# sourceMappingURL=update-project.dto.js.map