namespace ApiGateway.Dtos;
using WorkflowService.Protos;

public record class WorkflowTaskDto(
    string Id,
    string UserId,
    string InputData,
    WorkflowTaskStatus Status,
    string Result = ""
);