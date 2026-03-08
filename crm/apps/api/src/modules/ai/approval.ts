export function requiresApprovalForAiSend(aiSuggestionId?: string, approvedByUserId?: string) {
  if (!aiSuggestionId) return false;
  return !approvedByUserId;
}
