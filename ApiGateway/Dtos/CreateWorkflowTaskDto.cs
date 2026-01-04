namespace ApiGateway.Dtos;

public record class CreateWorkflowTaskDto(
    string Title,
    string Prompt
);