export class ChatPromptDto {
  message: string;
}

export class BasePromptDto extends ChatPromptDto {
}

export class SystemPromptDto extends BasePromptDto {
  system: string;
}