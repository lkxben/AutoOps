namespace ApiGateway.Dtos;
using WorkflowService.Protos;

public record class RunDto(
    string Id,
    string UserId,
    string TaskId,
    string PlanId,
    RunStatus Status,
    string Result,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);