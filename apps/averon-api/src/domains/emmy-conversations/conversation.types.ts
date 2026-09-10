import type { EmmyConversation, EmmyConversationMessage } from "@averon/shared-types";

export interface ConversationRepository {
  create(userId: string, workspaceId: string | null): Promise<EmmyConversation>;
  list(userId: string): Promise<EmmyConversation[]>;
  get(id: string): Promise<EmmyConversation | null>;
  updateTitle(id: string, title: string): Promise<void>;
  listMessages(id: string): Promise<EmmyConversationMessage[]>;
  appendMessage(id: string, message: Omit<EmmyConversationMessage, "id" | "conversationId" | "createdAt">): Promise<EmmyConversationMessage>;
  upsertActionMessage(id: string, actionId: string, message: Omit<EmmyConversationMessage, "id" | "conversationId" | "createdAt">): Promise<EmmyConversationMessage>;
  delete(id: string): Promise<void>;
}
