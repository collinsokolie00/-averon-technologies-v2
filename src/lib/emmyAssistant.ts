export type EmmyPromptDetail = {
  prompt: string;
  response?: string;
};

export const EMMY_OPEN_EVENT = "averon:open-emmy";

export function openEmmyAssistant(detail: EmmyPromptDetail) {
  window.dispatchEvent(new CustomEvent<EmmyPromptDetail>(EMMY_OPEN_EVENT, { detail }));
}
