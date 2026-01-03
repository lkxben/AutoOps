namespace ApiGateway.Dtos;
using WorkflowService.Protos;

public record class WorkflowTaskDto(
    string Id,
    string UserId,
    string Title,
    string Prompt,
    WorkflowTaskStatus Status,
    string Result,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);