namespace ApiGateway.Dtos;
using WorkflowService.Protos;

public record class WorkflowTaskDto(
    string Id,
    string InputData,
    WorkflowTaskStatus Status,
    string Results = ""
);