namespace ApiGateway.Dtos;

public record class CreateWorkflowPlanDto(
    string TaskId,
    string Plan
);